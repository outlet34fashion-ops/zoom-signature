"""
Zebra GK420d Printer Service
Automatische Etiketten-Generierung und -Druck für 40x25mm Labels
"""

import os
import socket
import subprocess
import time
from datetime import datetime
from typing import Dict, Optional
import logging
# CRITICAL: Add PDF generation for label preview
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import mm
from io import BytesIO

logger = logging.getLogger(__name__)

class ZebraPrinterService:
    def __init__(self):
        # FIXED: Use actual macOS CUPS printer names from user's system
        # Based on user's connection: usb://Zebra%20Technologies/ZTC%20GK420d?serial=28J212801033
        self.printer_names = [
            # Primary name based exactly on user's connection data
            "ZTC_GK420d",  # Most likely CUPS name without spaces
            "Zebra_Technologies_ZTC_GK420d",  # With manufacturer prefix
            "Zebra Technologies ZTC GK420d",  # With spaces as shown in connection
            "ZTC GK420d",  # Simple name with space
            # Alternative names that macOS might use
            "GK420d",
            "Zebra_ZTC_GK420d"
        ]
        # USB connection details from user's system
        self.usb_connection = "usb://Zebra%20Technologies/ZTC%20GK420d?serial=28J212801033"
        self.label_width = 320  # 40mm = 320 dots (8 dots/mm) 
        self.label_height = 200  # 25mm = 200 dots (8 dots/mm)
    
    def generate_zpl_label(self, customer_number: str, price: str, timestamp: datetime) -> str:
        """
        Generiert ZPL-Code für 40x25mm Etikett basierend auf User-Layout
        
        Layout (wie im Bild):
        - Oben: Zeitstempel (klein)
        - Mitte: Kundennummer (groß und fett)  
        - Unten links: Erste Ziffern
        - Unten rechts: Preis
        """
        
        # Formatiere Zeitstempel wie im Bild: "28.07.25 20:56:00"
        formatted_time = timestamp.strftime("%d.%m.%y %H:%M:%S")
        
        # Extrahiere Preis ohne Komma/Euro-Zeichen für Display
        price_display = price.replace("€", "").replace(",", "").replace(".", "")
        
        # Teile Kundennummer für Layout auf (wie im Bild)
        customer_main = customer_number[-3:] if len(customer_number) >= 3 else customer_number
        customer_prefix = customer_number[:-3] if len(customer_number) > 3 else ""
        
        zpl_code = f"""
^XA
^MMT
^PW320
^LL200
^LS0

^FT30,30^A0N,20,20^FD{formatted_time}^FS

^FT160,120^A0N,60,60^FB160,1,0,C^FD{customer_main}^FS

^FT30,180^A0N,30,30^FD{customer_prefix}^FS
^FT250,180^A0N,30,30^FD{price_display}^FS

^XZ
"""
        return zpl_code.strip()
    
    def generate_label_pdf(self, customer_number: str, price: str, timestamp: datetime) -> BytesIO:
        """
        Generiert PDF-Vorschau des Etiketts (40x25mm)
        """
        try:
            # Create PDF in memory
            buffer = BytesIO()
            
            # 40x25mm label size in points (1mm = 2.834 points)
            label_width = 40 * 2.834  # ~113 points
            label_height = 25 * 2.834  # ~71 points
            
            p = canvas.Canvas(buffer, pagesize=(label_width, label_height))
            
            # Set white background
            p.setFillColorRGB(1, 1, 1)
            p.rect(0, 0, label_width, label_height, fill=1)
            
            # Set black text color
            p.setFillColorRGB(0, 0, 0)
            
            # Zeitstempel oben (klein)
            formatted_time = timestamp.strftime("%d.%m.%y %H:%M:%S")
            p.setFont("Helvetica", 6)
            p.drawString(5, label_height - 10, formatted_time)
            
            # Kundennummer mitte (groß und fett)
            customer_main = customer_number[-3:] if len(customer_number) >= 3 else customer_number
            p.setFont("Helvetica-Bold", 20)
            text_width = p.stringWidth(customer_main, "Helvetica-Bold", 20)
            p.drawString((label_width - text_width) / 2, label_height / 2 - 5, customer_main)
            
            # Unten links: Prefix
            customer_prefix = customer_number[:-3] if len(customer_number) > 3 else ""
            if customer_prefix:
                p.setFont("Helvetica", 8)
                p.drawString(5, 5, customer_prefix)
            
            # Unten rechts: Preis
            price_display = price.replace("€", "").replace(",", "").replace(".", "")
            p.setFont("Helvetica", 8)
            price_width = p.stringWidth(price_display, "Helvetica", 8)
            p.drawString(label_width - price_width - 5, 5, price_display)
            
            # Add border for better visibility
            p.setStrokeColorRGB(0, 0, 0)
            p.setLineWidth(0.5)
            p.rect(1, 1, label_width - 2, label_height - 2, fill=0)
            
            p.save()
            buffer.seek(0)
            return buffer
            
        except Exception as e:
            logging.error(f"PDF generation failed: {e}")
            raise
    
    def print_label_usb(self, zpl_code: str) -> Dict[str, any]:
        """
        AUTOMATISCHES DRUCKEN: Container → Host-Service → USB-Drucker
        """
        try:
            print(f"🖨️  AUTOMATIC PRINTING: Starting label print...")
            print(f"ZPL Code length: {len(zpl_code)} characters")
            
            # METHOD 1: Host-Side Printing Service (BESTE LÖSUNG)
            try:
                print(f"🖥️  Method 1: Host-Side Printing Service...")
                
                import requests
                
                # Verschiedene Host-URLs versuchen
                host_urls = [
                    "http://host.docker.internal:9876",  # Docker Desktop
                    "http://localhost:9876",             # Direct access
                    "http://127.0.0.1:9876",            # Localhost
                    "http://10.0.0.1:9876",             # Gateway
                    "http://192.168.65.1:9876"          # Docker Desktop Gateway
                ]
                
                # Erstelle Druckauftrag-Daten
                print_data = {
                    "zpl_code": zpl_code,
                    "customer_number": getattr(self, '_last_customer_number', 'Unknown'),
                    "price": getattr(self, '_last_price', '0.00'),
                    "order_id": getattr(self, '_last_order_id', f"auto_{int(time.time())}")
                }
                
                for host_url in host_urls:
                    try:
                        print(f"  🔗 Trying host service: {host_url}")
                        
                        # Erstmal Gesundheitsprüfung
                        health_response = requests.get(f"{host_url}/health", timeout=3)
                        
                        if health_response.status_code == 200:
                            print(f"  ✅ Host service is running at {host_url}")
                            
                            # Druckauftrag senden
                            print_response = requests.post(
                                f"{host_url}/print",
                                json=print_data,
                                timeout=30,
                                headers={'Content-Type': 'application/json'}
                            )
                            
                            if print_response.status_code == 200:
                                result = print_response.json()
                                if result.get('success'):
                                    print(f"✅ SUCCESS: Automatic printing via host service!")
                                    return {
                                        "success": True,
                                        "method": "host_service_automatic",
                                        "host_url": host_url,
                                        "printer": result.get('printer', 'Unknown'),
                                        "message": f"✅ AUTOMATIC PRINT SUCCESS: {result.get('message', 'Label printed')}"
                                    }
                            else:
                                print(f"  ❌ Host service print failed: {print_response.status_code}")
                                print(f"     Response: {print_response.text}")
                        else:
                            print(f"  ❌ Host service not healthy: {health_response.status_code}")
                            
                    except requests.exceptions.ConnectTimeout:
                        print(f"  ⏰ Host service timeout: {host_url}")
                    except requests.exceptions.ConnectionError:
                        print(f"  🔌 Host service not reachable: {host_url}")
                    except Exception as e:
                        print(f"  ❌ Host service error: {e}")
                        continue
                
                print("  ❌ No host service found - service not running on host system")
                
            except Exception as method1_error:
                print(f"❌ Host service method failed: {method1_error}")
            
            # METHOD 2: Container CUPS (Fallback)
            try:
                print(f"🔍 Method 2: Container CUPS fallback...")
                
                # Check for available printers in container
                result = subprocess.run(['lpstat', '-p'], capture_output=True, text=True, timeout=10)
                
                if result.returncode == 0 and result.stdout.strip():
                    print(f"Container CUPS printers: {result.stdout}")
                    
                    # Try to print to any available printer
                    for printer_name in self.printer_names:
                        try:
                            print(f"  🖨️  Trying container printer: {printer_name}")
                            print_result = subprocess.run(
                                ['lpr', '-P', printer_name, '-o', 'raw'],
                                input=zpl_code.encode(),
                                timeout=15
                            )
                            
                            if print_result.returncode == 0:
                                print(f"✅ SUCCESS: Container CUPS print successful!")
                                return {
                                    "success": True,
                                    "method": "container_cups",
                                    "printer": printer_name,
                                    "message": f"✅ Container CUPS print success to {printer_name}"
                                }
                        except Exception as e:
                            print(f"  ❌ Container printer failed: {e}")
                            continue
                else:
                    print("No printers found in container CUPS")
                    
            except Exception as method2_error:
                print(f"❌ Container CUPS method failed: {method2_error}")
            
            # METHOD 3: Create instruction file for user
            try:
                print(f"📝 Method 3: Creating instruction file...")
                
                # Create comprehensive instruction file
                timestamp = int(time.time())
                instruction_file = f"/tmp/automatic_print_instructions_{timestamp}.txt"
                
                instructions = f"""
🖨️  AUTOMATIC PRINTING SETUP REQUIRED
=====================================

PROBLEM: Container cannot reach your Zebra printer directly.

SOLUTION: Start the Host-Side Printing Service on your Mac

STEPS TO ENABLE AUTOMATIC PRINTING:
===================================

1. COPY the file 'host_print_service.py' to your Mac Desktop

2. OPEN Terminal on your Mac and run:
   cd ~/Desktop
   pip3 install flask requests
   python3 host_print_service.py

3. The service will start on http://localhost:9876

4. RESTART this container application

5. Automatic printing will now work!

CURRENT ORDER DETAILS:
=====================
Customer: {getattr(self, '_last_customer_number', 'Unknown')}
Price: {getattr(self, '_last_price', '0.00')}
Order ID: {getattr(self, '_last_order_id', 'Unknown')}
Timestamp: {datetime.now().strftime('%d.%m.%y %H:%M:%S')}

ZPL CODE TO PRINT:
==================
{zpl_code}

MANUAL PRINT (macOS Terminal):
=============================
echo '{zpl_code}' | lpr -P "ZTC GK420d" -o raw
echo '{zpl_code}' | lpr -P "Zebra Technologies ZTC GK420d" -o raw

For help, check the host_print_service.py file.
"""
                
                with open(instruction_file, 'w') as f:
                    f.write(instructions)
                
                print(f"✅ Created instruction file: {instruction_file}")
                
                return {
                    "success": False,
                    "method": "host_service_required",
                    "instruction_file": instruction_file,
                    "message": "⚠️  AUTOMATIC PRINTING REQUIRES HOST SERVICE - Check instruction file",
                    "setup_required": True,
                    "host_service_file": "/app/host_print_service.py",
                    "setup_instructions": [
                        "1. Copy host_print_service.py to your Mac",
                        "2. Install: pip3 install flask requests", 
                        "3. Run: python3 host_print_service.py",
                        "4. Restart this application",
                        "5. Automatic printing will work!"
                    ],
                    "zpl_code": zpl_code
                }
                
            except Exception as method3_error:
                print(f"❌ Instruction file creation failed: {method3_error}")
            
            # Final fallback
            return {
                "success": False,
                "method": "all_methods_failed",
                "message": "❌ AUTOMATIC PRINTING FAILED - Host service required",
                "zpl_code": zpl_code
            }
        
        except Exception as e:
            print(f"❌ CRITICAL printing error: {e}")
            return {
                "success": False,
                "message": f"❌ Critical error: {str(e)}",
                "zpl_code": zpl_code
            }
    
    def print_order_label(self, order_data: Dict) -> Dict[str, any]:
        """
        Erstellt und druckt Etikett für eine Bestellung
        """
        try:
            customer_number = str(order_data.get('customer_number', '000'))
            price = str(order_data.get('price', '0.00'))
            timestamp = datetime.now()
            
            # Generiere ZPL-Code
            zpl_code = self.generate_zpl_label(customer_number, price, timestamp)
            
            # Drucke Etikett
            print_result = self.print_label_usb(zpl_code)
            
            # Erweitere Ergebnis um Order-Info
            print_result.update({
                "order_id": order_data.get('id'),
                "customer_number": customer_number,
                "price": price,
                "timestamp": timestamp.isoformat(),
                "zpl_code": zpl_code
            })
            
            return print_result
        
        except Exception as e:
            logger.error(f"Order label printing failed: {e}")
            return {
                "success": False,
                "message": f"Order label printing failed: {str(e)}"
            }
    
    def get_printer_status(self) -> Dict[str, any]:
        """
        Überprüft Status des Zebra-Druckers
        """
        try:
            # FIXED: Check all possible printer names
            for printer_name in self.printer_names:
                try:
                    # Überprüfe mit lpstat
                    result = subprocess.run([
                        'lpstat', '-p', printer_name
                    ], capture_output=True, text=True, timeout=5)
                    
                    if result.returncode == 0:
                        status = "online" if "idle" in result.stdout.lower() else "busy"
                        return {
                            "success": True,
                            "status": status,
                            "printer_name": printer_name,
                            "message": result.stdout.strip()
                        }
                except Exception as e:
                    print(f"Status check failed for {printer_name}: {e}")
                    continue
            
            # If lpstat fails, try CUPS
            try:
                import cups
                conn = cups.Connection()
                printers = conn.getPrinters()
                
                for printer_name, printer_info in printers.items():
                    if any(keyword in printer_name.lower() for keyword in ['zebra', 'gk420', 'ztc']):
                        state = printer_info.get('printer-state', 0)
                        status = "online" if state == 3 else "offline"  # 3 = idle
                        return {
                            "success": True,
                            "status": status,
                            "printer_name": printer_name,
                            "cups_info": printer_info,
                            "message": f"Found via CUPS: {printer_name}"
                        }
            except Exception as cups_error:
                print(f"CUPS status check failed: {cups_error}")
            
            return {
                "success": False,
                "status": "not_found",
                "message": f"Zebra printer not found. Tried: {', '.join(self.printer_names)}",
                "troubleshooting": "Check USB connection and CUPS printer installation"
            }
        
        except Exception as e:
            return {
                "success": False,
                "status": "error",
                "message": f"Status check failed: {str(e)}"
            }

# Global instance
zebra_printer = ZebraPrinterService()