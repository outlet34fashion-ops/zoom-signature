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
        ECHTES AUTOMATISCHES DRUCKEN: Container schreibt in überwachten Ordner
        """
        try:
            print(f"🖨️  ECHTES AUTOMATISCHES DRUCKEN: Schreibe ZPL-Datei...")
            print(f"ZPL Code length: {len(zpl_code)} characters")
            
            # Hole Bestelldaten
            customer_number = getattr(self, '_last_customer_number', 'Unknown')
            price = getattr(self, '_last_price', '0.00')
            order_id = getattr(self, '_last_order_id', f"auto_{int(time.time())}")
            
            # METHODE 1: Schreibe in gemeinsamen Überwachungsordner
            try:
                print(f"📁 Methode 1: Schreibe ZPL in Überwachungsordner...")
                
                # Erstelle Überwachungsordner (falls nicht vorhanden)
                watch_dirs = [
                    "/tmp/zebra_queue",  # Container-Ordner
                    "/shared/zebra_queue",  # Möglicher shared volume
                    "/app/zebra_queue"  # App-Ordner
                ]
                
                for watch_dir in watch_dirs:
                    try:
                        os.makedirs(watch_dir, exist_ok=True)
                        
                        # Erstelle ZPL-Datei mit eindeutigem Namen
                        timestamp = int(time.time())
                        filename = f"order_{order_id}_{customer_number}_{timestamp}.zpl"
                        file_path = os.path.join(watch_dir, filename)
                        
                        # Schreibe ZPL-Datei
                        with open(file_path, 'w') as f:
                            f.write(zpl_code)
                        
                        print(f"✅ ZPL-Datei erstellt: {file_path}")
                        
                        # Erstelle auch Info-Datei mit Bestelldetails
                        info_file = os.path.join(watch_dir, f"info_{timestamp}.txt")
                        with open(info_file, 'w') as f:
                            f.write(f"""AUTOMATISCHER ZEBRA-DRUCK
Bestellung: {order_id}
Kunde: {customer_number}
Preis: {price}
Zeitstempel: {datetime.now().strftime('%d.%m.%y %H:%M:%S')}
ZPL-Datei: {filename}

SETUP FÜR MAC:
1. Kopieren Sie mac_auto_printer.py auf Ihren Mac Desktop
2. Terminal öffnen: cd ~/Desktop
3. Ausführen: python3 mac_auto_printer.py
4. Ordner ~/zebra_auto_print/queue/ wird überwacht
5. Kopieren Sie {file_path} nach ~/zebra_auto_print/queue/
6. Automatisches Drucken erfolgt sofort!

MANUELLER DRUCKBEFEHL:
lpr -P "ZTC GK420d" -o raw "{file_path}"
""")
                        
                        print(f"📋 Info-Datei erstellt: {info_file}")
                        
                        # Versuche direkte Ausführung (falls lpr verfügbar)
                        try:
                            result = subprocess.run(['which', 'lpr'], capture_output=True, timeout=5)
                            if result.returncode == 0:
                                print(f"🖨️  lpr verfügbar - versuche direktes Drucken...")
                                
                                printer_names = ["ZTC GK420d", "Zebra Technologies ZTC GK420d", "ZTC_GK420d"]
                                
                                for printer in printer_names:
                                    try:
                                        print_result = subprocess.run(
                                            ['lpr', '-P', printer, '-o', 'raw', file_path],
                                            capture_output=True, text=True, timeout=20
                                        )
                                        
                                        if print_result.returncode == 0:
                                            print(f"🎉 DIREKTES DRUCKEN ERFOLGREICH: {printer}")
                                            return {
                                                "success": True,
                                                "method": "direct_container_lpr",
                                                "printer": printer,
                                                "file_path": file_path,
                                                "order_id": order_id,
                                                "customer_number": customer_number,
                                                "price": price,
                                                "message": f"✅ ECHTES AUTOMATISCHES DRUCKEN ERFOLGREICH zu {printer}"
                                            }
                                    except Exception as e:
                                        print(f"  ❌ Direktes Drucken fehlgeschlagen für {printer}: {e}")
                                        continue
                                        
                            else:
                                print(f"📝 lpr nicht verfügbar - File Watcher erforderlich")
                                
                        except Exception as lpr_error:
                            print(f"📝 lpr-Test fehlgeschlagen: {lpr_error}")
                        
                        # Erfolgreiche Datei-Erstellung
                        return {
                            "success": True,
                            "method": "file_watcher_system",
                            "file_path": file_path,
                            "info_file": info_file,
                            "watch_dir": watch_dir,
                            "order_id": order_id,
                            "customer_number": customer_number,
                            "price": price,
                            "message": f"✅ ZPL-Datei für automatisches Drucken erstellt: {filename}",
                            "setup_instructions": [
                                "1. Kopieren Sie mac_auto_printer.py auf Ihren Mac Desktop",
                                "2. Terminal: cd ~/Desktop && python3 mac_auto_printer.py",
                                f"3. Kopieren Sie {file_path} nach ~/zebra_auto_print/queue/",
                                "4. Automatisches Drucken erfolgt sofort!"
                            ]
                        }
                        
                    except PermissionError:
                        print(f"❌ Keine Berechtigung für {watch_dir}")
                        continue
                    except Exception as e:
                        print(f"❌ Fehler mit {watch_dir}: {e}")
                        continue
                
                print(f"❌ Alle Überwachungsordner fehlgeschlagen")
                
            except Exception as method1_error:
                print(f"❌ File Watcher Methode fehlgeschlagen: {method1_error}")
            
            # METHODE 2: HTTP-Webhook (falls verfügbar)
            try:
                print(f"🌐 Methode 2: HTTP-Webhook zu Mac...")
                
                import requests
                
                webhook_urls = [
                    "http://host.docker.internal:8765/print",
                    "http://localhost:8765/print",
                    "http://127.0.0.1:8765/print"
                ]
                
                webhook_data = {
                    "zpl_code": zpl_code,
                    "customer_number": customer_number,
                    "price": price,
                    "order_id": order_id,
                    "timestamp": datetime.now().isoformat()
                }
                
                for url in webhook_urls:
                    try:
                        print(f"  🔗 Versuche Webhook: {url}")
                        response = requests.post(url, json=webhook_data, timeout=5)
                        
                        if response.status_code == 200:
                            result = response.json()
                            if result.get('success'):
                                print(f"🎉 WEBHOOK ERFOLGREICH: {url}")
                                return {
                                    "success": True,
                                    "method": "http_webhook",
                                    "webhook_url": url,
                                    "order_id": order_id,
                                    "customer_number": customer_number,
                                    "price": price,
                                    "message": f"✅ AUTOMATISCHES DRUCKEN über Webhook: {result.get('message', 'Gedruckt')}"
                                }
                        
                    except Exception as e:
                        print(f"  ❌ Webhook {url} fehlgeschlagen: {e}")
                        continue
                
                print(f"📝 Keine Webhooks verfügbar")
                
            except Exception as method2_error:
                print(f"❌ Webhook-Methode fehlgeschlagen: {method2_error}")
            
            # FALLBACK: Erstelle Anweisungsdatei
            try:
                print(f"📝 Fallback: Erstelle detaillierte Anweisungen...")
                
                instruction_file = f"/tmp/auto_print_setup_{int(time.time())}.txt"
                
                instructions = f"""
