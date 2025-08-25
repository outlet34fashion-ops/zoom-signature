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
  const [videoLoading, setVideoLoading] = useState(false);
  
  // Ihre Zoom Meeting Details
  const ZOOM_MEETING_ID = "5183673726";
  const ZOOM_PASSWORD = "outlet34";
  const ZOOM_HOST_URL = `https://us02web.zoom.us/j/${ZOOM_MEETING_ID}?pwd=UEVMNEoyREZhdEQvNVNRNTNkRDFMQT09`;
  
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

  // Kunde startet eingebettetes Video - DIREKT IN DER APP
  const startEmbeddedVideo = () => {
    setVideoLoading(true);
    setShowVideo(true);
    // Kleine Verzögerung für Loading-Animation
    setTimeout(() => {
      setVideoLoading(false);
    }, 2000);
  };

  // Kunde sieht eingebettetes Live-Video - ALLES IN EINER APP
  const renderCustomerLiveStream = () => {
    return (
      <div className="live-studio-view">
        {/* Hauptbereich - Eingebettetes Video DIREKT in der App */}
        <div className="studio-main-area relative">
          
          {/* Live Stream Container - Hochformat eingebettet */}
          <div className="live-stream-container relative bg-gradient-to-b from-gray-900 to-black rounded-lg overflow-hidden">
            
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

            {/* Video-Bereich - DIREKT EINGEBETTET */}
            <div className="portrait-video-container" style={{ minHeight: '600px', aspectRatio: '9/16' }}>
              
              {!showVideo ? (
                // Bevor Video startet - Bereit-Meldung
                <div className="video-ready-area text-center space-y-6 p-8 flex flex-col justify-center h-full">
                  <div className="space-y-4">
                    <div className="text-6xl mb-4">🎬</div>
                    <h3 className="text-2xl font-bold text-white">Live Shopping bereit!</h3>
                    <p className="text-gray-300">
                      Der Moderator ist live. Video direkt hier ansehen - ohne neue Fenster!
                    </p>
                  </div>

                  <button 
                    onClick={startEmbeddedVideo}
                    className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white px-8 py-4 rounded-lg text-xl font-semibold transform transition hover:scale-105 shadow-2xl mx-auto"
                  >
                    🎥 Video hier starten
                  </button>

                  <div className="text-sm text-gray-400 space-y-2">
                    <p>✅ Bleibt in dieser App</p>
                    <p>✅ Kein neues Fenster</p>
                    <p>✅ HD-Qualität eingebettet</p>
                  </div>
                </div>
              ) : videoLoading ? (
                // Loading Animation
                <div className="video-loading text-center space-y-4 p-8 flex flex-col justify-center h-full">
                  <div className="text-4xl mb-4 animate-pulse">📺</div>
                  <h3 className="text-xl font-bold text-white">Video lädt...</h3>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
                  <p className="text-gray-300">Stream wird eingebettet...</p>
                </div>
              ) : (
                // EINGEBETTETES ZOOM VIDEO - DIREKT IN DER APP
                <div className="embedded-zoom-video w-full h-full relative">
                  <iframe
                    src={`https://us02web.zoom.us/wc/join/${ZOOM_MEETING_ID}?pwd=${ZOOM_PASSWORD}&uname=Zuschauer_${Date.now()}&meeting_result=success`}
                    style={{
                      width: '100%',
                      height: '600px',
                      border: 'none',
                      borderRadius: '12px'
                    }}
                    allow="microphone; camera; display-capture; autoplay"
                    title="OUTLET34 Live Shopping - Eingebettet"
                    className="zoom-embedded-iframe"
                  />
                  
                  {/* Overlay-Controls für eingebettetes Video */}
                  <div className="video-overlay-controls absolute bottom-4 right-4 space-y-2">
                    <button 
                      onClick={() => setShowVideo(false)}
                      className="bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm hover:bg-opacity-90"
                    >
                      ↻ Neu laden
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Studio-Light Effects */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="studio-lights-top absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-orange-200 via-transparent to-transparent opacity-10"></div>
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
                  <span className="text-sm font-medium">LIVE EINGEBETTET</span>
                </div>
                <div className="text-sm opacity-75">|</div>
                <div className="text-sm">
                  <span className="opacity-75">Direkt in der App</span> 
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold text-green-400">EINGEBETTET</div>
                <div className="opacity-75">Kein neues Fenster</div>
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

        <div className="bg-green-50 p-4 rounded-lg text-left text-sm text-green-800">
          <h4 className="font-semibold mb-2">✅ Eingebettete Video-Lösung:</h4>
          <div className="space-y-1">
            <p>1. Sie gehen mit Handy live (Meeting-ID: <strong>{ZOOM_MEETING_ID}</strong>)</p>
            <p>2. Kunden klicken "Video hier starten"</p>
            <p>3. Video wird <strong>direkt in der App</strong> eingebettet</p>
            <p>4. <strong>Kein neues Fenster</strong> - alles bleibt in einer App!</p>
            <p>5. Kunden können gleichzeitig shoppen und Video schauen</p>
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
              /* Kunde sieht eingebettetes Live-Video */
              renderCustomerLiveStream()
            )}
          </div>
        </div>
      </div>

      {/* Customer Experience Info - Nur bei Kundensicht */}
      {!isHost && (
        <div className="mt-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
          <div className="p-4">
            <h4 className="font-semibold mb-3 text-gray-800 flex items-center">
              📺 Eingebettetes Live-Video
            </h4>
            <div className="text-sm text-gray-700 space-y-2">
              <p>✅ <strong>Bleibt in dieser App</strong> - Kein neues Fenster öffnet sich</p>
              <p>✅ <strong>Direktes HD-Video</strong> - Moderator live eingebettet sehen</p>
              <p>✅ <strong>Alles in einem</strong> - Video + Shopping + Chat zusammen</p>
              <p>🛍️ <strong>Parallel shoppen</strong> - Während Video läuft bestellen!</p>
            </div>
          </div>
        </div>
      )}

      {/* Admin Studio Info - Nur bei Admin-Sicht */}
      {isHost && (
        <div className="mt-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
          <div className="p-4">
            <h4 className="font-semibold mb-3 text-purple-800">🎬 Eingebettete Live-Stream Lösung</h4>
            <div className="text-sm text-purple-700 space-y-2">
              <p><strong>Moderator (Sie):</strong> Live über Handy mit Video + Audio</p>
              <p><strong>Kunden:</strong> Sehen Video direkt eingebettet in der App</p>
              <p><strong>Vorteil:</strong> Alles in einer App - kein Fenster-Wechsel</p>
              <p><strong>Shopping:</strong> Kunden können parallel Video + Shopping nutzen</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZoomLiveStream;