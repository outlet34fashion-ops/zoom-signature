import React, { useState } from 'react';

// Color palette with categories as requested by user
const colorPalette = {
  'Neutrale Töne': {
    emoji: '⚪',
    colors: [
      { name: 'Weiß', value: '#FFFFFF' },
      { name: 'Schwarz', value: '#000000' },
      { name: 'Grau', value: '#808080' },
      { name: 'Grau Hell', value: '#D3D3D3' },
      { name: 'Grau Dunkel', value: '#696969' },
      { name: 'Beige Hell', value: '#F5F5DC' },
      { name: 'Beige Dunkel', value: '#DEB887' },
      { name: 'Sand', value: '#C2B280' },
      { name: 'Camel', value: '#C19A6B' },
      { name: 'Taupe', value: '#483C32' }
    ]
  },
  'Erd- & Brauntöne': {
    emoji: '🟤', 
    colors: [
      { name: 'Mokka', value: '#3C2415' },
      { name: 'MUD', value: '#70543E' },
      { name: 'Chocolate', value: '#7B3F00' },
      { name: 'Rost', value: '#B7410E' }
    ]
  },
  'Rot & Rosé': {
    emoji: '🔴',
    colors: [
      { name: 'Rot', value: '#FF0000' },
      { name: 'Bordeaux', value: '#800020' },
      { name: 'Weinrot', value: '#722F37' },
      { name: 'Rosa', value: '#FFC0CB' },
      { name: 'Pink', value: '#FF69B4' }
    ]
  },
  'Orange & Peach': {
    emoji: '🧡',
    colors: [
      { name: 'Orange', value: '#FFA500' },
      { name: 'Lachs', value: '#FA8072' },
      { name: 'Peach', value: '#FFCBA4' }
    ]
  },
  'Gelb & Gold': {
    emoji: '💛',
    colors: [
      { name: 'Gelb', value: '#FFFF00' },
      { name: 'Butter', value: '#FFFF99' },
      { name: 'Gold', value: '#FFD700' }
    ]
  },
  'Grün-Töne': {
    emoji: '💚',
    colors: [
      { name: 'Grün', value: '#008000' },
      { name: 'Grün Hell', value: '#90EE90' },
      { name: 'Grün Dunkel', value: '#006400' },
      { name: 'Grün Apfel', value: '#8DB600' },
      { name: 'Oliv', value: '#808000' },
      { name: 'Salbei', value: '#9CAF88' },
      { name: 'Pistazie', value: '#93C572' },
      { name: 'Khaki', value: '#F0E68C' },
      { name: 'Mint', value: '#98FB98' }
    ]
  },
  'Blau-Töne': {
    emoji: '🔵',
    colors: [
      { name: 'Blau Hell', value: '#ADD8E6' },
      { name: 'Blau Dunkel', value: '#00008B' },
      { name: 'Blau Navi', value: '#000080' },
      { name: 'Blau Royal', value: '#4169E1' },
      { name: 'Türkis', value: '#40E0D0' },
      { name: 'Petrol', value: '#005F5F' }
    ]
  },
  'Lila-Töne': {
    emoji: '🟣',
    colors: [
      { name: 'Lila', value: '#800080' },
      { name: 'Flieder', value: '#B19CD9' }
    ]
  },
  'Metallic': {
    emoji: '✨',
    colors: [
      { name: 'Silber', value: '#C0C0C0' }
    ]
  }
};

// Get color value by name for display
const getColorValue = (colorName) => {
  for (const category of Object.values(colorPalette)) {
    const color = category.colors.find(c => c.name === colorName);
    if (color) return color.value;
  }
  // Fallback colors for legacy colors
  const fallbackColors = {
    'Schwarz': '#000000',
    'Weiß': '#FFFFFF',
    'Blau': '#0066CC',
    'Rot': '#CC0000',
    'Beige': '#F5F5DC'
  };
  return fallbackColors[colorName] || '#CCCCCC';
};

const ColorModal = ({ isOpen, onClose, selectedColors, onColorChange }) => {
  const [customColor, setCustomColor] = useState('');

  if (!isOpen) return null;

  // Toggle color selection
  const toggleColor = (colorName) => {
    const colors = [...selectedColors];
    const index = colors.indexOf(colorName);
    if (index > -1) {
      colors.splice(index, 1);
    } else {
      colors.push(colorName);
    }
    onColorChange(colors);
  };

  // Add custom color
  const addCustomColor = () => {
    if (customColor.trim() && !selectedColors.includes(customColor.trim())) {
      onColorChange([...selectedColors, customColor.trim()]);
      setCustomColor('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
              <span className="text-3xl">🎨</span>
              <span>Farbkarte - Farben auswählen</span>
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Wählen Sie eine oder mehrere Farben für Ihr Produkt aus ({selectedColors.length} gewählt)
          </p>
        </div>
        
        <div className="p-6 space-y-6">
          {Object.entries(colorPalette).map(([categoryName, category]) => (
            <div key={categoryName} className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <span className="text-2xl">{category.emoji}</span>
                <span>{categoryName}</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {category.colors.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => toggleColor(color.name)}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 text-sm font-medium flex flex-col items-center space-y-2 ${
                      selectedColors.includes(color.name)
                        ? 'border-green-500 bg-green-50 shadow-lg transform scale-105'
                        : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-md'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full border-2 border-gray-400 shadow-sm"
                      style={{ backgroundColor: color.value }}
                    />
                    <span className={`text-center leading-tight ${
                      selectedColors.includes(color.name) ? 'text-green-700 font-semibold' : 'text-gray-700'
                    }`}>
                      {color.name}
                    </span>
                    {selectedColors.includes(color.name) && (
                      <span className="text-green-600 text-xs">✓ Gewählt</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
          
          {/* Custom Color Input */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <span className="text-2xl">✏️</span>
              <span>Eigene Farbe hinzufügen</span>
            </h4>
            <div className="flex space-x-3">
              <input
                type="text"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Türkis Matt, Neon Gelb, etc..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addCustomColor();
                  }
                }}
              />
              <button
                type="button"
                onClick={addCustomColor}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 font-medium"
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <strong>{selectedColors.length}</strong> Farben ausgewählt
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => onColorChange([])}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Alle entfernen
              </button>
              <button
                type="button"
                onClick={onClose}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 font-medium"
              >
                Fertig - Farben übernehmen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorModal;
export { getColorValue };