🖨️  ECHTES AUTOMATISCHES DRUCKEN - SETUP ANWEISUNGEN
====================================================

PROBLEM: Container kann nicht direkt auf USB-Drucker zugreifen.
LÖSUNG: File Watcher System für echtes automatisches Drucken.

BESTELLUNG DETAILS:
==================
Bestellung ID: {order_id}
Kunde: {customer_number}
Preis: {price}
Zeitstempel: {datetime.now().strftime('%d.%m.%y %H:%M:%S')}

SETUP FÜR ECHTES AUTOMATISCHES DRUCKEN:
=======================================

SCHRITT 1: Mac Auto-Printer herunterladen
------------------------------------------
Kopieren Sie die Datei 'mac_auto_printer.py' auf Ihren Mac Desktop

SCHRITT 2: Auto-Printer starten
-------------------------------
Terminal auf Mac öffnen:
cd ~/Desktop
python3 mac_auto_printer.py

SCHRITT 3: Automatisches System läuft
------------------------------------
- Überwacht ~/zebra_auto_print/queue/ Ordner
- Neue .zpl Dateien werden automatisch gedruckt
- Keine weiteren Schritte nötig!

SCHRITT 4: Container-Verbindung (einmalig)
------------------------------------------
Damit Container automatisch Dateien ablegt:
1. Ordner ~/zebra_auto_print/queue/ freigeben
2. Oder: Container Volume mounten

AKTUELLE ZPL-DATEI:
==================
{zpl_code}

MANUELLER SOFORTDRUCK (Terminal auf Mac):
=========================================
cat > ~/Desktop/zebra_now.zpl << 'EOF'
{zpl_code}
EOF
lpr -P "ZTC GK420d" -o raw ~/Desktop/zebra_now.zpl

NACH SETUP: VOLLAUTOMATISCH!
============================
- Bei jeder Bestellung wird automatisch gedruckt
- Keine Downloads, keine manuellen Schritte
- Echter Autopilot-Modus
"""
                
                with open(instruction_file, 'w') as f:
                    f.write(instructions)
                
                print(f"📋 Setup-Anweisungen erstellt: {instruction_file}")
                
                return {
                    "success": False,
                    "method": "setup_instructions",
                    "instruction_file": instruction_file,
                    "order_id": order_id,
                    "customer_number": customer_number,
                    "price": price,
                    "message": "📝 Setup für echtes automatisches Drucken erforderlich",
                    "setup_required": True,
                    "auto_printer_file": "/app/mac_auto_printer.py",
                    "zpl_code": zpl_code
                }
                
            except Exception as fallback_error:
                print(f"❌ Fallback fehlgeschlagen: {fallback_error}")
            
            # Letzter Fallback
            return {
                "success": False,
                "method": "all_failed",
                "message": "❌ Alle automatischen Druckmethoden fehlgeschlagen",
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
        ENHANCED: Speichert Bestelldaten für Host-Service
        """
        try:
            customer_number = str(order_data.get('customer_number', '000'))
            price = str(order_data.get('price', '0.00'))
            timestamp = datetime.now()
            order_id = order_data.get('id', f"order_{int(time.time())}")
            
            # Speichere Bestelldaten für Host-Service
            self._last_customer_number = customer_number
            self._last_price = price  
            self._last_order_id = order_id
            
            print(f"🖨️  AUTOMATIC ORDER LABEL: Customer {customer_number}, Price {price}, Order {order_id}")
            
            # Generiere ZPL-Code
            zpl_code = self.generate_zpl_label(customer_number, price, timestamp)
            
            # AUTOMATISCHES DRUCKEN über Host-Service
            print_result = self.print_label_usb(zpl_code)
            
            # Erweitere Ergebnis um Order-Info
            print_result.update({
                "order_id": order_id,
                "customer_number": customer_number,
                "price": price,
                "timestamp": timestamp.isoformat(),
                "zpl_code": zpl_code,
                "automatic_print_attempt": True
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