import React, { useState, useEffect, useRef } from 'react';

const DirectWebcamStream = ({ isHost = false, onStreamReady }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [viewerCount, setViewerCount] = useState(42);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Für Host: Webcam starten
  const startWebcamStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        setHasPermission(true);
        if (onStreamReady) onStreamReady(stream);
      }
    } catch (err) {
      console.error('Webcam access error:', err);
      setError('Kamera-Zugriff nicht möglich. Bitte Berechtigung erteilen.');
    }
  };

  // Stream beenden
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  };

  useEffect(() => {
    // Viewer Count Simulation
    const interval = setInterval(() => {
      setViewerCount(prev => prev + Math.floor(Math.random() * 3) - 1);
    }, 5000);

    return () => {
      clearInterval(interval);
      stopStream();
    };
  }, []);

  // Host View - Webcam Controls
  if (isHost) {
    return (
      <div className="webcam-host-control bg-black text-white rounded-lg p-6 min-h-[500px]">
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-bold text-pink-400">
            📹 Live Webcam Stream
          </h2>
          
          {!isStreaming ? (
            <div className="space-y-4">
              <div className="text-6xl">🎥</div>
              <p className="text-gray-300">
                Starten Sie Ihren Live-Stream direkt über die Webcam
              </p>
              
              <button
                onClick={startWebcamStream}
                className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white px-8 py-4 rounded-xl text-lg font-bold transform transition hover:scale-105"
              >
                🔴 Live Stream starten
              </button>
              
              <div className="text-sm text-gray-400 space-y-1">
                <p>✅ Echtzeit ohne Verzögerung</p>
                <p>✅ Direkt über Browser</p>
                <p>✅ HD Qualität</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Host Video Preview */}
              <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-4 left-4">
                  <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm flex items-center">
                    <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                    LIVE
                  </div>
                </div>
                <div className="absolute top-4 right-4">
                  <div className="bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm">
                    👁️ {viewerCount}
                  </div>
                </div>
              </div>
              
              <p className="text-green-400 font-semibold">
                ✅ Sie sind live! Kunden sehen jetzt Ihr Video.
              </p>
              
              <button
                onClick={stopStream}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
              >
                ⏹️ Stream beenden
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg">
              <p className="font-semibold">Fehler:</p>
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Customer View - Stream anzeigen
  return (
    <div className="webcam-customer-view bg-black text-white rounded-lg overflow-hidden min-h-[500px] relative">
      
      {/* Live Stream Display */}
      <div className="relative h-full">
        
        {/* Stream Video (würde normalerweise über WebRTC/Socket kommen) */}
        <div className="stream-display h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
          
          {/* Live Stream Placeholder - in Produktion würde hier das echte Video stream kommen */}
          <div className="text-center space-y-6 p-8">
            <div className="w-32 h-32 bg-gradient-to-br from-pink-500 to-red-500 rounded-full mx-auto flex items-center justify-center text-4xl animate-pulse">
              📹
            </div>
            
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">
                Live Stream aktiv
              </h3>
              <p className="text-lg text-gray-300">
                Outlet34 Live Shopping
              </p>
              
              {/* Live Indicators */}
              <div className="flex justify-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-400">LIVE</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400">HD Stream</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-blue-400">Echtzeit</span>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-black/50 rounded-lg">
                <p className="text-sm text-gray-400">Warten auf Stream...</p>
                <p className="text-xs text-gray-500 mt-1">
                  Der Moderator startet gerade das Live-Video
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Overlays */}
        <div className="absolute top-4 left-4">
          <div className="bg-red-600 text-white px-4 py-2 rounded-full text-sm flex items-center">
            <div className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></div>
            LIVE STREAM
          </div>
        </div>

        <div className="absolute top-4 right-4">
          <div className="bg-black bg-opacity-70 text-white px-3 py-2 rounded-full text-sm">
            👁️ {viewerCount} Zuschauer
          </div>
        </div>

        <div className="absolute bottom-4 left-4">
          <div className="bg-gradient-to-r from-pink-500 to-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
            🎤 Live Moderator
          </div>
        </div>

        <div className="absolute bottom-4 right-4">
          <div className="text-white text-sm opacity-75">
            <div className="font-bold">OUTLET34</div>
            <div className="text-xs">Live Shopping</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectWebcamStream;