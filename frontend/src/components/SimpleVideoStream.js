import React, { useState, useEffect } from 'react';

const SimpleVideoStream = ({ isHost = false }) => {
  const [streamMethod, setStreamMethod] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(47);

  // Gerät erkennen
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    // Viewer Count Simulation
    const interval = setInterval(() => {
      setViewerCount(prev => prev + Math.floor(Math.random() * 3) - 1);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Host Interface - Einfache Streaming-Optionen
  if (isHost) {
    return (
      <div className="video-host-control bg-black text-white rounded-lg p-6 min-h-[500px]">
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-bold text-pink-400">
            📹 Live Streaming Optionen
          </h2>
          
          <div className="space-y-4">
            
            {/* Option 1: Zoom Meeting (Empfohlen) */}
            <div className="bg-blue-600/20 border border-blue-500 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-300 mb-3">
                🎥 Option 1: Zoom Meeting (Empfohlen)
              </h3>
              
              <div className="space-y-3">
                <div className="text-sm text-gray-300 space-y-1">
                  <p><strong>Meeting-ID:</strong> 5183673726</p>
                  <p><strong>Passwort:</strong> outlet34</p>
                </div>
                
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => {
                      const zoomUrl = 'https://us02web.zoom.us/j/5183673726?pwd=UEVMNEoyREZhdEQvNVNRNTNkRDFMQT09';
                      window.open(zoomUrl, '_blank');
                      setStreamMethod('zoom');
                      setIsLive(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                  >
                    📱 Zoom öffnen & Live gehen
                  </button>
                  
                  <p className="text-xs text-gray-400">
                    Funktioniert auf allen Geräten - iPhone, Android, Desktop
                  </p>
                </div>
              </div>
            </div>

            {/* Option 2: Direkte Webcam (nur Desktop) */}
            {!isMobile && (
              <div className="bg-green-600/20 border border-green-500 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-300 mb-3">
                  💻 Option 2: Browser Webcam (Desktop)
                </h3>
                
                <button
                  onClick={() => {
                    setStreamMethod('webcam');
                    setIsLive(true);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
                >
                  🎥 Browser Webcam nutzen
                </button>
                
                <p className="text-xs text-gray-400 mt-2">
                  Direkt über Browser - nur für Desktop geeignet
                </p>
              </div>
            )}

            {/* Option 3: Externe Kamera/Handy */}
            <div className="bg-purple-600/20 border border-purple-500 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-purple-300 mb-3">
                📸 Option 3: Externe Lösung
              </h3>
              
              <button
                onClick={() => {
                  setStreamMethod('external');
                  setIsLive(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                📹 Als Live markieren
              </button>
              
              <p className="text-xs text-gray-400 mt-2">
                Nutzen Sie externe Kamera oder zweites Handy für Video
              </p>
            </div>
          </div>

          {/* Live Status */}
          {isLive && (
            <div className="bg-red-600/20 border border-red-500 rounded-lg p-4 mt-6">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-400 font-semibold">SIE SIND LIVE!</span>
              </div>
              
              <p className="text-sm text-gray-300 mb-3">
                Streaming-Methode: {streamMethod === 'zoom' ? '📱 Zoom Meeting' : 
                                   streamMethod === 'webcam' ? '💻 Browser Webcam' : 
                                   '📹 Externe Lösung'}
              </p>
              
              <div className="flex justify-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <span>👁️</span>
                  <span>{viewerCount} Zuschauer</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>🔴</span>
                  <span>LIVE</span>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setIsLive(false);
                  setStreamMethod('');
                }}
                className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                ⏹️ Stream beenden
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Customer View - Immer sichtbarer Live-Stream
  return (
    <div className="video-customer-view bg-black text-white rounded-lg overflow-hidden min-h-[500px] relative">
      
      {/* Live Stream Display für Kunden */}
      <div className="relative h-full">
        
        <div className="stream-display h-full bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
          
          <div className="text-center space-y-6 p-8">
            
            {/* Live Video Icon */}
            <div className="w-32 h-32 bg-gradient-to-br from-red-500 via-pink-500 to-purple-600 rounded-full mx-auto flex items-center justify-center text-5xl animate-pulse">
              📺
            </div>
            
            <div className="space-y-4">
              <h3 className="text-3xl font-bold">
                Live Shopping aktiv
              </h3>
              
              <p className="text-xl text-gray-300">
                Outlet34 Fashion Show
              </p>
              
              {/* Live Indicators */}
              <div className="flex justify-center space-x-8 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
                  <span className="text-red-400 font-semibold">LIVE</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-semibold">Online</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-blue-400 font-semibold">HD</span>
                </div>
              </div>
              
              {/* Current Info */}
              <div className="mt-8 p-6 bg-black/60 rounded-lg">
                <h4 className="text-lg font-semibold mb-3 text-pink-400">
                  🛍️ Jetzt live präsentiert:
                </h4>
                <div className="space-y-2 text-base">
                  <p className="text-yellow-300">✨ Fashion Collection 2024</p>
                  <p className="text-green-300">💰 Händlerpreise ab 5€</p>
                  <p className="text-blue-300">📦 Sofort verfügbar</p>
                </div>
              </div>
              
              {/* Shopping Call-to-Action */}
              <div className="mt-6 p-4 bg-gradient-to-r from-pink-600/30 to-purple-600/30 rounded-lg">
                <p className="text-lg font-semibold text-pink-300">
                  👉 Bestellen Sie während der Live-Show!
                </p>
                <p className="text-sm text-gray-300 mt-1">
                  Nutzen Sie das Bestellformular rechts →
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Overlays */}
        <div className="absolute top-4 left-4">
          <div className="bg-red-600 text-white px-4 py-2 rounded-full flex items-center">
            <div className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></div>
            <span className="font-bold">LIVE SHOPPING</span>
          </div>
        </div>

        <div className="absolute top-4 right-4">
          <div className="bg-black/70 text-white px-3 py-2 rounded-full">
            <span className="text-sm">👥 {viewerCount} live dabei</span>
          </div>
        </div>

        <div className="absolute bottom-4 left-4">
          <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-full">
            <span className="font-bold">🎤 Live Moderator</span>
          </div>
        </div>

        <div className="absolute bottom-4 right-4">
          <div className="text-white text-right">
            <div className="font-bold text-lg">OUTLET34</div>
            <div className="text-sm opacity-75">Live Shopping</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleVideoStream;