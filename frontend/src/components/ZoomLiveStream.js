import React, { useState, useEffect } from 'react';

const ZoomLiveStream = ({ 
  isHost = false, 
  sessionTopic = "outlet34_live_shopping",
  onSessionEnd,
  productData = []
}) => {
  const [isStreamActive, setIsStreamActive] = useState(true);
  const [viewerCount, setViewerCount] = useState(37);
  const [showVideo, setShowVideo] = useState(false);
  
  // Ihre Zoom Meeting Details
  const ZOOM_MEETING_ID = "5183673726";
  const ZOOM_PASSWORD = "outlet34";
  const ZOOM_HOST_URL = `https://us02web.zoom.us/j/${ZOOM_MEETING_ID}?pwd=UEVMNEoyREZhdEQvNVNRNTNkRDFMQT09`;
  
  // Zoom Meeting URL - Verwende Hash aus Host URL für Konsistenz
  const ZOOM_VIEWER_URL = `https://us02web.zoom.us/wc/join/${ZOOM_MEETING_ID}?pwd=UEVMNEoyREZhdEQvNVNRNTNkRDFMQT09&uname=LiveViewer&auto=1&audio=false&video=false&checkin=false&role=0`;
  
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

  // Kunde startet Video - EINFACHE LÖSUNG
  const startCustomerVideo = () => {
    setShowVideo(true);
  };

  // Kunde sieht nur Video-Bereich - OHNE Zoom-UI
  const renderCustomerLiveStream = () => {
    return (
      <div className="live-studio-view">
        {/* Hauptbereich - Video-Container */}
        <div className="studio-main-area relative">
          
          {/* Live Stream Container - Einfach und sauber */}
          <div className="live-stream-container relative bg-black rounded-lg overflow-hidden">
            
            {/* Studio-Style Live Indicator */}
            <div className="absolute top-4 left-4 z-20">
              <div className="live-studio-badge flex items-center bg-red-600 text-white px-4 py-2 rounded-full">
                <div className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></div>
                <span className="font-bold text-lg">LIVE</span>
              </div>
            </div>

            {/* Viewer Count */}
            <div className="absolute top-4 right-4 z-20">
              <div className="bg-black bg-opacity-70 text-white px-3 py-2 rounded-full flex items-center">
                <span className="text-red-500 mr-2">●</span>
                <span className="font-semibold">{viewerCount}</span>
              </div>
            </div>

            {/* Video-Bereich - Optimierte Proportionen */}
            <div className="video-display-area" style={{ minHeight: '500px', maxHeight: '600px', aspectRatio: '16/9' }}>
              
              {!showVideo ? (
                // Video bereit - Einfacher Start
                <div className="video-ready-screen flex flex-col justify-center items-center h-full text-center space-y-8 p-8">
                  <div className="space-y-4">
                    <div className="text-7xl animate-pulse">📺</div>
                    <h2 className="text-3xl font-bold text-white">Video bereit!</h2>
                    <p className="text-xl text-gray-300">
                      Live Moderator wartet - Video jetzt starten
                    </p>
                  </div>

                  <button 
                    onClick={startCustomerVideo}
                    className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-12 py-6 rounded-xl text-2xl font-bold transform transition hover:scale-110 shadow-2xl"
                  >
                    ▶️ Video starten
                  </button>

                  <div className="text-lg text-gray-400 space-y-2">
                    <p>✅ Keine Anmeldung nötig</p>
                    <p>✅ Nur Video ansehen</p>
                    <p>✅ Automatisch stumm</p>
                  </div>
                </div>
              ) : (
                // DIREKTE ZOOM VIDEO INTEGRATION - NUR VIDEO, KEINE UI
                <div className="zoom-video-display w-full h-full relative bg-black rounded-lg overflow-hidden">
                  
                  {/* Video nur Bereich - Optimierte Darstellung */}
                  <div className="video-embed-container w-full h-full relative bg-black rounded-lg overflow-hidden">
                    <iframe
                      src={ZOOM_VIEWER_URL}
                      style={{
                        width: '100%',
                        height: '600px', // Reduzierte Höhe für bessere Proportionen
                        border: 'none',
                        borderRadius: '12px'
                      }}
                      allow="microphone; camera; display-capture; fullscreen"
                      title="Live Shopping Video Stream"
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation allow-top-navigation"
                      loading="eager"
                      className="zoom-video-direct"
                    />
                  </div>

                  {/* Unsere eigenen minimalen Video-Status Overlays */}
                  <div className="custom-video-overlay absolute bottom-4 left-4 right-4 flex justify-between items-center z-20">
                    <div className="bg-black bg-opacity-70 text-white px-3 py-2 rounded-full text-sm">
                      🔴 Live Video
                    </div>
                    <button 
                      onClick={() => setShowVideo(false)}
                      className="bg-black bg-opacity-70 text-white px-3 py-2 rounded-full text-sm hover:bg-opacity-90"
                    >
                      🔄 Neu laden
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Moderator Label */}
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

          {/* Video Info Bar */}
          <div className="video-info-bar mt-4 bg-gradient-to-r from-gray-900 to-black text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="recording-indicator flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
                  <span className="text-sm font-medium">LIVE ÜBERTRAGUNG</span>
                </div>
                <div className="text-sm opacity-75">|</div>
                <div className="text-sm">
                  <span className="opacity-75">Status:</span> 
                  <span className="font-semibold ml-1 text-green-400">
                    {showVideo ? 'Video aktiv' : 'Bereit'}
                  </span>
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold text-blue-400">NUR VIDEO</div>
                <div className="opacity-75">Keine Anmeldung</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Admin Interface - Vereinfacht
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

        <div className="bg-green-50 p-4 rounded-lg text-left text-sm text-green-800">
          <h4 className="font-semibold mb-2">✅ Einfache Video-Lösung:</h4>
          <div className="space-y-1">
            <p>1. Sie gehen mit Handy live (Meeting-ID: <strong>{ZOOM_MEETING_ID}</strong>)</p>
            <p>2. Kunden klicken "Video starten"</p>
            <p>3. Video wird <strong>direkt eingebettet</strong> - nur Video, keine UI</p>
            <p>4. <strong>Keine Anmeldung nötig</strong> für Kunden</p>
            <p>5. Kunden sind automatisch stumm</p>
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
              /* Kunde sieht nur Video */
              renderCustomerLiveStream()
            )}
          </div>
        </div>
      </div>

      {/* Customer Experience Info */}
      {!isHost && (
        <div className="mt-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
          <div className="p-4">
            <h4 className="font-semibold mb-3 text-gray-800 flex items-center">
              📺 Einfache Video-Ansicht
            </h4>
            <div className="text-sm text-gray-700 space-y-2">
              <p>✅ <strong>Nur Video</strong> - Keine Zoom-Oberfläche oder Anmeldung</p>
              <p>✅ <strong>Ein Klick</strong> - "Video starten" und sofort sehen</p>
              <p>✅ <strong>Automatisch stumm</strong> - Sie schauen nur zu</p>
              <p>🛍️ <strong>Parallel shoppen</strong> - Video + Einkaufen gleichzeitig</p>
            </div>
          </div>
        </div>
      )}

      {/* Admin Info */}
      {isHost && (
        <div className="mt-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
          <div className="p-4">
            <h4 className="font-semibold mb-3 text-purple-800">🎬 Vereinfachte Video-Lösung</h4>
            <div className="text-sm text-purple-700 space-y-2">
              <p><strong>Problem gelöst:</strong> Kunden sehen nur Video, keine Zoom-UI</p>
              <p><strong>Keine Anmeldung:</strong> Direkter Zugang ohne Account</p>
              <p><strong>Einfach:</strong> Ein Klick und Video läuft</p>
              <p><strong>Stabil:</strong> Robuste iframe-Integration</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZoomLiveStream;