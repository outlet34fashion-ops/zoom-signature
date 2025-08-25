import React, { useState, useEffect } from 'react';

const ZoomLiveStream = ({ 
  isHost = false, 
  sessionTopic = "outlet34_live_shopping",
  onSessionEnd,
  productData = []
}) => {
  const [isStreamActive, setIsStreamActive] = useState(true); // Always show as active for customers
  const [viewerCount, setViewerCount] = useState(37);
  
  // Ihre Zoom Meeting Details
  const ZOOM_MEETING_ID = "5183673726";
  const ZOOM_PASSWORD = "outlet34";
  const ZOOM_HOST_URL = `https://us02web.zoom.us/j/${ZOOM_MEETING_ID}?pwd=UEVMNEoyREZhdEQvNVNRNTNkRDFLQT09`;
  
  // Simuliere Live-Status Updates
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount(prev => prev + Math.floor(Math.random() * 3) - 1);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Admin startet Zoom als Host über separates Handy
  const startHostStream = () => {
    window.open(ZOOM_HOST_URL, '_blank', 'width=1200,height=800');
    setIsStreamActive(true);
  };

  // Kunde sieht nur Hochformat Live-Stream (wie Bild 3)
  const renderCustomerLiveStream = () => {
    return (
      <div className="live-studio-view">
        {/* Hauptbereich - Hochformat Live Stream */}
        <div className="studio-main-area relative">
          
          {/* Live Stream Container - Hochformat wie Studio-Kamera */}
          <div className="live-stream-container relative bg-black rounded-lg overflow-hidden">
            
            {/* Studio-Style Live Indicator */}
            <div className="absolute top-4 left-4 z-20">
              <div className="live-studio-badge flex items-center bg-red-600 text-white px-4 py-2 rounded-full">
                <div className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></div>
                <span className="font-bold text-lg">LIVE</span>
              </div>
            </div>

            {/* Viewer Count - Studio Style */}
            <div className="absolute top-4 right-4 z-20">
              <div className="bg-black bg-opacity-70 text-white px-3 py-2 rounded-full flex items-center">
                <span className="text-red-500 mr-2">●</span>
                <span className="font-semibold">{viewerCount}</span>
              </div>
            </div>

            {/* Hochformat Video Stream - Wie Studio Kamera */}
            <div className="portrait-video-container">
              <iframe
                src={`https://us02web.zoom.us/wc/join/${ZOOM_MEETING_ID}?pwd=${ZOOM_PASSWORD}&uname=Zuschauer_${Date.now()}&meeting_result=success&disable_video=1&disable_audio=1&viewer_mode=1`}
                style={{
                  width: '100%',
                  height: '70vh', // Hochformat wie Handy-Stream
                  minHeight: '600px',
                  border: 'none',
                  borderRadius: '12px',
                  aspectRatio: '9/16' // Hochformat-Verhältnis
                }}
                allow="display-capture"
                title="OUTLET34 Live Shopping Studio"
                className="studio-stream"
              />
            </div>

            {/* Studio-Light Effects */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="studio-lights-top absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-orange-200 via-transparent to-transparent opacity-20"></div>
              <div className="studio-lights-bottom absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-orange-200 via-transparent to-transparent opacity-20"></div>
            </div>

            {/* Moderator Label - Fixiert */}
            <div className="absolute bottom-6 left-6 z-20">
              <div className="moderator-label bg-gradient-to-r from-pink-500 to-red-500 text-white px-4 py-2 rounded-full">
                <span className="font-bold">🎤 Live Moderator</span>
              </div>
            </div>

            {/* Studio Branding */}
            <div className="absolute bottom-6 right-6 z-20">
              <div className="studio-brand text-white text-sm opacity-75">
                <span className="font-bold">OUTLET34</span>
                <br />
                <span className="text-xs">Live Shopping</span>
              </div>
            </div>
          </div>

          {/* Studio Info Bar - Unter dem Video */}
          <div className="studio-info-bar mt-4 bg-gradient-to-r from-gray-900 to-black text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="recording-indicator flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
                  <span className="text-sm font-medium">LIVE AUFNAHME</span>
                </div>
                <div className="text-sm opacity-75">|</div>
                <div className="text-sm">
                  <span className="opacity-75">Studio:</span> 
                  <span className="font-semibold ml-1">OUTLET34</span>
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold text-green-400">HD QUALITÄT</div>
                <div className="opacity-75">Professioneller Stream</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Admin Interface - Einfach und fokussiert
  const renderAdminInterface = () => {
    return (
      <div className="admin-studio-control text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-pink-400">
            🎥 Live Studio Kontrolle
          </h2>
          <p className="text-gray-300">
            Starten Sie Ihr Live Shopping über Ihr Handy
          </p>
        </div>

        <div className="bg-gradient-to-r from-gray-900 to-black p-6 rounded-lg max-w-md mx-auto space-y-4 border border-pink-500">
          <div className="text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Meeting-ID:</span>
              <p className="text-white font-mono text-lg">{ZOOM_MEETING_ID}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Passwort:</span>
              <p className="text-white font-mono text-sm">outlet34</p>
            </div>
          </div>
          
          <div className="border-t border-gray-700 pt-4">
            <button 
              onClick={startHostStream}
              className="w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white py-4 px-4 rounded-lg text-lg font-semibold transform transition hover:scale-105"
            >
              📱 Mit Handy live gehen
            </button>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg text-left text-sm text-blue-800">
          <h4 className="font-semibold mb-2">📱 Handy Live-Stream Anleitung:</h4>
          <div className="space-y-1">
            <p>1. Zoom App auf Ihrem Handy öffnen</p>
            <p>2. Meeting-ID eingeben: <strong>{ZOOM_MEETING_ID}</strong></p>
            <p>3. Als Host anmelden mit Passwort: <strong>outlet34</strong></p>
            <p>4. Video und Audio einschalten</p>
            <p>5. Handy hochkant halten für optimale Darstellung</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="zoom-live-stream studio-environment">
      <div className="bg-black text-white rounded-lg overflow-hidden relative">
        <div className="p-6 min-h-[500px] relative">
          
          {/* Main Content Area */}
          <div className="studio-content relative h-full">
            
            {isHost ? (
              /* Admin sieht Studio-Kontrolle */
              renderAdminInterface()
            ) : (
              /* Kunde sieht Hochformat Live-Stream */
              renderCustomerLiveStream()
            )}
          </div>
        </div>
      </div>

      {/* Customer Experience Info - Nur bei Kundensicht */}
      {!isHost && (
        <div className="mt-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
          <div className="p-4">
            <h4 className="font-semibold mb-3 text-gray-800 flex items-center">
              🎬 Live Shopping Studio Erlebnis
            </h4>
            <div className="text-sm text-gray-700 space-y-2">
              <p>✅ <strong>Direkter HD Live-Stream</strong> - Hochformat wie TV-Studio</p>
              <p>✅ <strong>Professionelle Moderation</strong> - Echter Live-Moderator</p>
              <p>✅ <strong>Automatische Teilnahme</strong> - Sie sind stumm geschaltet (optimal zum Zuschauen)</p>
              <p>🛍️ <strong>Live Shopping</strong> - Produkte direkt während des Streams bestellen!</p>
            </div>
          </div>
        </div>
      )}

      {/* Admin Studio Info - Nur bei Admin-Sicht */}
      {isHost && (
        <div className="mt-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
          <div className="p-4">
            <h4 className="font-semibold mb-3 text-purple-800">🎬 Studio Setup Übersicht</h4>
            <div className="text-sm text-purple-700 space-y-2">
              <p><strong>Moderator (Sie):</strong> Live über Handy mit Video + Audio</p>
              <p><strong>Kunden:</strong> Sehen nur Hochformat-Stream, stumm geschaltet</p>
              <p><strong>Darstellung:</strong> Studio-Kamera Optik wie professioneller TV-Stream</p>
              <p><strong>Handy-Position:</strong> Hochkant halten für beste Darstellung</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZoomLiveStream;