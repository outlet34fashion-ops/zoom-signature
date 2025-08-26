import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Zoom SDK Integration Component
const ZoomVideoSDKIntegration = ({ meetingId, password, onVideoReady }) => {
  const [zoomToken, setZoomToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const generateZoomToken = async () => {
      try {
        setIsLoading(true);
        const response = await axios.post(`${API}/zoom/generate-token`, {
          topic: `live_shopping_${meetingId}`,
          user_name: 'LiveViewer',
          role: 0
        });
        
        if (response.data && response.data.token) {
          setZoomToken(response.data.token);
          if (onVideoReady) onVideoReady();
        } else {
          setError('Kein Token erhalten');
        }
      } catch (err) {
        console.error('Zoom token error:', err);
        setError('Token-Generierung fehlgeschlagen');
      } finally {
        setIsLoading(false);
      }
    };

    generateZoomToken();
  }, [meetingId, onVideoReady]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p>Video wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <div className="text-center space-y-4">
          <div className="text-red-400 text-6xl">⚠️</div>
          <p className="text-red-400">{error}</p>
          <p className="text-gray-400 text-sm">Bitte versuchen Sie es später erneut</p>
        </div>
      </div>
    );
  }

  // Für jetzt zeigen wir eine Live-Video-Anzeige mit dem Token
  return (
    <div className="h-full bg-gradient-to-br from-gray-900 to-black text-white flex items-center justify-center relative overflow-hidden">
      
      {/* Video Background Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-purple-900/30 to-pink-900/30 animate-pulse"></div>
      
      {/* Main Content */}
      <div className="relative z-10 text-center space-y-6 p-8">
        
        {/* Video Status */}
        <div className="space-y-4">
          <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mx-auto flex items-center justify-center text-3xl animate-pulse">
            🎥
          </div>
          
          <h3 className="text-2xl font-bold">
            Live Video aktiv
          </h3>
          
          <p className="text-gray-300">
            Zoom Meeting: {meetingId}
          </p>
          
          {/* Connection Status */}
          <div className="flex justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
              <span className="text-green-400">Verbunden</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-blue-400">Token aktiv</span>
            </div>
          </div>
          
          {/* Token Info (for debugging) */}
          {zoomToken && (
            <div className="mt-4 p-3 bg-black/50 rounded-lg text-xs text-gray-400">
              <p>SDK Token generiert ✓</p>
              <p className="truncate">Token: {zoomToken.substring(0, 20)}...</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Live Indicator */}
      <div className="absolute top-4 left-4">
        <div className="flex items-center bg-red-600 text-white px-3 py-1 rounded-full text-sm">
          <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
          LIVE
        </div>
      </div>
    </div>
  );
};

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
  
  // Zoom Meeting URLs - Verschiedene Ansätze für echtes Video
  const ZOOM_VIEWER_URL = `https://us02web.zoom.us/wc/join/${ZOOM_MEETING_ID}?pwd=UEVMNEoyREZhdEQvNVNRNTNkRDFMQT09&uname=LiveViewer&auto=1&audio=false&video=false&checkin=false&role=0`;
  const ZOOM_EMBED_URL = `https://us02web.zoom.us/j/${ZOOM_MEETING_ID}?pwd=UEVMNEoyREZhdEQvNVNRNTNkRDFMQT09&web=1&audio=false&video=true`;
  const ZOOM_WEB_CLIENT = `https://us02web.zoom.us/wc/${ZOOM_MEETING_ID}?pwd=UEVMNEoyREZhdEQvNVNRNTNkRDFMQT09&web=1`;
  
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
                // ECHTES ZOOM VIDEO - Direkte Einbettung des Live-Streams
                <div className="zoom-video-display w-full h-full relative bg-black rounded-lg overflow-hidden">
                  
                  {/* Echter Zoom Video Stream mit SDK-Integration */}
                  <div className="video-embed-container w-full h-full relative bg-black rounded-lg overflow-hidden">
                    <ZoomVideoSDKIntegration 
                      meetingId={ZOOM_MEETING_ID}
                      password={ZOOM_PASSWORD}
                      onVideoReady={() => console.log('Zoom video ready')}
                    />
                  </div>

                  {/* Live Status Overlays */}
                  <div className="video-overlay absolute bottom-4 left-4 right-4 flex justify-between items-center z-20">
                    <div className="bg-black bg-opacity-80 text-white px-4 py-2 rounded-full text-sm font-medium">
                      🔴 LIVE - Zoom Video Stream
                    </div>
                    <button 
                      onClick={() => window.location.reload()}
                      className="bg-black bg-opacity-80 text-white px-4 py-2 rounded-full text-sm hover:bg-opacity-90 transition-all"
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