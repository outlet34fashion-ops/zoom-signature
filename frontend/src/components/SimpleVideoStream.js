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
            
            {/* Option 1: Zoom Meeting - EINFACH */}
            <div className="bg-blue-600/20 border border-blue-500 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-blue-300 mb-4">
                🎥 Live Shopping starten
              </h3>
              
              <div className="space-y-4">
                
                {/* Einfache Anweisungen */}
                <div className="bg-blue-500/30 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">So geht's:</h4>
                  <div className="text-sm text-blue-100 space-y-1">
                    <p>1️⃣ Öffnen Sie Zoom auf Ihrem Handy</p>
                    <p>2️⃣ "An Meeting teilnehmen" wählen</p>
                    <p>3️⃣ Meeting-ID eingeben: <strong className="text-yellow-300">5183673726</strong></p>
                    <p>4️⃣ Passwort eingeben: <strong className="text-yellow-300">outlet34</strong></p>
                    <p>5️⃣ Hier klicken: "Ich bin jetzt live"</p>
                  </div>
                </div>
                
                {/* Zoom App Link */}
                <a 
                  href="zoomus://zoom.us/join?confno=5183673726&pwd=outlet34"
                  className="block bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg font-bold text-center text-lg"
                >
                  📱 Zoom App öffnen
                </a>
                
                {/* Fallback Link */}
                <a 
                  href="https://us02web.zoom.us/j/5183673726?pwd=UEVMNEoyREZhdEQvNVNRNTNkRDFMQT09"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold text-center"
                >
                  🌐 Zoom im Browser öffnen
                </a>
                
                {/* Manual Live Button */}
                <button
                  onClick={() => {
                    setStreamMethod('zoom-manual');
                    setIsLive(true);
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-bold text-lg"
                >
                  ✅ Ich bin jetzt live auf Zoom!
                </button>
              </div>
            </div>

            {/* Hilfe-Sektion */}
            <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-300 mb-3">
                💡 Hilfe & Tipps
              </h3>
              
              <div className="text-sm text-gray-300 space-y-2">
                <p><strong>Problem mit Zoom?</strong></p>
                <p>• Stellen Sie sicher, dass Zoom App installiert ist</p>
                <p>• Bei iPhone: Safari → Einstellungen → Apps → Zoom erlauben</p>
                <p>• Manuelle Eingabe: Meeting-ID <strong className="text-blue-300">5183673726</strong></p>
                <p>• Passwort: <strong className="text-blue-300">outlet34</strong></p>
              </div>
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
        
        {/* ECHTES ZOOM VIDEO für Kunden */}
        <div className="stream-display h-full bg-black flex items-center justify-center relative">
          
          {/* Zoom Video Iframe - ECHTES VIDEO */}
          <iframe
            src="https://us02web.zoom.us/wc/join/5183673726?pwd=b3V0bGV0MzQ=&uname=LiveViewer&tk=&audio=false&video=false&auto=1"
            style={{
              width: '100%',
              height: '500px',
              border: 'none',
              borderRadius: '12px'
            }}
            allow="microphone; camera; display-capture; fullscreen; autoplay"
            title="Live Shopping Video - Zoom Stream" 
            loading="eager"
            className="zoom-customer-video"
          />
          
          {/* Fallback falls Video nicht lädt */}
          <div className="fallback-display absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center" style={{zIndex: '-1'}}>
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-purple-600 rounded-full mx-auto flex items-center justify-center text-4xl animate-pulse">
                📺
              </div>
              <h3 className="text-2xl font-bold text-white">Live Stream lädt...</h3>
              <p className="text-gray-300">Moderator ist live auf Zoom</p>
              <div className="flex justify-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-400">LIVE</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400">Verbunden</span>
                </div>
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