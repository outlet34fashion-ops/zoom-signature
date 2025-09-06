"""
Zebra GK420d Printer Service
Automatische Etiketten-Generierung und -Druck für 40x25mm Labels
"""

import os
import socket
import subprocess
from datetime import datetime
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

class ZebraPrinterService:
    def __init__(self):
        self.printer_name = "GK420d"  # Standard Zebra GK420d Name
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
            # Methode 1: Direkt über lp (Linux Printing System)
            try:
                # Schreibe ZPL in temporäre Datei
                temp_file = "/tmp/zebra_label.zpl"
                with open(temp_file, 'w') as f:
                    f.write(zpl_code)
                
                # Drucke über lp command
                result = subprocess.run([
                    'lp', '-d', self.printer_name, '-o', 'raw', temp_file
                ], capture_output=True, text=True, timeout=10)
                
                if result.returncode == 0:
                    os.remove(temp_file)
                    return {
                        "success": True,
                        "method": "lp_command",
                        "message": "Label printed successfully via USB"
                    }
                else:
                    logger.error(f"lp command failed: {result.stderr}")
            
            except Exception as lp_error:
                logger.warning(f"lp method failed: {lp_error}")
            
            # Methode 2: Direkt über USB Device
            try:
                # Finde USB-Zebra-Drucker
                usb_devices = [
                    "/dev/usb/lp0", "/dev/usb/lp1", "/dev/usb/lp2",
                    "/dev/lp0", "/dev/lp1", "/dev/lp2"
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
                            logger.warning(f"Device {device} failed: {device_error}")
                            continue
            
            except Exception as usb_error:
                logger.error(f"USB method failed: {usb_error}")
            
            # Methode 3: CUPS Integration
            try:
                # Verwende echo und lp für rohe ZPL-Daten
                result = subprocess.run([
                    'sh', '-c', f'echo "{zpl_code}" | lp -d {self.printer_name} -o raw'
                ], capture_output=True, text=True, timeout=10)
                
                if result.returncode == 0:
                    return {
                        "success": True,
                        "method": "cups_raw",
                        "message": "Label printed successfully via CUPS"
                    }
            
            except Exception as cups_error:
                logger.warning(f"CUPS method failed: {cups_error}")
            
            # Wenn alle Methoden fehlschlagen
            return {
                "success": False,
                "message": "All printing methods failed. Check USB connection and printer setup.",
                "zpl_code": zpl_code  # Für Debugging
            }
        
        except Exception as e:
            logger.error(f"Print error: {e}")
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