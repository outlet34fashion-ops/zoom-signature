import React from 'react';

const MediaUploadModal = ({ isOpen, onClose, onCameraSelect, onFileSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-800">
              Fotos und Videos hinzufügen
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>

        {/* Options */}
        <div className="p-6 space-y-4">
          {/* Camera Option */}
          <button
            onClick={() => {
              onCameraSelect();
              onClose();
            }}
            className="w-full flex items-center space-x-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group"
          >
            <div className="text-4xl">📷</div>
            <div className="text-left">
              <h4 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600">
                Kamera
              </h4>
              <p className="text-sm text-gray-600">
                Foto direkt aufnehmen
              </p>
            </div>
          </button>

          {/* File Upload Option */}
          <button
            onClick={() => {
              onFileSelect();
              onClose();
            }}
            className="w-full flex items-center space-x-4 p-4 border-2 border-gray-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all duration-200 group"
          >
            <div className="text-4xl">🖼️</div>
            <div className="text-left">
              <h4 className="text-lg font-semibold text-gray-800 group-hover:text-green-600">
                Foto- und Videomediathek
              </h4>
              <p className="text-sm text-gray-600">
                Dateien vom Gerät auswählen
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MediaUploadModal;