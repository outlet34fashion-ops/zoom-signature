import React, { useState, useRef, useEffect, useCallback } from 'react';

const CameraCapture = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' for front, 'environment' for back

  const startCamera = useCallback(async () => {
    try {
      setCameraError('');
      setIsCameraReady(false);
      
      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true);
        };
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setCameraError('Kamerazugriff fehlgeschlagen. Bitte erlauben Sie den Kamerazugriff in Ihrem Browser.');
    }
  }, [facingMode, stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraReady(false);
  }, [stream]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        // Create a File object from the blob
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([blob], `camera-photo-${timestamp}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        
        onCapture(file);
        handleClose();
      }
    }, 'image/jpeg', 0.9);
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold flex items-center space-x-2">
            <span className="text-2xl">📷</span>
            <span>Foto aufnehmen</span>
          </h3>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-300 text-2xl font-bold w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Camera View */}
        <div className="relative bg-black flex items-center justify-center" style={{ minHeight: '400px' }}>
          {cameraError ? (
            <div className="text-center p-8">
              <div className="text-6xl text-red-500 mb-4">📷</div>
              <p className="text-red-600 font-medium mb-4">{cameraError}</p>
              <button
                onClick={startCamera}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
              >
                Erneut versuchen
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`max-w-full max-h-full ${isCameraReady ? 'block' : 'hidden'}`}
                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
              />
              {!isCameraReady && (
                <div className="text-center text-white">
                  <div className="text-6xl mb-4">📷</div>
                  <p className="text-lg">Kamera wird geladen...</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Controls */}
        {isCameraReady && !cameraError && (
          <div className="bg-gray-100 px-6 py-4">
            <div className="flex justify-center items-center space-x-6">
              {/* Switch Camera Button */}
              <button
                onClick={switchCamera}
                className="bg-gray-600 hover:bg-gray-700 text-white p-3 rounded-full transition-colors duration-200 flex items-center justify-center"
                title="Kamera wechseln"
              >
                <span className="text-xl">🔄</span>
              </button>

              {/* Capture Button */}
              <button
                onClick={capturePhoto}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full text-lg font-semibold transition-colors duration-200 flex items-center space-x-2 shadow-lg"
              >
                <span className="text-2xl">📸</span>
                <span>Foto aufnehmen</span>
              </button>

              {/* Cancel Button */}
              <button
                onClick={handleClose}
                className="bg-gray-600 hover:bg-gray-700 text-white p-3 rounded-full transition-colors duration-200"
                title="Abbrechen"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>
          </div>
        )}

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
};

export default CameraCapture;