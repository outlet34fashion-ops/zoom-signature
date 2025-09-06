#!/usr/bin/env python3
"""
HOST-SIDE ZEBRA PRINTING SERVICE
Läuft auf dem Host-System (Ihr Mac) und empfängt Druckaufträge vom Container

INSTALLATION (auf Ihrem Mac):
1. Kopieren Sie diese Datei auf Ihren Mac
2. Installieren Sie: pip3 install flask requests
3. Führen Sie aus: python3 host_print_service.py
4. Service läuft auf http://localhost:9876

AUTOMATISCHES DRUCKEN: Container sendet HTTP-Requests an diesen Service
"""

from flask import Flask, request, jsonify
import subprocess
import tempfile
import os
import logging
import time
from datetime import datetime

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

class HostZebraPrinter:
    def __init__(self):
        # Ihre bekannten Druckernamen auf macOS
        self.printer_names = [
            "ZTC GK420d",
            "Zebra Technologies ZTC GK420d", 
            "ZTC_GK420d",
            "Zebra_Technologies_ZTC_GK420d"
        ]
        
    def find_active_printer(self):
        """Findet den aktiven Zebra-Drucker auf dem Host-System"""
        try:
            # macOS lpstat command
            result = subprocess.run(['lpstat', '-p'], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                for printer_name in self.printer_names:
                    if printer_name in result.stdout:
                        logging.info(f"✅ Found active printer: {printer_name}")
                        return printer_name
                        
            logging.warning("No Zebra printer found in lpstat output")
            logging.info(f"Available printers: {result.stdout}")
            return None
            
        except Exception as e:
            logging.error(f"Error finding printer: {e}")
            return None
    
    def print_zpl_direct(self, zpl_code, printer_name):
        """Druckt ZPL-Code direkt über macOS lpr"""
        try:
            # Erstelle temporäre ZPL-Datei
            with tempfile.NamedTemporaryFile(mode='w', suffix='.zpl', delete=False) as temp_file:
                temp_file.write(zpl_code)
                temp_file_path = temp_file.name
            
            # Verschiedene macOS lpr-Kommandos versuchen
            commands = [
                ['lpr', '-P', printer_name, '-o', 'raw', temp_file_path],
                ['lpr', '-P', printer_name, temp_file_path],
                # Direct pipe method
                ['bash', '-c', f'cat "{temp_file_path}" | lpr -P "{printer_name}" -o raw']
            ]
            
            for cmd in commands:
                try:
                    logging.info(f"🖨️  Trying: {' '.join(cmd[:4])}...")
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                    
                    if result.returncode == 0:
                        os.unlink(temp_file_path)  # Cleanup
                        logging.info(f"✅ SUCCESS: Label printed via {' '.join(cmd[:3])}")
                        return {
                            "success": True,
                            "method": f"host_lpr_{cmd[1] if len(cmd) > 1 else 'pipe'}",
                            "printer": printer_name,
                            "message": f"✅ Label successfully printed to {printer_name}"
                        }
                    else:
                        logging.warning(f"Command failed: {result.stderr}")
                        
                except subprocess.TimeoutExpired:
                    logging.error(f"Command timed out: {' '.join(cmd[:3])}")
                except Exception as cmd_error:
                    logging.error(f"Command error: {cmd_error}")
                    continue
            
            # Cleanup if all methods failed
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
            return {
                "success": False,
                "message": f"❌ All print methods failed for printer {printer_name}",
                "printer": printer_name
            }
            
        except Exception as e:
            logging.error(f"Direct print error: {e}")
            return {
                "success": False,
                "message": f"❌ Direct print error: {str(e)}"
            }

# Global printer instance
zebra_printer = HostZebraPrinter()

@app.route('/health', methods=['GET'])
def health_check():
    """Service Health Check"""
    return jsonify({
        "status": "running",
        "service": "Host Zebra Printing Service",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0"
    })

@app.route('/printer/status', methods=['GET'])
def printer_status():
    """Überprüft Drucker-Status auf dem Host"""
    try:
        active_printer = zebra_printer.find_active_printer()
        
        if active_printer:
            return jsonify({
                "success": True,
                "printer_found": True,
                "printer_name": active_printer,
                "status": "ready",
                "message": f"✅ Zebra printer {active_printer} is ready"
            })
        else:
            return jsonify({
                "success": False,
                "printer_found": False,
                "message": "❌ No Zebra printer found on host system",
                "available_printers": subprocess.run(['lpstat', '-p'], capture_output=True, text=True).stdout
            })
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "message": f"❌ Status check failed: {str(e)}"
        }), 500

