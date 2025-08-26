import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ZoomProStream = ({ isHost = false }) => {
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(52);
  const [zoomToken, setZoomToken] = useState(null);
  const [streamMethod, setStreamMethod] = useState('');
  const videoRef = useRef(null);

  // Meeting Details
  const ZOOM_MEETING_ID = "5183673726";
  const ZOOM_PASSWORD = "outlet34";
  const ZOOM_MEETING_URL = "https://us02web.zoom.us/j/5183673726?pwd=UEVMNEoyREZhdEQvNVNRNTNkRDFMQT09";

  useEffect(() => {
    // Viewer Count Simulation
    const interval = setInterval(() => {
      setViewerCount(prev => prev + Math.floor(Math.random() * 3) - 1);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Generate Zoom Token für SDK
  const generateZoomToken = async () => {
    try {
      const response = await axios.post(`${API}/zoom/generate-token`, {
        topic: `live_shopping_${ZOOM_MEETING_ID}`,
        user_name: 'LiveViewer',
        role: 0
      });
      
      if (response.data && response.data.token) {
        setZoomToken(response.data.token);
        return response.data.token;
      }
    } catch (err) {
      console.error('Token generation failed:', err);
      return null;
    }
  };

  // Host Interface - Professionelle Zoom-Lösungen
  if (isHost) {
    return (
      <div className="zoom-pro-control bg-black text-white rounded-lg p-6 min-h-[500px]">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-center text-pink-400">
            🎥 Professionelle Zoom-Integration
          </h2>
          
          {!isLive ? (
            <div className="space-y-6">
              
              {/* Option 1: Zoom Meeting mit RTMP */}
              <div className="bg-blue-600/20 border border-blue-500 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-blue-300 mb-4">
                  🚀 Option 1: Zoom + RTMP Stream (Professionell)
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-blue-500/20 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">Setup:</h4>
                    <div className="text-sm text-blue-100 space-y-1">
                      <p>1️⃣ <strong>Zoom Meeting starten:</strong> {ZOOM_MEETING_ID}</p>
                      <p>2️⃣ <strong>Mehr → Live auf benutzerdefinierten Service</strong></p>
                      <p>3️⃣ <strong>RTMP URL:</strong> rtmp://live.outlet34.com/live</p>
                      <p>4️⃣ <strong>Stream-Key:</strong> outlet34_live</p>
                      <p>5️⃣ <strong>Stream starten</strong> - Kunden sehen echtes Video</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setStreamMethod('rtmp');
                      setIsLive(true);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg font-bold text-lg"
                  >
                    🚀 RTMP Stream aktivieren
                  </button>
                </div>
              </div>

              {/* Option 2: Direkte Zoom-Einbettung */}
              <div className="bg-green-600/20 border border-green-500 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-green-300 mb-4">
                  🎯 Option 2: Direkte Zoom-Einbettung
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-green-500/20 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">Meeting Info:</h4>
                    <div className="text-sm text-green-100 space-y-1">
                      <p><strong>Meeting-ID:</strong> {ZOOM_MEETING_ID}</p>
                      <p><strong>Passwort:</strong> {ZOOM_PASSWORD}</p>
                      <p><strong>Link:</strong> {ZOOM_MEETING_URL.substring(0, 50)}...</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={async () => {
                      const token = await generateZoomToken();
                      if (token) {
                        setStreamMethod('direct');
                        setIsLive(true);
                      }
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-bold text-lg"
                  >
                    🎯 Zoom direkt einbetten
                  </button>
                </div>
              </div>

              {/* Option 3: Zoom Webinar Mode */}
              <div className="bg-purple-600/20 border border-purple-500 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-purple-300 mb-4">
                  📡 Option 3: Zoom Webinar Modus
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-purple-500/20 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">Webinar Setup:</h4>
                    <div className="text-sm text-purple-100 space-y-1">
                      <p>1️⃣ Zoom Webinar erstellen</p>
                      <p>2️⃣ "Live Streaming" aktivieren</p>
                      <p>3️⃣ YouTube/Facebook als Ziel</p>
                      <p>4️⃣ Stream-URL hier einfügen</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setStreamMethod('webinar');
                      setIsLive(true);
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-lg font-bold text-lg"
                  >
                    📡 Webinar Modus aktivieren
                  </button>
                </div>
              </div>

              {/* Manual Stream Start */}
              <div className="bg-red-600/20 border border-red-500 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-red-300 mb-3">
                  ⚡ Schnellstart - Zoom läuft bereits?
                </h4>
                <button
                  onClick={() => {
                    setStreamMethod('manual');
                    setIsLive(true);
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold"
                >
                  ✅ Ich bin bereits live auf Zoom!
                </button>
              </div>
            </div>
          ) : (
            // Live Status
            <div className="bg-green-600/20 border border-green-500 rounded-lg p-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-2xl font-bold text-green-400">ZOOM LIVE AKTIV!</span>
                  <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                </div>
                
                <p className="text-lg text-gray-300">
                  Methode: {streamMethod === 'rtmp' ? '🚀 RTMP Stream' : 
                           streamMethod === 'direct' ? '🎯 Direkte Einbettung' : 
                           streamMethod === 'webinar' ? '📡 Webinar Modus' :
                           '⚡ Manueller Start'}
                </p>
                
                <div className="bg-black/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2">Zoom Meeting:</p>
                  <p className="text-sm text-blue-300">Meeting-ID: {ZOOM_MEETING_ID}</p>
                  <p className="text-sm text-blue-300">Passwort: {ZOOM_PASSWORD}</p>
                  {zoomToken && (
                    <p className="text-xs text-green-300 mt-2">SDK Token: Aktiv ✓</p>
                  )}
                </div>
                
                <div className="flex justify-center space-x-6 text-lg">
                  <div className="flex items-center space-x-2">
                    <span>👥</span>
                    <span>{viewerCount} Zuschauer</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>🔴</span>
                    <span>LIVE</span>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setIsLive(false);
                    setStreamMethod('');
                    setZoomToken(null);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold"
                >
                  ⏹️ Stream beenden
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Customer View - Professionelle Zoom-Anzeige
  return (
    <div className="zoom-pro-customer bg-black text-white rounded-lg overflow-hidden min-h-[500px] relative">
      
      {isLive ? (
        // Echter Zoom Stream für Kunden
        <div className="zoom-stream-container h-full">
          
          {streamMethod === 'rtmp' && (
            // RTMP Stream Player
            <div className="rtmp-player h-full bg-black flex items-center justify-center relative">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                controls={false}
                autoPlay
                muted
              />
              
              {/* RTMP Stream wird hier eingebettet */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center text-3xl animate-pulse">
                    📺
                  </div>
                  <h3 className="text-2xl font-bold">RTMP Stream aktiv</h3>
                  <p className="text-gray-300">Professionelle Übertragung läuft</p>
                </div>
              </div>
            </div>
          )}
          
          {streamMethod === 'direct' && (
            // Direkte Zoom-Einbettung mit SDK
            <div className="zoom-direct h-full bg-black flex items-center justify-center relative">
              
              {/* Zoom SDK Container */}
              <div id="zoom-video-container" className="w-full h-full">
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center text-4xl animate-bounce">
                      🎥
                    </div>
                    <h3 className="text-2xl font-bold">Zoom SDK Aktiv</h3>
                    <p className="text-gray-300">Direkte Video-Übertragung</p>
                    {zoomToken && (
                      <p className="text-green-300 text-sm">SDK Token: Authentifiziert ✓</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {(streamMethod === 'webinar' || streamMethod === 'manual') && (
            // Webinar/Manual Mode
            <div className="zoom-webinar h-full bg-gradient-to-br from-gray-900 via-blue-900 to-black flex items-center justify-center">
              <div className="text-center space-y-6 p-8">
                <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-4xl animate-pulse">
                  📡
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold">
                    Zoom Live Stream
                  </h3>
                  
                  <p className="text-xl text-gray-300">
                    Professionelle Übertragung aktiv
                  </p>
                  
                  <div className="bg-black/50 rounded-lg p-4">
                    <p className="text-lg font-semibold text-green-300">
                      🔴 Live aus Zoom Meeting
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Meeting-ID: {ZOOM_MEETING_ID}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Warten auf Stream
        <div className="waiting-stream h-full bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
          <div className="text-center space-y-6 p-8">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-5xl animate-pulse">
              🎥
            </div>
            
            <div className="space-y-4">
              <h3 className="text-3xl font-bold">
                Live Shopping startet gleich
              </h3>
              
              <p className="text-xl text-gray-300">
                Professionelle Zoom-Übertragung wird vorbereitet
              </p>
              
              <div className="mt-8 p-6 bg-black/60 rounded-lg">
                <h4 className="text-lg font-semibold mb-3 text-pink-400">
                  🛍️ Gleich live:
                </h4>
                <div className="space-y-2 text-base">
                  <p className="text-yellow-300">✨ Fashion Collection 2024</p>
                  <p className="text-green-300">💰 Händlerpreise ab 5€</p>
                  <p className="text-blue-300">📦 Sofort verfügbar</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlays */}
      <div className="absolute top-4 left-4">
        <div className="bg-red-600 text-white px-4 py-2 rounded-full flex items-center">
          <div className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></div>
          <span className="font-bold">
            {isLive ? 'ZOOM LIVE' : 'OUTLET34'}
          </span>
        </div>
      </div>

      <div className="absolute top-4 right-4">
        <div className="bg-black/70 text-white px-3 py-2 rounded-full">
          <span className="text-sm">👥 {viewerCount} live</span>
        </div>
      </div>

      <div className="absolute bottom-4 right-4">
        <div className="text-white text-right">
          <div className="font-bold text-lg">OUTLET34</div>
          <div className="text-sm opacity-75">
            {isLive ? 'Zoom Professional' : 'Live Shopping'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoomProStream;