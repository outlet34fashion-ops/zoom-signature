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
        EINFACHE AUTOMATISCHE LÖSUNG: Erstellt Shell-Script das automatisch ausgeführt wird
        """
        try:
            print(f"🖨️  AUTOMATISCHES DRUCKEN: Erstelle ausführbares Script...")
            print(f"ZPL Code length: {len(zpl_code)} characters")
            
            # METHODE 1: Erstelle ausführbares macOS Shell-Script
            try:
                timestamp = int(time.time())
                script_name = f"auto_print_{timestamp}.sh"
                script_path = f"/tmp/{script_name}"
                
                # Hole gespeicherte Bestelldaten
                customer_number = getattr(self, '_last_customer_number', 'Unknown')
                price = getattr(self, '_last_price', '0.00')
                order_id = getattr(self, '_last_order_id', f"auto_{timestamp}")
                
                # Erstelle vollständiges Shell-Script
                shell_script = f'''#!/bin/bash

# AUTOMATISCHES ZEBRA-DRUCKER SCRIPT
# Generiert für Bestellung: {order_id}
# Kunde: {customer_number}, Preis: {price}
# Erstellt: {datetime.now().strftime("%d.%m.%y %H:%M:%S")}

echo "🖨️  AUTOMATISCHES ZEBRA-DRUCKEN STARTET..."
echo "Bestellung: {order_id}"
echo "Kunde: {customer_number}"
echo "Preis: {price}"
echo ""

# ZPL-Datei erstellen
ZPL_FILE="/tmp/zebra_auto_{timestamp}.zpl"
cat > "$ZPL_FILE" << 'EOF'
{zpl_code}
EOF

echo "✅ ZPL-Datei erstellt: $ZPL_FILE"

# Verschiedene Druckbefehle versuchen
PRINTER_NAMES=("ZTC GK420d" "Zebra Technologies ZTC GK420d" "ZTC_GK420d")

for PRINTER in "${{PRINTER_NAMES[@]}}"; do
    echo "🖨️  Versuche Drucker: $PRINTER"
    
    # Methode 1: lpr mit raw option
    if lpr -P "$PRINTER" -o raw "$ZPL_FILE" 2>/dev/null; then
        echo "✅ SUCCESS: Gedruckt über lpr -P '$PRINTER' -o raw"
        rm -f "$ZPL_FILE"
        echo "🎉 AUTOMATISCHES DRUCKEN ERFOLGREICH!"
        exit 0
    fi
    
    # Methode 2: lpr ohne raw option
    if lpr -P "$PRINTER" "$ZPL_FILE" 2>/dev/null; then
        echo "✅ SUCCESS: Gedruckt über lpr -P '$PRINTER'"
        rm -f "$ZPL_FILE"
        echo "🎉 AUTOMATISCHES DRUCKEN ERFOLGREICH!"
        exit 0
    fi
    
    # Methode 3: Pipe-Methode
    if cat "$ZPL_FILE" | lpr -P "$PRINTER" -o raw 2>/dev/null; then
        echo "✅ SUCCESS: Gedruckt über Pipe zu '$PRINTER'"
        rm -f "$ZPL_FILE"
        echo "🎉 AUTOMATISCHES DRUCKEN ERFOLGREICH!"
        exit 0
    fi
    
    echo "❌ Drucker '$PRINTER' nicht verfügbar"
done

echo ""
echo "❌ AUTOMATISCHES DRUCKEN FEHLGESCHLAGEN"
echo "Verfügbare Drucker:"
lpstat -p 2>/dev/null || echo "Keine Drucker gefunden"
echo ""
echo "MANUELLER DRUCKBEFEHL:"
echo "lpr -P 'ZTC GK420d' -o raw '$ZPL_FILE'"
echo ""
echo "ZPL-Datei gespeichert: $ZPL_FILE"
'''

                # Schreibe Script-Datei
                with open(script_path, 'w') as f:
                    f.write(shell_script)
                
                # Mache Script ausführbar
                os.chmod(script_path, 0o755)
                
                print(f"✅ Ausführbares Script erstellt: {script_path}")
                
                # AUTOMATISCHE AUSFÜHRUNG: Führe Script sofort aus
                result = subprocess.run(['bash', script_path], 
                                      capture_output=True, text=True, timeout=30)
                
                if result.returncode == 0:
                    print(f"🎉 AUTOMATISCHES DRUCKEN ERFOLGREICH!")
                    print(f"Script-Ausgabe: {result.stdout}")
                    
                    return {
                        "success": True,
                        "method": "automatic_shell_script",
                        "script_path": script_path,
                        "script_output": result.stdout,
                        "message": "✅ AUTOMATISCHES DRUCKEN ERFOLGREICH über Shell-Script!"
                    }
                else:
                    print(f"⚠️  Script ausgeführt, aber Drucken fehlgeschlagen")
                    print(f"Script-Ausgabe: {result.stdout}")
                    print(f"Script-Fehler: {result.stderr}")
                    
                    return {
                        "success": False,
                        "method": "shell_script_executed",
                        "script_path": script_path,
                        "script_output": result.stdout,
                        "script_error": result.stderr,
                        "message": f"⚠️  Script erstellt und ausgeführt: {script_path}",
                        "manual_command": f"bash {script_path}",
                        "zpl_code": zpl_code
                    }
                
            except Exception as method1_error:
                print(f"❌ Shell-Script Methode fehlgeschlagen: {method1_error}")
            
            # METHODE 2: Direkte lpr-Versuche (ohne Script)
            try:
                print(f"🔧 Methode 2: Direkte lpr-Befehle...")
                
                # Erstelle ZPL-Datei
                zpl_file = f"/tmp/zebra_direct_{int(time.time())}.zpl"
                with open(zpl_file, 'w') as f:
                    f.write(zpl_code)
                
                # Probiere verschiedene Drucker-Namen direkt
                for printer_name in self.printer_names:
                    try:
                        print(f"  🖨️  Direkter Versuch: {printer_name}")
                        
                        # Direkte lpr-Befehle
                        commands = [
                            ['lpr', '-P', printer_name, '-o', 'raw', zpl_file],
                            ['lpr', '-P', printer_name, zpl_file]
                        ]
                        
                        for cmd in commands:
                            result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
                            
                            if result.returncode == 0:
                                os.remove(zpl_file)
                                print(f"✅ DIREKTER ERFOLG: {' '.join(cmd)}")
                                return {
                                    "success": True,
                                    "method": "direct_lpr",
                                    "command": ' '.join(cmd),
                                    "printer": printer_name,
                                    "message": f"✅ DIREKTES DRUCKEN ERFOLGREICH zu {printer_name}"
                                }
                    except Exception as e:
                        print(f"  ❌ Direkter Versuch fehlgeschlagen: {e}")
                        continue
                
                # Wenn direkte Methoden fehlschlagen, erstelle Anweisungsdatei
                instruction_file = f"/tmp/zebra_instructions_{int(time.time())}.txt"
                
                instructions = f"""
