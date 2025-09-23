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

      // iPhone/Mobile-optimized constraint configurations
      const constraintSets = [
        // iPhone/iOS optimized constraints (try FIRST on mobile)
        {
          video: {
            facingMode: facingMode,
            width: { ideal: 1280, max: 1920, min: 640 },
            height: { ideal: 720, max: 1080, min: 480 },
            frameRate: { ideal: 30, max: 30 }, // Limit framerate for stability
            aspectRatio: { ideal: 16/9 }
          },
          audio: false
        },
        // High-quality mobile constraints
        {
          video: {
            facingMode: facingMode,
            width: { ideal: 1920, max: 3840 },
            height: { ideal: 1080, max: 2160 },
            frameRate: { ideal: 24, max: 30 }
          },
          audio: false
        },
        // Basic mobile constraints with specific camera
        {
          video: {
            facingMode: { exact: facingMode },
            width: { min: 640, ideal: 1280 },
            height: { min: 480, ideal: 720 }
          },
          audio: false
        },
        // iOS Safari fallback - environment camera
        {
          video: {
            facingMode: 'environment',
            width: { min: 640, ideal: 1280 },
            height: { min: 480, ideal: 720 }
          },
          audio: false
        },
        // iOS Safari fallback - user camera  
        {
          video: {
            facingMode: 'user',
            width: { min: 640, ideal: 1280 },
            height: { min: 480, ideal: 720 }
          },
          audio: false
        },
        // Final basic fallback for any device
        {
          video: {
            width: { min: 320, ideal: 1280 },
            height: { min: 240, ideal: 720 }
          },
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

      if (videoRef.current) {
        // Clear any existing source first to prevent flicker
        videoRef.current.srcObject = null;
        
        // Small delay to ensure cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
        
        videoRef.current.srcObject = newStream;
        
        // Enhanced mobile video setup
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.muted = true;
        
        // Ensure video plays and set ready state
        videoRef.current.onloadedmetadata = async () => {
          try {
            console.log('📱 Video loaded, attempting mobile-optimized play...');
            
            // Force play for mobile Safari compatibility
            await videoRef.current.play();
            
            const videoWidth = videoRef.current.videoWidth;
            const videoHeight = videoRef.current.videoHeight;
            console.log('✅ Mobile camera ready! Resolution:', videoWidth, 'x', videoHeight);
            console.log('📱 Video tracks:', newStream.getVideoTracks().map(track => ({
              label: track.label,
              settings: track.getSettings()
            })));
            
            // Double-check video is actually playing (mobile Safari fix)
            setTimeout(() => {
              if (videoRef.current && !videoRef.current.paused) {
                setIsCameraReady(true);
                console.log('📱 Mobile camera confirmed playing');
              } else {
                console.log('📱 Mobile camera needs manual start');
                setIsCameraReady(true); // Still allow manual start
              }
            }, 500);
            
          } catch (playError) {
            console.warn('⚠️ Mobile video autoplay failed (browser restriction):', playError.message);
            // Still set ready even if autoplay fails - user can manually start
            setIsCameraReady(true);
          }
        };

        // Additional event listeners for debugging
        videoRef.current.oncanplay = () => {
          console.log('📷 Video can play');
        };

        videoRef.current.onplaying = () => {
          console.log('📷 Video is playing');
        };

        videoRef.current.onerror = (error) => {
          console.error('📷 Video error:', error);
          setCameraError('Video-Wiedergabe fehlgeschlagen');
        };
      }
    } catch (error) {
      console.error('🚨 Camera access error:', error);
      let errorMessage = 'Kamerazugriff fehlgeschlagen. ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Bitte erlauben Sie den Kamerazugriff in Ihrem Browser und laden Sie die Seite neu.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'Keine Kamera gefunden. Bitte stellen Sie sicher, dass eine Kamera angeschlossen und verfügbar ist.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Kamera wird bereits verwendet. Bitte schließen Sie andere Apps, die die Kamera nutzen.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage += 'Kamera unterstützt die angeforderte Auflösung nicht.';
      } else if (error.name === 'SecurityError') {
        errorMessage += 'Sicherheitsfehler. Bitte stellen Sie sicher, dass Sie HTTPS verwenden oder localhost nutzen.';
      } else {
        errorMessage += `Fehler: ${error.message}`;
      }
      
      setCameraError(errorMessage);
      setIsCameraReady(false);
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
      console.log('🎥 Camera modal opened, starting camera...');
      startCamera();
    } else {
      console.log('🎥 Camera modal closed, stopping camera...');
      stopCamera();
    }

    return () => {
      console.log('🎥 Camera component cleanup');
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center" style={{zIndex: 9999}}>
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
        <div className="relative bg-black flex items-center justify-center" style={{ minHeight: '400px', maxHeight: '500px' }}>
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
                webkit-playsinline="true"
                muted
                controls={false}
                className={`w-full h-full object-cover ${isCameraReady ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
                style={{ 
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                  minHeight: '400px',
                  maxHeight: '500px'
                }}
                onLoadedMetadata={async () => {
                  console.log('📱 Video metadata loaded - mobile optimization starting...');
                  try {
                    // Force play for mobile Safari
                    if (videoRef.current) {
                      await videoRef.current.play();
                      console.log('📱 Mobile video play successful');
                      setIsCameraReady(true);
                    }
                  } catch (playError) {
                    console.warn('⚠️ Mobile video autoplay failed, manual start required:', playError.message);
                    // Still set ready for manual play
                    setIsCameraReady(true);
                  }
                }}
              />
              {!isCameraReady && (
                <div className="absolute inset-0 flex items-center justify-center text-center text-white bg-black bg-opacity-50">
                  <div>
                    <div className="text-6xl mb-4">📷</div>
                    <p className="text-lg">Kamera wird geladen...</p>
                    <div className="mt-4">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  </div>
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
                data-capture-button="true"
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