@app.route('/print', methods=['POST'])
def print_label():
    """
    MAIN ENDPOINT: Empfängt Druckaufträge vom Container
    
    Expected JSON:
    {
        "zpl_code": "^XA...^XZ",
        "customer_number": "10299",
        "price": "19.99", 
        "order_id": "abc123"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'zpl_code' not in data:
            return jsonify({
                "success": False,
                "message": "❌ Missing zpl_code in request"
            }), 400
        
        zpl_code = data['zpl_code']
        customer_number = data.get('customer_number', 'Unknown')
        price = data.get('price', '0.00')
        order_id = data.get('order_id', 'Unknown')
        
        logging.info(f"🖨️  AUTOMATIC PRINT REQUEST: Customer {customer_number}, Price {price}, Order {order_id}")
        
        # Find active printer
        active_printer = zebra_printer.find_active_printer()
        
        if not active_printer:
            return jsonify({
                "success": False,
                "message": "❌ No Zebra printer found on host system",
                "customer_number": customer_number,
                "price": price,
                "order_id": order_id
            }), 404
        
        # Print the label
        print_result = zebra_printer.print_zpl_direct(zpl_code, active_printer)
        
        # Add request info to result
        print_result.update({
            "customer_number": customer_number,
            "price": price,
            "order_id": order_id,
            "timestamp": datetime.now().isoformat()
        })
        
        if print_result["success"]:
            logging.info(f"✅ AUTOMATIC PRINTING SUCCESS: Order {order_id} printed for customer {customer_number}")
            return jsonify(print_result)
        else:
            logging.error(f"❌ AUTOMATIC PRINTING FAILED: Order {order_id} for customer {customer_number}")
            return jsonify(print_result), 500
            
    except Exception as e:
        logging.error(f"Print endpoint error: {e}")
        return jsonify({
            "success": False,
            "message": f"❌ Print service error: {str(e)}"
        }), 500

@app.route('/test-print', methods=['POST'])
def test_print():
    """Test-Druck für Service-Überprüfung"""
    try:
        # Generate test ZPL
        test_zpl = """^XA
^MMT
^PW320
^LL200
^LS0

^FT30,30^A0N,20,20^FD06.09.25 15:30:00^FS

^FT160,120^A0N,60,60^FB160,1,0,C^FDTEST^FS

^FT30,180^A0N,30,30^FDHOST^FS
^FT250,180^A0N,30,30^FD1999^FS

^XZ"""
        
        active_printer = zebra_printer.find_active_printer()
        
        if not active_printer:
            return jsonify({
                "success": False,
                "message": "❌ No Zebra printer found for test"
            }), 404
        
        result = zebra_printer.print_zpl_direct(test_zpl, active_printer)
        result.update({
            "test_type": "host_service_test",
            "timestamp": datetime.now().isoformat()
        })
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"❌ Test print failed: {str(e)}"
        }), 500

if __name__ == '__main__':
    print("🖨️  HOST-SIDE ZEBRA PRINTING SERVICE")
    print("=" * 50)
    print("Starting Host-Side Zebra Printing Service...")
    print("This service enables automatic printing from the container")
    print("Service URL: http://localhost:9876")
    print("=" * 50)
    
    # Check for printer on startup
    active_printer = zebra_printer.find_active_printer()
    if active_printer:
        print(f"✅ Zebra printer detected: {active_printer}")
    else:
        print("⚠️  Warning: No Zebra printer detected")
        print("Make sure your Zebra GK420d is connected and configured")
    
    print("=" * 50)
    print("Starting Flask service on port 9876...")
    
    # Start the service
    app.run(
        host='0.0.0.0',
        port=9876,
        debug=False,
        threaded=True
    )