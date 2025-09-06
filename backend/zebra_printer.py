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
        Druckt Etikett über USB-Verbindung zum Zebra GK420d 
        ENHANCED: Container-Host Bridge Support for macOS
        """
        try:
            print(f"🖨️  CRITICAL: Starting enhanced container print to Zebra GK420d...")
            print(f"ZPL Code length: {len(zpl_code)} characters")
            
            # METHOD 1: Container CUPS Detection (if host-mounted)
            try:
                print(f"🔍 Method 1: Container CUPS printer detection...")
                
                # Check for available printers
                result = subprocess.run(['lpstat', '-p'], capture_output=True, text=True, timeout=10)
                print(f"CUPS printer list: {result.stdout}")
                
                if result.returncode == 0 and result.stdout.strip():
                    # Found printers in container - try to print
                    for printer_name in self.printer_names:
                        try:
                            print(f"  🖨️  Trying container printer: {printer_name}")
                            print_result = subprocess.run(
                                ['lpr', '-P', printer_name, '-o', 'raw'],
                                input=zpl_code.encode(),
                                timeout=15
                            )
                            
                            if print_result.returncode == 0:
                                print(f"✅ SUCCESS: Container print successful with {printer_name}")
                                return {
                                    "success": True,
                                    "method": "container_cups",
                                    "printer": printer_name,
                                    "message": f"✅ Label printed via container CUPS to {printer_name}"
                                }
                        except Exception as e:
                            print(f"  ❌ Container printer {printer_name} failed: {e}")
                            continue
                else:
                    print("No printers found in container CUPS")
                    
            except Exception as method1_error:
                print(f"❌ Method 1 failed: {method1_error}")
            
            # METHOD 2: Host System Detection + Manual File Creation
            try:
                print(f"🖥️  Method 2: Host system integration...")
                
                # Create multiple ZPL files for different approaches
                timestamp = int(time.time())
                
                files_created = []
                
                # File 1: Standard ZPL file
                zpl_file = f"/tmp/zebra_host_{timestamp}.zpl"
                with open(zpl_file, 'w', newline='\r\n') as f:  # Windows-style line endings for better compatibility
                    f.write(zpl_code)
                files_created.append(zpl_file)
                
                # File 2: Raw binary file
                raw_file = f"/tmp/zebra_raw_{timestamp}.prn"
                with open(raw_file, 'wb') as f:
                    f.write(zpl_code.encode('utf-8'))
                files_created.append(raw_file)
                
                # File 3: macOS-optimized file
                macos_file = f"/tmp/zebra_macos_{timestamp}.txt"
                with open(macos_file, 'w', encoding='utf-8') as f:
                    f.write(zpl_code)
                files_created.append(macos_file)
                
                print(f"✅ Created {len(files_created)} files for host printing")
                
                # Try to detect if we can reach host USB through different methods
                host_commands = [
                    # macOS-style commands that might work if host is accessible
                    f'echo "{zpl_code}" | lpr -P ZTC_GK420d -o raw',
                    f'echo "{zpl_code}" | lpr -P "Zebra Technologies ZTC GK420d" -o raw',
                    f'cat {zpl_file} | lpr -P ZTC_GK420d -o raw',
                    f'lpr -P ZTC_GK420d -o raw {zpl_file}',
                ]
                
                # Try direct host commands (might work in some container configurations)
                for cmd in host_commands[:2]:  # Limit attempts
                    try:
                        print(f"  🖥️  Trying host command: {cmd[:50]}...")
                        result = subprocess.run(['bash', '-c', cmd], 
                                              capture_output=True, text=True, timeout=10)
                        
                        if result.returncode == 0:
                            print(f"✅ SUCCESS: Host command worked!")
                            return {
                                "success": True,
                                "method": "host_bridge",
                                "command": cmd,
                                "message": f"✅ Label sent to host printer successfully"
                            }
                        else:
                            print(f"  Host command failed: {result.stderr}")
                    except Exception as e:
                        print(f"  Host command error: {e}")
                        continue
                
                # If direct commands fail, provide comprehensive manual instructions
                return {
                    "success": False,
                    "method": "manual_host_files",
                    "files_created": files_created,
                    "message": "⚠️  Container cannot access host USB. Files created for manual printing.",
                    "host_instructions": {
                        "macos_commands": [
                            f"# macOS Terminal Commands (run on your Mac):",
                            f"lpr -P 'ZTC GK420d' -o raw {zpl_file}",
                            f"lpr -P 'Zebra Technologies ZTC GK420d' -o raw {zpl_file}",
                            f"cat {zpl_file} > /dev/usb/lp0  # Direct USB (if available)",
                        ],
                        "alternative_methods": [
                            "1. Use Zebra Setup Utilities on your Mac",
                            "2. Copy ZPL content to Zebra Design software", 
                            "3. Use macOS System Preferences > Printers to print raw file",
                            "4. Configure Docker/K8s USB passthrough (advanced)"
                        ],
                        "files_info": {
                            "zpl_file": f"Standard ZPL format: {zpl_file}",
                            "raw_file": f"Raw binary format: {raw_file}",
                            "macos_file": f"macOS-optimized: {macos_file}"
                        }
                    },
                    "zpl_code": zpl_code
                }
                
            except Exception as method2_error:
                print(f"❌ Method 2 failed: {method2_error}")
            
            # METHOD 3: Network Printing Attempt (if Zebra has network capability)
            try:
                print(f"🌐 Method 3: Network printing attempt...")
                
                # Some Zebra printers support network printing on port 9100
                # This is a fallback attempt
                potential_ips = ['192.168.1.100', '192.168.0.100', '10.0.0.100']  # Common printer IPs
                
                for ip in potential_ips[:1]:  # Limit network attempts
                    try:
                        import socket
                        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                        sock.settimeout(2)
                        result = sock.connect_ex((ip, 9100))
                        sock.close()
                        
                        if result == 0:
                            print(f"Found potential network printer at {ip}:9100")
                            # Try to send ZPL
                            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                                s.settimeout(5)
                                s.connect((ip, 9100))
                                s.sendall(zpl_code.encode())
                                
                            return {
                                "success": True,
                                "method": "network_print",
                                "ip": ip,
                                "message": f"✅ Label sent to network printer at {ip}:9100"
                            }
                    except Exception as e:
                        print(f"  Network attempt {ip} failed: {e}")
                        continue
                        
            except Exception as method3_error:
                print(f"❌ Method 3 failed: {method3_error}")
            
            # If all methods fail, return comprehensive failure info
            fallback_file = f"/tmp/zebra_fallback_{int(time.time())}.zpl"
            with open(fallback_file, 'w') as f:
                f.write(zpl_code)
            
            return {
                "success": False,
                "method": "all_methods_failed",
                "fallback_file": fallback_file,
                "message": "❌ All printing methods failed. Container cannot access host USB printer.",
                "container_info": {
                    "cups_status": "Running but no host printers accessible",
                    "usb_access": "Container cannot access host USB devices",
                    "solution": "Requires Docker/K8s USB device mounting or host-side printing service"
                },
                "manual_solutions": [
                    f"1. SSH to container and copy {fallback_file} to host",
                    f"2. Run: lpr -P 'ZTC GK420d' -o raw {fallback_file}",
                    "3. Configure container USB passthrough",
                    "4. Set up host-side printing service"
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