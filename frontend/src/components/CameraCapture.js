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

      // Try different constraint configurations for better compatibility
      const constraintSets = [
        // Mobile-optimized constraints (try first on mobile)
        {
          video: {
            facingMode: facingMode,
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          },
          audio: false
        },
        // Desktop-optimized constraints
        {
          video: {
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 }
          },
          audio: false
        },
        // Basic mobile constraints
        {
          video: {
            facingMode: 'environment', // Back camera first
            width: { min: 640, ideal: 1280 },
            height: { min: 480, ideal: 720 }
          },
          audio: false
        },
        // Front camera fallback
        {
          video: {
            facingMode: 'user', // Front camera
            width: { min: 640, ideal: 1280 },
            height: { min: 480, ideal: 720 }
          },
          audio: false
        },
        // Final basic fallback
        {
          video: true,
          audio: false
        }
      ];

      let newStream = null;
      let lastError = null;

      console.log('📱 Detecting device type for camera optimization...');
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      console.log('📱 Device type:', isMobile ? 'Mobile' : 'Desktop');

      for (let i = 0; i < constraintSets.length; i++) {
        const constraint = constraintSets[i];
        try {
          console.log(`📷 Attempt ${i + 1}/${constraintSets.length} - Testing constraints:`, constraint);
          newStream = await navigator.mediaDevices.getUserMedia(constraint);
          console.log('✅ Camera access successful with constraint set', i + 1);
          break;
        } catch (error) {
          console.log(`❌ Constraint set ${i + 1} failed:`, error.name, error.message);
          lastError = error;
          // Continue to next constraint set
        }
      }

      if (!newStream) {
        throw lastError || new Error('Alle Kamera-Konfigurationen fehlgeschlagen');
      }

      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.onloadedmetadata = () => {
          const videoWidth = videoRef.current.videoWidth;
          const videoHeight = videoRef.current.videoHeight;
          console.log('📷 Camera ready! Resolution:', videoWidth, 'x', videoHeight);
          console.log('📷 Video tracks:', newStream.getVideoTracks().map(track => ({
            label: track.label,
            settings: track.getSettings()
          })));
          setIsCameraReady(true);
        };
      }
    } catch (error) {
      console.error('🚨 Camera access error:', error);
      let errorMessage = 'Kamerazugriff fehlgeschlagen. ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Bitte erlauben Sie den Kamerazugriff in Ihrem Browser.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'Keine Kamera gefunden. Bitte stellen Sie sicher, dass eine Kamera verfügbar ist.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Kamera wird bereits verwendet. Bitte schließen Sie andere Apps, die die Kamera nutzen.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage += 'Kamera unterstützt die angeforderte Auflösung nicht.';
      } else {
        errorMessage += `Fehler: ${error.message}`;
      }
      
      setCameraError(errorMessage);
    }
  }, [facingMode, stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraReady(false);
  }, [stream]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) {
      alert('❌ Kamera ist nicht bereit. Bitte warten Sie, bis die Kamera geladen ist.');
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Set canvas dimensions to match video (with fallbacks)
      const videoWidth = video.videoWidth || 1280;
      const videoHeight = video.videoHeight || 720;
      
      canvas.width = videoWidth;
      canvas.height = videoHeight;

      console.log('📸 Capturing photo:', videoWidth, 'x', videoHeight);

      // Draw the video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob with error handling
      const capturePromise = new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob && blob.size > 0) {
            resolve(blob);
          } else {
            reject(new Error('Foto-Erstellung fehlgeschlagen'));
          }
        }, 'image/jpeg', 0.92); // High quality
      });

      const blob = await capturePromise;
      
      // Create a File object from the blob
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = new File([blob], `camera-photo-${timestamp}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });
      
      console.log('✅ Photo captured successfully:', file.name, file.size, 'bytes');
      
      // Show immediate feedback
      const captureButton = document.querySelector('[data-capture-button]');
      if (captureButton) {
        const originalText = captureButton.innerHTML;
        captureButton.innerHTML = '<span class="text-2xl">✅</span><span>Foto erfasst!</span>';
        setTimeout(() => {
          captureButton.innerHTML = originalText;
        }, 1000);
      }
      
      onCapture(file);
      handleClose();

    } catch (error) {
      console.error('🚨 Photo capture error:', error);
      alert('❌ Fehler beim Aufnehmen des Fotos. Bitte versuchen Sie es erneut.');
    }
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
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full text-lg font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg active:scale-95"
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
            
            {/* Instructions */}
            <div className="mt-3 text-center">
              <p className="text-sm text-gray-600">
                📷 Tippen Sie auf "Foto aufnehmen" um ein Bild zu erstellen
              </p>
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