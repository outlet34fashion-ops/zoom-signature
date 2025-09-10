import React from 'react';

const MediaUploadModal = ({ isOpen, onClose, onCameraSelect, onFileSelect }) => {
  if (!isOpen) return null;

  const handleCameraSelect = () => {
    onClose(); // Close modal immediately for faster switching
    setTimeout(() => onCameraSelect(), 50); // Slight delay for smoother animation
  };

  const handleFileSelect = () => {
    onClose(); // Close modal immediately for faster switching  
    setTimeout(() => onFileSelect(), 50); // Slight delay for smoother animation
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-slideUp">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-800">
              Fotos und Videos hinzufügen
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center transition-colors duration-100"
            >
              ×
            </button>
          </div>
        </div>

        {/* Options */}
        <div className="p-6 space-y-3">
          {/* Camera Option */}
          <button
            onClick={handleCameraSelect}
            className="w-full flex items-center space-x-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-100 group active:scale-95"
          >
            <div className="text-4xl">📷</div>
            <div className="text-left flex-1">
              <h4 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600">
                Foto aufnehmen
              </h4>
              <p className="text-sm text-gray-600">
                Kamera verwenden für direkte Aufnahme
              </p>
            </div>
            <div className="text-blue-400 group-hover:text-blue-600 text-xl">→</div>
          </button>

          {/* File Upload Option */}
          <button
            onClick={handleFileSelect}
            className="w-full flex items-center space-x-4 p-4 border-2 border-gray-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all duration-100 group active:scale-95"
          >
            <div className="text-4xl">📁</div>
            <div className="text-left flex-1">
              <h4 className="text-lg font-semibold text-gray-800 group-hover:text-green-600">
                Datei einfügen
              </h4>
              <p className="text-sm text-gray-600">
                Dateien vom Gerät auswählen
              </p>
            </div>
            <div className="text-green-400 group-hover:text-green-600 text-xl">→</div>
          </button>
        </div>

        {/* Instructions */}
        <div className="px-6 pb-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center mt-3">
            📱 Smartphone & 💻 Desktop kompatibel
          </p>
        </div>
      </div>
    </div>
  );
};

export default MediaUploadModal;