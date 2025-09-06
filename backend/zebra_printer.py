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
        return zpl_code.strip()
    
    def print_label_usb(self, zpl_code: str) -> Dict[str, any]:
        """
        Druckt Etikett über USB-Verbindung zum Zebra GK420d
        """
        try:
            # FIXED: Try all possible printer names from system
            for printer_name in self.printer_names:
                try:
                    # Methode 1: Direkt über lp (Linux Printing System)
                    temp_file = f"/tmp/zebra_label_{int(time.time())}.zpl"
                    with open(temp_file, 'w') as f:
                        f.write(zpl_code)
                    
                    # Try printing with this printer name
                    result = subprocess.run([
                        'lp', '-d', printer_name, '-o', 'raw', temp_file
                    ], capture_output=True, text=True, timeout=10)
                    
                    if result.returncode == 0:
                        os.remove(temp_file)
                        return {
                            "success": True,
                            "method": "lp_command",
                            "printer_name": printer_name,
                            "message": f"Label printed successfully via USB using {printer_name}"
                        }
                    else:
                        print(f"lp failed for {printer_name}: {result.stderr}")
                
                except Exception as printer_error:
                    print(f"Printer {printer_name} failed: {printer_error}")
                    continue
            
            # Methode 2: Raw USB Device Access (for macOS/Linux)
            try:
                # Common USB device paths
                usb_devices = [
                    "/dev/usb/lp0", "/dev/usb/lp1", "/dev/usb/lp2",
                    "/dev/lp0", "/dev/lp1", "/dev/lp2",
                    "/dev/ttyUSB0", "/dev/ttyUSB1", "/dev/ttyUSB2"
                ]
                
                for device in usb_devices:
                    if os.path.exists(device):
                        try:
                            with open(device, 'wb') as printer:
                                printer.write(zpl_code.encode('utf-8'))
                                printer.flush()
                            
                            return {
                                "success": True,
                                "method": "direct_usb",
                                "device": device,
                                "message": f"Label printed successfully via {device}"
                            }
                        except Exception as device_error:
                            print(f"Device {device} failed: {device_error}")
                            continue
            
            except Exception as usb_error:
                print(f"USB method failed: {usb_error}")
            
            # Methode 3: Python cups for macOS/Linux
            try:
                import cups
                conn = cups.Connection()
                printers = conn.getPrinters()
                
                # Find Zebra printer in CUPS
                zebra_printer = None
                for printer_name, printer_info in printers.items():
                    if any(keyword in printer_name.lower() for keyword in ['zebra', 'gk420', 'ztc']):
                        zebra_printer = printer_name
                        break
                
                if zebra_printer:
                    # Create temporary file and print via CUPS
                    temp_file = f"/tmp/zebra_cups_{int(time.time())}.zpl"
                    with open(temp_file, 'w') as f:
                        f.write(zpl_code)
                    
                    job_id = conn.printFile(zebra_printer, temp_file, "Zebra Label", {"raw": ""})
                    os.remove(temp_file)
                    
                    return {
                        "success": True,
                        "method": "cups_python",
                        "printer_name": zebra_printer,
                        "job_id": job_id,
                        "message": f"Label printed successfully via CUPS using {zebra_printer}"
                    }
            
            except Exception as cups_error:
                print(f"CUPS Python method failed: {cups_error}")
            
            # Wenn alle Methoden fehlschlagen, gebe detaillierte Fehlerinfo
            return {
                "success": False,
                "message": "All printing methods failed. Check USB connection and printer setup.",
                "tried_printers": self.printer_names,
                "zpl_code": zpl_code,
                "troubleshooting": "1. Check USB connection, 2. Verify printer power, 3. Check CUPS printer installation"
            }
        
        except Exception as e:
            return {
                "success": False,
                "message": f"Printing failed: {str(e)}",
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
            # Überprüfe mit lpstat
            result = subprocess.run([
                'lpstat', '-p', self.printer_name
            ], capture_output=True, text=True, timeout=5)
            
            if result.returncode == 0:
                status = "online" if "idle" in result.stdout.lower() else "busy"
                return {
                    "success": True,
                    "status": status,
                    "message": result.stdout.strip()
                }
            else:
                return {
                    "success": False,
                    "status": "offline",
                    "message": "Printer not found or offline"
                }
        
        except Exception as e:
            return {
                "success": False,
                "status": "error",
                "message": f"Status check failed: {str(e)}"
            }

# Global instance
zebra_printer = ZebraPrinterService()