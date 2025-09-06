#!/usr/bin/env python3
"""
Manueller Zebra GK420d Test
Direkte USB-Kommunikation mit dem Drucker
"""

import subprocess
import sys
import time

def find_zebra_printer():
    """Finde Zebra-Drucker im System"""
    try:
        # Suche mit lpstat
        result = subprocess.run(['lpstat', '-p'], capture_output=True, text=True)
        print("Available printers:")
        print(result.stdout)
        
        # Suche nach Zebra
        if 'zebra' in result.stdout.lower() or 'gk420' in result.stdout.lower():
            print("✅ Zebra printer found in lpstat!")
        else:
            print("❌ No Zebra printer in lpstat")
            
    except Exception as e:
        print(f"lpstat failed: {e}")
    
    try:
        # Suche mit lsusb (Linux)
        result = subprocess.run(['lsusb'], capture_output=True, text=True)
        print(f"\nUSB devices:")
        print(result.stdout)
        
        if 'zebra' in result.stdout.lower():
            print("✅ Zebra USB device found!")
        else:
            print("❌ No Zebra USB device found")
            
    except Exception as e:
        print(f"lsusb failed: {e}")

def test_print_zpl():
    """Teste ZPL-Druck"""
    zpl_code = """^XA
^MMT
^PW320
^LL200
^LS0

^FT30,30^A0N,20,20^FD06.09.25 22:06:00^FS

^FT160,120^A0N,60,60^FB160,1,0,C^FD175^FS

^FT30,180^A0N,30,30^FD10^FS
^FT250,180^A0N,30,30^FD299^FS

^XZ"""

    print(f"\nTesting ZPL print...")
    print(f"ZPL Code:\n{zpl_code}")
    
    # Teste verschiedene Drucker-Namen
    printer_names = [
        "Zebra_Technologies_ZTC_GK420d",
        "ZTC_GK420d", 
        "GK420d",
        "Zebra"
    ]
    
    for printer in printer_names:
        try:
            print(f"\n🖨️  Testing printer: {printer}")
            
            # Erstelle temp-Datei
            with open('/tmp/test_label.zpl', 'w') as f:
                f.write(zpl_code)
            
            # Teste lp-Befehl
            result = subprocess.run([
                'lp', '-d', printer, '-o', 'raw', '/tmp/test_label.zpl'
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                print(f"✅ SUCCESS: Label sent to {printer}")
                print(f"Output: {result.stdout}")
                return True
            else:
                print(f"❌ FAILED: {result.stderr}")
                
        except Exception as e:
            print(f"❌ ERROR for {printer}: {e}")
    
    return False

if __name__ == "__main__":
    print("🏷️  ZEBRA GK420d MANUAL TEST")
    print("=" * 40)
    
    find_zebra_printer()
    
    print("\n" + "=" * 40)
    test_result = test_print_zpl()
    
    if not test_result:
        print(f"\n❌ All printing attempts failed!")
        print("📋 Troubleshooting steps:")
        print("1. Check USB cable connection")
        print("2. Verify printer power is ON")
        print("3. Add printer in System Preferences > Printers & Scanners")
        print("4. Try: sudo lpadmin -p GK420d -E -v usb://Zebra%20Technologies/ZTC%20GK420d")
    else:
        print(f"\n✅ Test completed successfully!")