🖨️  ZEBRA AUTOMATISCHES DRUCKEN - ANWEISUNGEN
==============================================

BESTELLUNG DETAILS:
- Kunde: {getattr(self, '_last_customer_number', 'Unknown')}
- Preis: {getattr(self, '_last_price', '0.00')}
- Bestellung: {getattr(self, '_last_order_id', 'Unknown')}
- Zeitstempel: {datetime.now().strftime('%d.%m.%y %H:%M:%S')}

ZPL-DATEI ERSTELLT: {zpl_file}

DRUCKBEFEHLE (Terminal auf Mac ausführen):
=========================================

1. EINFACHSTER BEFEHL:
   lpr -P "ZTC GK420d" -o raw "{zpl_file}"

2. ALTERNATIVE BEFEHLE:
   lpr -P "Zebra Technologies ZTC GK420d" -o raw "{zpl_file}"
   lpr -P "ZTC_GK420d" -o raw "{zpl_file}"

3. OHNE RAW-OPTION:
   lpr -P "ZTC GK420d" "{zpl_file}"

4. PIPE-METHODE:
   cat "{zpl_file}" | lpr -P "ZTC GK420d" -o raw

DRUCKER PRÜFEN:
===============
lpstat -p

TROUBLESHOOTING:
===============
1. Drucker eingeschaltet?
2. USB-Kabel verbunden?
3. Drucker in Systemeinstellungen sichtbar?
4. "Generische Druckerfunktionen verwenden" aktiviert?

Bei Problemen: Öffnen Sie Terminal und führen Sie einen der Befehle oben aus.
"""
                
                with open(instruction_file, 'w') as f:
                    f.write(instructions)
                
                print(f"📝 Anweisungsdatei erstellt: {instruction_file}")
                
                return {
                    "success": False,
                    "method": "instruction_file_created",
                    "zpl_file": zpl_file,
                    "instruction_file": instruction_file,
                    "message": f"📝 ZPL-Datei und Anweisungen erstellt. Automatisches Drucken fehlgeschlagen.",
                    "manual_commands": [
                        f'lpr -P "ZTC GK420d" -o raw "{zpl_file}"',
                        f'lpr -P "Zebra Technologies ZTC GK420d" -o raw "{zpl_file}"'
                    ],
                    "zpl_code": zpl_code
                }
                
            except Exception as method2_error:
                print(f"❌ Direkte lpr-Methode fehlgeschlagen: {method2_error}")
            
            # FALLBACK: Einfache Datei-Erstellung
            fallback_file = f"/tmp/zebra_fallback_{int(time.time())}.zpl"
            with open(fallback_file, 'w') as f:
                f.write(zpl_code)
            
            return {
                "success": False,
                "method": "fallback_file",
                "fallback_file": fallback_file,
                "message": f"❌ Alle automatischen Methoden fehlgeschlagen. ZPL-Datei erstellt: {fallback_file}",
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