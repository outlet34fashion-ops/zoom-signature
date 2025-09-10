import React, { useState } from 'react';

// Material palette with categories as requested by user
const materialPalette = {
  'Naturfasern': {
    emoji: '🌿',
    materials: [
      'Baumwolle',
      'Baumwolle/Elasthan', 
      'Baumwolle/Polyester',
      'Leinen',
      'Wolle',
      'Kaschmir',
      'Seide'
    ]
  },
  'Chemiefasern': {
    emoji: '🧵',
    materials: [
      'Polyester',
      'Viskose',
      'Viskose/Polyester',
      'Modal',
      'Acryl'
    ]
  },
  'Elastische Fasern': {
    emoji: '🔄',
    materials: [
      'Elasthan / Spandex (Stretch)'
    ]
  }
};

const MaterialModal = ({ isOpen, onClose, selectedMaterial, onMaterialChange }) => {
  const [customMaterial, setCustomMaterial] = useState('');

  if (!isOpen) return null;

  // Select material (only one can be selected at a time)
  const selectMaterial = (materialName) => {
    onMaterialChange(materialName);
  };

  // Add custom material
  const addCustomMaterial = () => {
    if (customMaterial.trim()) {
      onMaterialChange(customMaterial.trim());
      setCustomMaterial('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
              <span className="text-3xl">🧵</span>
              <span>Material-Übersicht - Material auswählen</span>
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Wählen Sie ein Material für Ihr Produkt aus{selectedMaterial ? ` (Gewählt: ${selectedMaterial})` : ''}
          </p>
        </div>
        
        <div className="p-6 space-y-6">
          {Object.entries(materialPalette).map(([categoryName, category]) => (
            <div key={categoryName} className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <span className="text-2xl">{category.emoji}</span>
                <span>{categoryName}</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {category.materials.map((material) => (
                  <button
                    key={material}
                    type="button"
                    onClick={() => selectMaterial(material)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 text-sm font-medium flex flex-col items-center justify-center min-h-[80px] ${
                      selectedMaterial === material
                        ? 'border-green-500 bg-green-50 shadow-lg transform scale-105'
                        : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-md'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">
                        {categoryName === 'Naturfasern' ? '🌿' : 
                         categoryName === 'Chemiefasern' ? '🧪' : '💪'}
                      </div>
                      <span className={`text-center leading-tight ${
                        selectedMaterial === material ? 'text-green-700 font-semibold' : 'text-gray-700'
                      }`}>
                        {material}
                      </span>
                      {selectedMaterial === material && (
                        <div className="text-green-600 text-xs mt-1">✓ Gewählt</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          
          {/* Custom Material Input */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <span className="text-2xl">✏️</span>
              <span>Eigenes Material hinzufügen</span>
            </h4>
            <div className="flex space-x-3">
              <input
                type="text"
                value={customMaterial}
                onChange={(e) => setCustomMaterial(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="z.B. Bambus, Hanf, Merino-Wolle, etc..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addCustomMaterial();
                  }
                }}
              />
              <button
                type="button"
                onClick={addCustomMaterial}
                disabled={!customMaterial.trim()}
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
              {selectedMaterial ? (
                <span><strong>Material gewählt:</strong> {selectedMaterial}</span>
              ) : (
                <span>Kein Material ausgewählt</span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => onMaterialChange('')}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Auswahl entfernen
              </button>
              <button
                type="button"
                onClick={onClose}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 font-medium"
              >
                Fertig - Material übernehmen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialModal;