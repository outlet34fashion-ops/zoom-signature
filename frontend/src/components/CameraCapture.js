import React, { useState, useRef, useEffect } from 'react';

const CameraCapture = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);

  // Vereinfachte Kamera-Initialisierung mit verbesserter Fehlerbehandlung
  const startCamera = async () => {
    console.log('🎥 Starting camera...');
    setIsLoading(true);
    setError('');
    
    try {
      // Stoppe vorhandenen Stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Prüfe HTTPS-Kontext
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      console.log('🔒 Secure context:', isSecure, 'Protocol:', window.location.protocol);

      // Einfache, robuste Kamera-Konfiguration mit Fallbacks
      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'environment' // Hauptkamera zuerst
        },
        audio: false
      };

      console.log('🎥 Requesting camera access...');
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('✅ Camera access granted!');
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Warten bis Video geladen ist
        videoRef.current.onloadedmetadata = () => {
          console.log('📷 Video loaded, starting playback...');
          videoRef.current.play()
            .then(() => {
              console.log('✅ Camera ready for capture!');
              setCameraStarted(true);
              setIsLoading(false);
            })
            .catch(playError => {
              console.error('❌ Video play failed:', playError);
              setError('Video-Wiedergabe fehlgeschlagen. Bitte versuchen Sie es erneut.');
              setIsLoading(false);
            });
        };
      }

    } catch (err) {
      console.error('❌ Camera access failed:', err);
      setIsLoading(false);
      
      let errorMessage = 'Kamera-Zugriff fehlgeschlagen. ';
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      
      if (err.name === 'NotAllowedError') {
        errorMessage += '❌ Berechtigung verweigert. Bitte erlauben Sie Kamera-Zugriff und laden die Seite neu.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += '❌ Keine Kamera gefunden. Prüfen Sie ob eine Kamera angeschlossen ist.';
      } else if (err.name === 'SecurityError' || err.name === 'NotReadableError') {
        if (!isSecure) {
          errorMessage += '⚠️ HTTPS ERFORDERLICH: Bitte öffnen Sie die App über die offizielle URL (https://live-shop-mobile.preview.emergentagent.com) für Kamera-Zugriff.';
        } else {
          errorMessage += '⚠️ Sicherheitsfehler: Kamera-Zugriff blockiert. Prüfen Sie Browser-Einstellungen.';
        }
      } else {
        errorMessage += `Fehler: ${err.message}`;
        if (!isSecure) {
          errorMessage += ' (Hinweis: HTTPS wird für Kamera-Zugriff benötigt)';
        }
      }
      
      setError(errorMessage);
    }
  };

  // Foto aufnehmen - vereinfacht
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !cameraStarted) {
      alert('❌ Kamera ist nicht bereit!');
      return;
    }

    console.log('📸 Taking photo...');
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Canvas-Größe an Video anpassen
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Foto aufnehmen
    ctx.drawImage(video, 0, 0);

    // Als Blob konvertieren
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        console.log('✅ Photo captured:', file.size, 'bytes');
        onCapture(file);
        handleClose();
      } else {
        alert('❌ Foto-Erstellung fehlgeschlagen!');
      }
    }, 'image/jpeg', 0.9);
  };

  // Kamera wechseln
  const switchCamera = () => {
    setCameraStarted(false);
    startCamera();
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraStarted(false);
    setIsLoading(false);
    setError('');
    onClose();
  };

  // Kamera starten wenn Modal öffnet
  useEffect(() => {
    if (isOpen && !cameraStarted && !isLoading) {
      startCamera();
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

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
          <button onClick={handleClose} className="text-white hover:text-gray-300 text-2xl font-bold">
            ×
          </button>
        </div>

        {/* Kamera-Bereich */}
        <div className="relative bg-black" style={{ height: '400px' }}>
          
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="text-center">
                <div className="text-6xl mb-4">📷</div>
                <p className="text-lg">Kamera wird gestartet...</p>
                <div className="mt-4">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-center p-6">
              <div>
                <div className="text-6xl text-red-500 mb-4">⚠️</div>
                <p className="text-red-600 font-medium mb-4 text-sm leading-6">{error}</p>
                <button
                  onClick={startCamera}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                >
                  Erneut versuchen
                </button>
              </div>
            </div>
          )}

          {/* Video Feed */}
          {!error && !isLoading && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ display: cameraStarted ? 'block' : 'none' }}
            />
          )}
        </div>

        {/* Controls */}
        {cameraStarted && !error && (
          <div className="bg-gray-100 px-6 py-4">
            <div className="flex justify-center items-center space-x-4">
              
              {/* Kamera wechseln */}
              <button
                onClick={switchCamera}
                className="bg-gray-600 hover:bg-gray-700 text-white p-3 rounded-full"
                title="Kamera wechseln"
              >
                🔄
              </button>

              {/* Foto aufnehmen */}
              <button
                onClick={takePhoto}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full text-lg font-semibold flex items-center space-x-2 shadow-lg"
              >
                <span className="text-2xl">📸</span>
                <span>Foto aufnehmen</span>
              </button>

              {/* Schließen */}
              <button
                onClick={handleClose}
                className="bg-gray-600 hover:bg-gray-700 text-white p-3 rounded-full"
                title="Schließen"
              >
                ✕
              </button>
            </div>
            
            <div className="mt-3 text-center">
              <p className="text-sm text-gray-600">
                📱 Für beste Ergebnisse: Erlauben Sie Kamera-Zugriff in Ihrem Browser
              </p>
            </div>
          </div>
        )}

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
};

export default CameraCapture;