import React, { useState } from 'react';

// Size palette with categories as requested by user
const sizePalette = {
  'Spezialgrößen': {
    emoji: '🧥',
    sizes: [
      'OneSize',
      'Oversize'
    ]
  },
  'Cup-/AA-Größen': {
    emoji: '👖',
    sizes: [
      'AA60',
      'AA65', 
      'AA70',
      'AA75'
    ]
  },
  'Bundweite': {
    emoji: '📏',
    sizes: [
      '55',
      '60',
      '65',
      '70'
    ]
  },
  'Standardgrößen': {
    emoji: '👕',
    sizes: [
      'XS',
      'S',
      'M',
      'L',
      'XL',
      '2XL',
      '3XL'
    ]
  }
};

const SizeModal = ({ isOpen, onClose, selectedSizes, onSizeChange }) => {
  const [customSize, setCustomSize] = useState('');

  if (!isOpen) return null;

  // Toggle size selection (multiple sizes can be selected)
  const toggleSize = (sizeName) => {
    const sizes = [...selectedSizes];
    const index = sizes.indexOf(sizeName);
    if (index > -1) {
      sizes.splice(index, 1);
    } else {
      sizes.push(sizeName);
    }
    onSizeChange(sizes);
  };

  // Add custom size
  const addCustomSize = () => {
    if (customSize.trim() && !selectedSizes.includes(customSize.trim())) {
      onSizeChange([...selectedSizes, customSize.trim()]);
      setCustomSize('');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      style={{ zIndex: '26000' }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        style={{ zIndex: '26001', position: 'relative' }}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
              <span className="text-3xl">📏</span>
              <span>Größen-Übersicht - Größen auswählen</span>
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Wählen Sie eine oder mehrere Größen für Ihr Produkt aus ({selectedSizes.length} gewählt)
          </p>
        </div>
        
        <div className="p-6 space-y-6">
          {Object.entries(sizePalette).map(([categoryName, category]) => (
            <div key={categoryName} className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <span className="text-2xl">{category.emoji}</span>
                <span>{categoryName}</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {category.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 text-sm font-medium flex flex-col items-center justify-center min-h-[60px] ${
                      selectedSizes.includes(size)
                        ? 'border-blue-500 bg-blue-50 shadow-lg transform scale-105'
                        : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-md'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg mb-1">
                        {categoryName === 'Spezialgrößen' ? '🧥' : 
                         categoryName === 'Cup-/AA-Größen' ? '👙' : 
                         categoryName === 'Bundweite' ? '📐' : '👕'}
                      </div>
                      <span className={`text-center font-semibold ${
                        selectedSizes.includes(size) ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        {size}
                      </span>
                      {selectedSizes.includes(size) && (
                        <div className="text-blue-600 text-xs mt-1">✓</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          
          {/* Custom Size Input */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <span className="text-2xl">✏️</span>
              <span>Eigene Größe hinzufügen</span>
            </h4>
            <div className="flex space-x-3">
              <input
                type="text"
                value={customSize}
                onChange={(e) => setCustomSize(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. 4XL, 38/40, EU42, etc..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addCustomSize();
                  }
                }}
              />
              <button
                type="button"
                onClick={addCustomSize}
                disabled={!customSize.trim() || selectedSizes.includes(customSize.trim())}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Hinzufügen
              </button>
            </div>
            {customSize.trim() && selectedSizes.includes(customSize.trim()) && (
              <p className="text-yellow-600 text-sm mt-2">Diese Größe ist bereits ausgewählt.</p>
            )}
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
          <div className="flex justify-between items-start">
            <div className="text-sm text-gray-600">
              <div className="font-medium mb-1">
                <strong>{selectedSizes.length}</strong> Größen ausgewählt
              </div>
              {selectedSizes.length > 0 && (
                <div className="flex flex-wrap gap-1 max-w-md">
                  {selectedSizes.slice(0, 6).map((size, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {size}
                    </span>
                  ))}
                  {selectedSizes.length > 6 && (
                    <span className="text-blue-600 text-xs">+{selectedSizes.length - 6} weitere</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => onSizeChange([])}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Alle entfernen
              </button>
              <button
                type="button"
                onClick={onClose}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 font-medium"
              >
                Fertig - Größen übernehmen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SizeModal;