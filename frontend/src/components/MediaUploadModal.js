import React from 'react';

const MediaUploadModal = ({ isOpen, onClose, onCameraSelect, onFileSelect }) => {
  if (!isOpen) return null;

  const handleCameraSelect = () => {
    console.log('📷 Camera option selected');
    onCameraSelect();
    onClose();
  };

  const handleFileSelect = () => {
    console.log('📁 File selection option selected'); 
    onFileSelect();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 animate-fadeIn" style={{zIndex: 9999}}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-slideUp">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-800">
              📸 Fotos hinzufügen
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
        <div className="p-6 space-y-4">
          
          {/* Camera Option - Primary */}
          <button
            onClick={handleCameraSelect}
            className="w-full flex items-center space-x-4 p-5 border-2 border-green-200 bg-green-50 rounded-lg hover:border-green-400 hover:bg-green-100 transition-all duration-200 group active:scale-95"
          >
            <div className="text-5xl">📷</div>
            <div className="text-left flex-1">
              <h4 className="text-lg font-semibold text-green-700 group-hover:text-green-800">
                📱 Foto mit Kamera aufnehmen
              </h4>
              <p className="text-sm text-green-600">
                <strong>Empfohlen:</strong> Direkt mit iPhone/Smartphone fotografieren
              </p>
            </div>
            <div className="text-green-500 group-hover:text-green-700 text-2xl">→</div>
          </button>

          {/* File Upload Option - Secondary */}
          <button
            onClick={handleFileSelect}
            className="w-full flex items-center space-x-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group active:scale-95"
          >
            <div className="text-4xl">📁</div>
            <div className="text-left flex-1">
              <h4 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600">
                Datei auswählen
              </h4>
              <p className="text-sm text-gray-600">
                Bereits vorhandene Bilder vom Gerät hochladen
              </p>
            </div>
            <div className="text-blue-400 group-hover:text-blue-600 text-xl">→</div>
          </button>
        </div>

        {/* Instructions */}
        <div className="px-6 pb-4 border-t border-gray-100">
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500">
              💡 <strong>Tipp:</strong> Für beste Qualität verwenden Sie die Kamera-Option
            </p>
            <p className="text-xs text-gray-400 mt-1">
              📱 Smartphone & 💻 Desktop kompatibel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaUploadModal;