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
        # FIXED: Correct printer names for Zebra GK420d as shown in system
        self.printer_names = [
            "Zebra_Technologies_ZTC_GK420d",  # Exact name from user's system
            "ZTC_GK420d", 
            "GK420d",
            "Zebra Technologies ZTC GK420d"  # With spaces
        ]
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
            print(f"🖨️  Attempting macOS USB printing to Zebra GK420d...")
            print(f"ZPL Code length: {len(zpl_code)} characters")
            
            # CRITICAL FIX: macOS-specific printing using exact printer name from system
            printer_name = "Zebra_Technologies_ZTC_GK420d"  # Exact name from user's macOS
            
            # Method 1: macOS lpr with raw printing (best for Zebra ZPL)
            try:
                print(f"🍎 Trying macOS lpr with printer: {printer_name}")
                
                # Create temporary ZPL file
                temp_file = f"/tmp/zebra_macos_{int(time.time())}.zpl"
                with open(temp_file, 'w') as f:
                    f.write(zpl_code)
                
                # Use lpr with raw option for macOS
                result = subprocess.run([
                    'lpr', 
                    '-P', printer_name,
                    '-o', 'raw',
                    '-o', 'media=Custom.40x25mm',  # Specify label size
                    temp_file
                ], capture_output=True, text=True, timeout=15)
                
                if result.returncode == 0:
                    os.remove(temp_file)
                    return {
                        "success": True,
                        "method": "macos_lpr_raw",
                        "printer_name": printer_name,
                        "message": f"✅ Label printed successfully via macOS lpr to {printer_name}"
                    }
                else:
                    print(f"❌ lpr failed: {result.stderr}")
                    
            except Exception as lpr_error:
                print(f"❌ macOS lpr failed: {lpr_error}")
            
            # Method 2: Try with lpstat to check printer and then print
            try:
                print(f"🔍 Checking printer status first...")
                
                # Check if printer exists and is ready
                status_result = subprocess.run([
                    'lpstat', '-p', printer_name
                ], capture_output=True, text=True, timeout=10)
                
                print(f"Printer status: {status_result.stdout}")
                
                if status_result.returncode == 0:
                    # Printer exists, try printing with different options
                    temp_file = f"/tmp/zebra_status_{int(time.time())}.zpl"
                    with open(temp_file, 'w') as f:
                        f.write(zpl_code)
                    
                    # Try lpr without media specification
                    result = subprocess.run([
                        'lpr', '-P', printer_name, '-o', 'raw', temp_file
                    ], capture_output=True, text=True, timeout=15)
                    
                    if result.returncode == 0:
                        os.remove(temp_file)
                        return {
                            "success": True,
                            "method": "macos_lpr_simple",
                            "printer_name": printer_name,
                            "message": f"✅ Label printed via simple lpr to {printer_name}"
                        }
                    
                    os.remove(temp_file)
                    
            except Exception as status_error:
                print(f"❌ Status check failed: {status_error}")
            
            # Method 3: Direct pipe to printer using echo
            try:
                print(f"🔧 Trying direct pipe method...")
                
                result = subprocess.run([
                    'sh', '-c', 
                    f'echo "{zpl_code}" | lpr -P {printer_name} -o raw'
                ], capture_output=True, text=True, timeout=15)
                
                if result.returncode == 0:
                    return {
                        "success": True,
                        "method": "macos_pipe",
                        "printer_name": printer_name,
                        "message": f"✅ Label printed via pipe to {printer_name}"
                    }
                    
            except Exception as pipe_error:
                print(f"❌ Pipe method failed: {pipe_error}")
            
            # Method 4: Alternative printer names (in case of slight variations)
            alternative_names = [
                "Zebra Technologies ZTC GK420d",
                "ZTC GK420d", 
                "GK420d",
                "Zebra_ZTC_GK420d"
            ]
            
            for alt_name in alternative_names:
                try:
                    print(f"🔄 Trying alternative name: {alt_name}")
                    
                    temp_file = f"/tmp/zebra_alt_{int(time.time())}.zpl"
                    with open(temp_file, 'w') as f:
                        f.write(zpl_code)
                    
                    result = subprocess.run([
                        'lpr', '-P', alt_name, '-o', 'raw', temp_file
                    ], capture_output=True, text=True, timeout=10)
                    
                    if result.returncode == 0:
                        os.remove(temp_file)
                        return {
                            "success": True,
                            "method": "macos_alternative_name",
                            "printer_name": alt_name,
                            "message": f"✅ Label printed via alternative name {alt_name}"
                        }
                    
                    os.remove(temp_file)
                    
                except Exception as alt_error:
                    print(f"❌ Alternative {alt_name} failed: {alt_error}")
                    continue
            
            # Method 5: Save to file for manual printing (always works)
            manual_file = f"/tmp/zebra_manual_print_{int(time.time())}.zpl"
            with open(manual_file, 'w') as f:
                f.write(zpl_code)
            
            return {
                "success": False,
                "method": "manual_file_created",
                "message": f"❌ Automatic printing failed. Manual file created: {manual_file}",
                "manual_file": manual_file,
                "instructions": [
                    "1. Activate 'Use generic printer features' in printer settings",
                    "2. Try: cat /tmp/zebra_manual_print_*.zpl | lpr -P Zebra_Technologies_ZTC_GK420d -o raw",
                    "3. Or copy ZPL code and send directly to printer",
                    "4. Check printer is online and has labels loaded"
                ],
                "zpl_code": zpl_code,
                "printer_name_used": printer_name
            }
        
        except Exception as e:
            return {
                "success": False,
                "message": f"❌ Critical macOS printing error: {str(e)}",
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