#!/bin/bash

# Zebra GK420d macOS Direct Print Script
# Für direktes Drucken von ZPL-Etiketten über USB

PRINTER_NAME="Zebra_Technologies_ZTC_GK420d"

echo "🏷️  ZEBRA GK420d macOS DIRECT PRINT"
echo "=================================="

# Check if printer exists
echo "🔍 Checking printer status..."
lpstat -p "$PRINTER_NAME"

if [ $? -ne 0 ]; then
    echo "❌ Printer not found: $PRINTER_NAME"
    echo "Available printers:"
    lpstat -p
    exit 1
fi

# Generate ZPL for testing
ZPL_CODE="^XA
^MMT
^PW320
^LL200
^LS0

^FT30,30^A0N,20,20^FD$(date '+%d.%m.%y %H:%M:%S')^FS

^FT160,120^A0N,60,60^FB160,1,0,C^FD175^FS

^FT30,180^A0N,30,30^FD10^FS
^FT250,180^A0N,30,30^FD299^FS

^XZ"

echo "🖨️  Printing test label..."
echo "ZPL Code:"
echo "$ZPL_CODE"
echo ""

# Method 1: Direct lpr with raw
echo "Method 1: lpr with raw option..."
echo "$ZPL_CODE" | lpr -P "$PRINTER_NAME" -o raw

if [ $? -eq 0 ]; then
    echo "✅ Print job sent successfully!"
else
    echo "❌ Method 1 failed, trying Method 2..."
    
    # Method 2: File-based printing
    TEMP_FILE="/tmp/zebra_test_$(date +%s).zpl"
    echo "$ZPL_CODE" > "$TEMP_FILE"
    
    lpr -P "$PRINTER_NAME" -o raw "$TEMP_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✅ File-based print successful!"
        rm "$TEMP_FILE"
    else
        echo "❌ All methods failed. Manual instructions:"
        echo ""
        echo "1. Enable 'Use generic printer features' in System Preferences > Printers"
        echo "2. Copy this ZPL code and send directly to printer:"
        echo "$ZPL_CODE"
        echo ""
        echo "3. Or try manual command:"
        echo "   cat $TEMP_FILE | lpr -P '$PRINTER_NAME' -o raw"
    fi
fi

echo ""
echo "🔧 Troubleshooting:"
echo "- Check USB cable connection"
echo "- Verify printer power is ON"
echo "- Enable 'Use generic printer features' in macOS printer settings"
echo "- Try: lpstat -p to see available printers"