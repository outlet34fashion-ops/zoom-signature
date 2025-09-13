import React, { useState } from 'react';

// Material properties palette with categories as requested by user
const materialPropertiesPalette = {
  'Weiche / Kuschelige Eigenschaften': {
    emoji: '🧸',
    properties: [
      'Teddy / Teddyflausch',
      'Fleece',
      'Plüsch',
      'Nicki',
      'Velours',
      'Samt'
    ]
  },
  'Glatte / Elegante Eigenschaften': {
    emoji: '✨',
    properties: [
      'Satin',
      'Seide',
      'Viskose',
      'Mikrofaser',
      'Modal'
    ]
  },
  'Robuste / Natürliche Eigenschaften': {
    emoji: '🏔️',
    properties: [
      'Wildleder (Suede)',
      'Lederoptik',
      'Denim',
      'Canvas',
      'Leinen',
      'Twill'
    ]
  },
  'Strick & Stretch Eigenschaften': {
    emoji: '🔄',
    properties: [
      'Feinstrick',
      'Grobstrick',
      'Rippstrick',
      'Jersey',
      'Stretch / Elasthan'
    ]
  },
  'Glänzende / Effekt-Oberflächen': {
    emoji: '💎',
    properties: [
      'Lackleder',
      'Pailletten',
      'Metallic',
      'Glitzer',
      'Netz / Mesh'
    ]
  }
};

const MaterialPropertiesModal = ({ isOpen, onClose, selectedProperties, onPropertiesChange }) => {
  const [customProperty, setCustomProperty] = useState('');

  if (!isOpen) return null;

  // Toggle property selection (multiple can be selected)
  const toggleProperty = (propertyName) => {
    const properties = [...selectedProperties];
    const index = properties.indexOf(propertyName);
    if (index > -1) {
      properties.splice(index, 1);
    } else {
      properties.push(propertyName);
    }
    onPropertiesChange(properties);
  };

  // Add custom property
  const addCustomProperty = () => {
    if (customProperty.trim() && !selectedProperties.includes(customProperty.trim())) {
      onPropertiesChange([...selectedProperties, customProperty.trim()]);
      setCustomProperty('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
              <span className="text-3xl">🏷️</span>
              <span>Material-Eigenschaften auswählen</span>
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Wählen Sie eine oder mehrere Eigenschaften für Ihr Produkt aus ({selectedProperties.length} gewählt)
          </p>
        </div>
        
        <div className="p-6 space-y-6">
          {Object.entries(materialPropertiesPalette).map(([categoryName, category]) => (
            <div key={categoryName} className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <span className="text-2xl">{category.emoji}</span>
                <span>{categoryName}</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {category.properties.map((property) => (
                  <button
                    key={property}
                    type="button"
                    onClick={() => toggleProperty(property)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 text-sm font-medium flex flex-col items-center justify-center min-h-[80px] ${
                      selectedProperties.includes(property)
                        ? 'border-green-500 bg-green-50 shadow-lg transform scale-105'
                        : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-md'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">
                        {category.emoji}
                      </div>
                      <span className={`text-center leading-tight ${
                        selectedProperties.includes(property) ? 'text-green-700 font-semibold' : 'text-gray-700'
                      }`}>
                        {property}
                      </span>
                      {selectedProperties.includes(property) && (
                        <div className="text-green-600 text-xs mt-1">✓ Gewählt</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          
          {/* Custom Property Input */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <span className="text-2xl">✏️</span>
              <span>Eigene Eigenschaft hinzufügen</span>
            </h4>
            <div className="flex space-x-3">
              <input
                type="text"
                value={customProperty}
                onChange={(e) => setCustomProperty(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="z.B. Wasserabweisend, Atmungsaktiv, Antibakteriell..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addCustomProperty();
                  }
                }}
              />
              <button
                type="button"
                onClick={addCustomProperty}
                disabled={!customProperty.trim()}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <strong>{selectedProperties.length}</strong> Eigenschaften ausgewählt
              {selectedProperties.length > 0 && (
                <div className="mt-1 text-xs text-gray-500">
                  {selectedProperties.slice(0, 3).join(', ')}{selectedProperties.length > 3 ? '...' : ''}
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => onPropertiesChange([])}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Alle entfernen
              </button>
              <button
                type="button"
                onClick={onClose}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 font-medium"
              >
                Fertig - Eigenschaften übernehmen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialPropertiesModal;