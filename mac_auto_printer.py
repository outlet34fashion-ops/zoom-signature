#!/usr/bin/env python3
"""
AUTOMATISCHER ZEBRA-DRUCKER für Mac
Überwacht einen Ordner und druckt automatisch neue ZPL-Dateien

EINRICHTUNG (auf Ihrem Mac):
1. Ordner erstellen: mkdir ~/zebra_auto_print
2. Diese Datei in den Ordner kopieren
3. Terminal öffnen: cd ~/zebra_auto_print
4. Ausführen: python3 mac_auto_printer.py

FUNKTION:
- Überwacht ~/zebra_auto_print/queue/ Ordner
- Neue .zpl Dateien werden automatisch gedruckt
- Container legt Dateien in diesem Ordner ab
"""

import os
import time
import subprocess
import sys
from datetime import datetime
import shutil

class AutoZebraPrinter:
    def __init__(self):
        self.home_dir = os.path.expanduser("~")
        self.watch_dir = os.path.join(self.home_dir, "zebra_auto_print", "queue")
        self.processed_dir = os.path.join(self.home_dir, "zebra_auto_print", "printed")
        self.error_dir = os.path.join(self.home_dir, "zebra_auto_print", "errors")
        
        # Drucker-Namen für macOS
        self.printer_names = [
            "ZTC GK420d",
            "Zebra Technologies ZTC GK420d", 
            "ZTC_GK420d",
            "Zebra_Technologies_ZTC_GK420d"
        ]
        
        self.setup_directories()
        
    def setup_directories(self):
        """Erstellt notwendige Ordner"""
        for directory in [self.watch_dir, self.processed_dir, self.error_dir]:
            os.makedirs(directory, exist_ok=True)
            
        print(f"✅ Ordner eingerichtet:")
        print(f"   📂 Überwachung: {self.watch_dir}")
        print(f"   📂 Gedruckt: {self.processed_dir}")
        print(f"   📂 Fehler: {self.error_dir}")
        
    def find_printer(self):
        """Findet verfügbaren Zebra-Drucker"""
        try:
            result = subprocess.run(['lpstat', '-p'], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                for printer_name in self.printer_names:
                    if printer_name in result.stdout:
                        print(f"✅ Drucker gefunden: {printer_name}")
                        return printer_name
                        
            print("⚠️  Kein Zebra-Drucker gefunden")
            print(f"Verfügbare Drucker:\n{result.stdout}")
            return None
            
        except Exception as e:
            print(f"❌ Fehler bei Drucker-Suche: {e}")
            return None
    
    def print_zpl_file(self, zpl_file_path):
        """Druckt ZPL-Datei automatisch"""
        try:
            print(f"\n🖨️  AUTOMATISCHES DRUCKEN: {os.path.basename(zpl_file_path)}")
            print(f"Zeit: {datetime.now().strftime('%H:%M:%S')}")
            
            # Finde Drucker
            printer = self.find_printer()
            if not printer:
                raise Exception("Kein Zebra-Drucker verfügbar")
            
            # Verschiedene Druckbefehle versuchen
            commands = [
                ['lpr', '-P', printer, '-o', 'raw', zpl_file_path],
                ['lpr', '-P', printer, zpl_file_path],
                ['bash', '-c', f'cat "{zpl_file_path}" | lpr -P "{printer}" -o raw']
            ]
            
            for cmd in commands:
                try:
                    print(f"  🔄 Versuche: {' '.join(cmd[:4])}...")
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                    
                    if result.returncode == 0:
                        print(f"  ✅ ERFOLG: Gedruckt über {' '.join(cmd[:3])}")
                        
                        # Datei in "printed" Ordner verschieben
                        filename = os.path.basename(zpl_file_path)
                        processed_path = os.path.join(self.processed_dir, f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{filename}")
                        shutil.move(zpl_file_path, processed_path)
                        
                        print(f"  📁 Datei archiviert: {processed_path}")
                        return True
                    else:
                        print(f"  ❌ Fehlgeschlagen: {result.stderr}")
                        
                except subprocess.TimeoutExpired:
                    print(f"  ⏰ Timeout: {' '.join(cmd[:3])}")
                except Exception as e:
                    print(f"  ❌ Fehler: {e}")
                    continue
            
            # Wenn alle Methoden fehlschlagen
            raise Exception("Alle Druckmethoden fehlgeschlagen")
            
        except Exception as e:
            print(f"❌ DRUCKEN FEHLGESCHLAGEN: {e}")
            
            # Datei in error Ordner verschieben
            filename = os.path.basename(zpl_file_path)
            error_path = os.path.join(self.error_dir, f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{filename}")
            shutil.move(zpl_file_path, error_path)
            
            print(f"📁 Fehlerdatei: {error_path}")
            return False
    
    def watch_and_print(self):
        """Überwacht Ordner und druckt neue ZPL-Dateien automatisch"""
        print(f"\n🔍 AUTOMATISCHE ÜBERWACHUNG GESTARTET")
        print(f"Überwache Ordner: {self.watch_dir}")
        print(f"Drücken Sie Ctrl+C zum Beenden\n")
        
        processed_files = set()
        
        try:
            while True:
                # Suche nach neuen .zpl Dateien
                zpl_files = [f for f in os.listdir(self.watch_dir) 
                           if f.endswith('.zpl') and f not in processed_files]
                
                for zpl_file in zpl_files:
                    zpl_path = os.path.join(self.watch_dir, zpl_file)
                    
                    # Warte kurz, falls Datei noch geschrieben wird
                    time.sleep(1)
                    
                    # Prüfe ob Datei vollständig ist
                    try:
                        with open(zpl_path, 'r') as f:
                            content = f.read()
                            
                        if '^XA' in content and '^XZ' in content:
                            print(f"\n📄 NEUE ZPL-DATEI ERKANNT: {zpl_file}")
                            success = self.print_zpl_file(zpl_path)
                            
                            if success:
                                print(f"🎉 AUTOMATISCHES DRUCKEN ERFOLGREICH!")
                            else:
                                print(f"❌ Automatisches Drucken fehlgeschlagen")
                                
                            processed_files.add(zpl_file)
                        else:
                            print(f"⚠️  Unvollständige ZPL-Datei: {zpl_file}")
                            
                    except Exception as e:
                        print(f"❌ Fehler beim Lesen von {zpl_file}: {e}")
                
                # Kurz warten vor nächster Prüfung
                time.sleep(2)
                
        except KeyboardInterrupt:
            print(f"\n\n🛑 AUTOMATISCHER DRUCKER GESTOPPT")
            print(f"Auf Wiedersehen!")

def main():
    print("🖨️  AUTOMATISCHER ZEBRA-DRUCKER für Mac")
    print("=" * 50)
    
    printer = AutoZebraPrinter()
    
    # Teste Drucker-Verbindung
    active_printer = printer.find_printer()
    if active_printer:
        print(f"✅ Drucker bereit: {active_printer}")
    else:
        print("⚠️  Warnung: Kein Zebra-Drucker gefunden")
        print("Stellen Sie sicher, dass der Drucker verbunden ist")
    
    print("\n📋 SETUP-INFORMATION:")
    print(f"1. Container muss ZPL-Dateien hier ablegen: {printer.watch_dir}")
    print(f"2. Gedruckte Dateien werden hier archiviert: {printer.processed_dir}")
    print(f"3. Fehlerhafte Dateien landen hier: {printer.error_dir}")
    
    print("\n🚀 STARTE AUTOMATISCHE ÜBERWACHUNG...")
    printer.watch_and_print()

if __name__ == "__main__":
    main()