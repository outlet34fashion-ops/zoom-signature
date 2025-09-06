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
        self.printer_names = [
            # Primary name based on user's connection data
            "ZTC_GK420d",  # Most likely CUPS name
            "Zebra_Technologies_ZTC_GK420d", 
            "Zebra Technologies ZTC GK420d",  # With spaces
            # Alternative names that macOS might use
            "GK420d",
            "Zebra_ZTC_GK420d",
            "ZTC GK420d"
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
        Druckt Etikett über USB-Verbindung zum Zebra GK420d (macOS optimiert)
        """
        try:
            print(f"🖨️  CRITICAL: Starting automatic print to Zebra GK420d...")
            print(f"ZPL Code length: {len(zpl_code)} characters")
            
            # FIXED: Use exact printer name and multiple methods
            printer_name = "Zebra_Technologies_ZTC_GK420d"
            
            # Method 1: Enhanced lpr with better macOS compatibility
            try:
                print(f"🍎 Method 1: Enhanced macOS lpr to {printer_name}")
                
                # Create ZPL file with proper line endings for macOS
                temp_file = f"/tmp/zebra_auto_{int(time.time())}.zpl"
                with open(temp_file, 'w', newline='\n') as f:
                    f.write(zpl_code)
                
                # Try lpr with various options for macOS Zebra compatibility
                lpr_commands = [
                    ['lpr', '-P', printer_name, '-o', 'raw', '-o', 'media=Custom.40x25mm', temp_file],
                    ['lpr', '-P', printer_name, '-o', 'raw', temp_file],
                    ['lpr', '-P', printer_name, temp_file]
                ]
                
                for cmd in lpr_commands:
                    try:
                        print(f"  Trying: {' '.join(cmd)}")
                        result = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
                        
                        if result.returncode == 0:
                            os.remove(temp_file)
                            print(f"✅ SUCCESS: Label printed via {' '.join(cmd[:3])}")
                            return {
                                "success": True,
                                "method": "enhanced_macos_lpr",
                                "command": ' '.join(cmd),
                                "message": f"✅ Label automatically printed to {printer_name}"
                            }
                        else:
                            print(f"  Failed: {result.stderr}")
                    except Exception as cmd_error:
                        print(f"  Command error: {cmd_error}")
                        continue
                
                os.remove(temp_file)
                
            except Exception as method1_error:
                print(f"❌ Method 1 failed: {method1_error}")
            
            # Method 2: Direct pipe with enhanced error handling
            try:
                print(f"🔧 Method 2: Direct pipe to {printer_name}")
                
                # Enhanced pipe command with error catching
                pipe_commands = [
                    f'echo "{zpl_code}" | lpr -P "{printer_name}" -o raw',
                    f'printf "{zpl_code}" | lpr -P "{printer_name}" -o raw',
                    f'cat <<EOF | lpr -P "{printer_name}" -o raw\n{zpl_code}\nEOF'
                ]
                
                for pipe_cmd in pipe_commands:
                    try:
                        print(f"  Trying pipe: {pipe_cmd[:50]}...")
                        result = subprocess.run(['bash', '-c', pipe_cmd], 
                                              capture_output=True, text=True, timeout=20)
                        
                        if result.returncode == 0:
                            print(f"✅ SUCCESS: Pipe method worked")
                            return {
                                "success": True,
                                "method": "enhanced_pipe",
                                "command": pipe_cmd[:100],
                                "message": f"✅ Label piped successfully to {printer_name}"
                            }
                        else:
                            print(f"  Pipe failed: {result.stderr}")
                    except Exception as pipe_error:
                        print(f"  Pipe error: {pipe_error}")
                        continue
                        
            except Exception as method2_error:
                print(f"❌ Method 2 failed: {method2_error}")
            
            # Method 3: CUPS lpstat verification + print
            try:
                print(f"🔍 Method 3: CUPS verification + print")
                
                # First verify printer exists and is ready
                lpstat_result = subprocess.run(['lpstat', '-p', printer_name], 
                                             capture_output=True, text=True, timeout=10)
                
                print(f"Printer status: {lpstat_result.stdout}")
                
                if lpstat_result.returncode == 0 and 'idle' in lpstat_result.stdout.lower():
                    print("✅ Printer is online and idle")
                    
                    # Create file and print with verification
                    verified_file = f"/tmp/zebra_verified_{int(time.time())}.zpl"
                    with open(verified_file, 'w') as f:
                        f.write(zpl_code)
                    
                    # Print with job tracking
                    print_result = subprocess.run(
                        ['lpr', '-P', printer_name, '-o', 'raw', verified_file],
                        capture_output=True, text=True, timeout=20
                    )
                    
                    if print_result.returncode == 0:
                        os.remove(verified_file)
                        
                        # Verify job was submitted
                        time.sleep(1)
                        job_result = subprocess.run(['lpq', '-P', printer_name], 
                                                  capture_output=True, text=True, timeout=5)
                        
                        print(f"✅ SUCCESS: Print job submitted. Queue status: {job_result.stdout}")
                        return {
                            "success": True,
                            "method": "cups_verified",
                            "job_queue": job_result.stdout,
                            "message": f"✅ Verified print job sent to {printer_name}"
                        }
                    
                    os.remove(verified_file)
                    
            except Exception as method3_error:
                print(f"❌ Method 3 failed: {method3_error}")
            
            # If all methods fail, create manual instruction file
            manual_file = f"/tmp/zebra_manual_{int(time.time())}.zpl"
            with open(manual_file, 'w') as f:
                f.write(zpl_code)
            
            print(f"❌ All automatic methods failed - created manual file: {manual_file}")
            
            return {
                "success": False,
                "method": "manual_fallback",
                "manual_file": manual_file,
                "message": f"❌ Automatic printing failed. Manual file: {manual_file}",
                "manual_commands": [
                    f"cat {manual_file} | lpr -P {printer_name} -o raw",
                    f"lpr -P {printer_name} -o raw {manual_file}"
                ],
                "troubleshooting": [
                    "1. Check printer is powered ON and ready",
                    "2. Verify 'Use generic printer features' is enabled",
                    "3. Check printer queue: lpq -P Zebra_Technologies_ZTC_GK420d",
                    "4. Try manual command above"
                ],
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