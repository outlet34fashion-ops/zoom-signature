#!/bin/bash
# Automatisches Sync-Script: Container → Mac
# Kopiert ZPL-Dateien automatisch zum Mac Auto-Printer

echo "🔄 Container → Mac Sync läuft..."

# Überwache Container-Ordner
CONTAINER_DIR="/tmp/zebra_queue"
MAC_DIR="$HOME/zebra_auto_print/queue"

# Stelle sicher, dass Mac-Ordner existiert
mkdir -p "$MAC_DIR"

# Kontinuierliche Überwachung
while true; do
    # Suche nach neuen ZPL-Dateien
    for zpl_file in "$CONTAINER_DIR"/*.zpl; do
        if [ -f "$zpl_file" ]; then
            filename=$(basename "$zpl_file")
            
            # Kopiere Datei zum Mac Auto-Printer
            cp "$zpl_file" "$MAC_DIR/"
            
            echo "✅ Kopiert: $filename → Mac Auto-Printer"
            
            # Lösche Original (verhindert Duplikate)
            rm "$zpl_file"
        fi
    done
    
    # Kurz warten
    sleep 1
done