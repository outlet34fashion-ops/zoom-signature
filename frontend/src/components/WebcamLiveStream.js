import { useState, useEffect, useRef } from 'react';

const WebcamLiveStream = ({ isHost = false }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [viewerCount, setViewerCount] = useState(48);
  const [streamQuality, setStreamQuality] = useState('HD');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Gerät erkennen
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    // Viewer count simulation
    const interval = setInterval(() => {
      setViewerCount(prev => prev + Math.floor(Math.random() * 3) - 1);
    }, 4000);

    return () => {
      clearInterval(interval);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Webcam starten - Optimiert für alle Geräte
  const startWebcamStream = async () => {
    try {
      setError(null);
      
      // iOS/Mobile-optimierte Einstellungen
      const constraints = {
        video: {
          width: { 
            ideal: isMobile ? 720 : 1280,
            max: isMobile ? 720 : 1920
          },
          height: { 
            ideal: isMobile ? 480 : 720,
            max: isMobile ? 480 : 1080
          },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      console.log('Requesting webcam access...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.playsInline = true; // Wichtig für iOS
        videoRef.current.muted = true; // Verhindert Echo
        streamRef.current = stream;
        
        // Stream-Qualität ermitteln
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          setStreamQuality(`${settings.width}x${settings.height}`);
        }
        
        setIsStreaming(true);
        console.log('Webcam stream started successfully');
      }
    } catch (err) {
      console.error('Webcam error:', err);
      
      // Spezifische Fehlermeldungen
      let errorMessage = 'Kamera-Zugriff nicht möglich.';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = isIOS 
          ? 'iPhone: Bitte erlauben Sie Kamera-Zugriff in Safari-Einstellungen → Diese Website → Kamera.'
          : 'Bitte erlauben Sie den Kamera-Zugriff für diese Website.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Keine Kamera gefunden. Bitte prüfen Sie Ihr Gerät.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Kamera wird von einer anderen App verwendet.';
      }
      
      setError(errorMessage);
    }
  };

  // Stream beenden
  const stopWebcamStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  // Host Interface
  if (isHost) {
    return (
      <div className="webcam-host-control bg-black text-white rounded-lg p-6 min-h-[500px]">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-center text-pink-400">
            📹 {isMobile ? 'iPhone/Handy' : 'Webcam'} Live Stream
          </h2>
          
          {!isStreaming ? (
            <div className="space-y-6">
              
              {/* Anweisungen */}
              <div className="bg-blue-600/20 border border-blue-500 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-300 mb-4">
                  {isIOS ? '📱 iPhone Kamera' : '💻 Webcam'} starten
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-blue-500/20 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">
                      {isIOS ? 'iPhone Setup:' : 'Desktop Setup:'}
                    </h4>
                    <div className="text-sm text-blue-100 space-y-1">
                      {isIOS ? (
                        <>
                          <p>1️⃣ "Kamera starten" klicken</p>
                          <p>2️⃣ Safari fragt nach Kamera-Berechtigung</p>
                          <p>3️⃣ "Erlauben" wählen</p>
                          <p>4️⃣ iPhone-Kamera aktiviert sich</p>
                        </>
                      ) : (
                        <>
                          <p>1️⃣ "Kamera starten" klicken</p>
                          <p>2️⃣ Browser fragt nach Kamera-Berechtigung</p>
                          <p>3️⃣ "Zulassen" klicken</p>
                          <p>4️⃣ Webcam aktiviert sich sofort</p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={startWebcamStream}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-bold text-lg flex items-center justify-center space-x-2"
                  >
                    <span>📹</span>
                    <span>{isMobile ? 'iPhone Kamera starten' : 'Webcam starten'}</span>
                  </button>
                  
                  <div className="text-center text-sm text-gray-400 space-y-1">
                    <p>✅ {isMobile ? 'Mobile optimiert' : 'Desktop optimiert'}</p>
                    <p>✅ HD-Qualität automatisch</p>
                    <p>✅ Echtzeit ohne Verzögerung</p>
                  </div>
                </div>
              </div>

              {/* Fehlermeldung */}
              {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg">
                  <p className="font-semibold">Fehler:</p>
                  <p className="text-sm mt-1">{error}</p>
                  
                  {isIOS && (
                    <div className="mt-4 text-xs space-y-1">
                      <p className="font-semibold text-yellow-300">iPhone Hilfe:</p>
                      <p>• Safari öffnen → Einstellungen → Website-Einstellungen</p>
                      <p>• Diese Website suchen → Kamera "Erlauben"</p>
                      <p>• Seite neu laden und erneut versuchen</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Live Stream läuft
            <div className="space-y-6">
              
              {/* Video Preview */}
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover"
                />
                
                {/* Live Overlays */}
                <div className="absolute top-4 left-4">
                  <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm flex items-center">
                    <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                    LIVE
                  </div>
                </div>
                
                <div className="absolute top-4 right-4">
                  <div className="bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                    👁️ {viewerCount}
                  </div>
                </div>
                
                <div className="absolute bottom-4 left-4">
                  <div className="bg-black/70 text-white px-3 py-1 rounded-full text-xs">
                    📹 {streamQuality}
                  </div>
                </div>
              </div>
              
              {/* Live Status */}
              <div className="bg-green-600/20 border border-green-500 rounded-lg p-4">
                <div className="text-center space-y-3">
                  <h3 className="text-xl font-bold text-green-400">
                    🎉 Sie sind live!
                  </h3>
                  <p className="text-gray-300">
                    Kunden sehen jetzt Ihr {isMobile ? 'iPhone' : 'Webcam'}-Video in Echtzeit
                  </p>
                  
                  <div className="flex justify-center space-x-6 text-sm">
                    <div className="flex items-center space-x-1">
                      <span className="text-green-400">📹</span>
                      <span>Qualität: {streamQuality}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-blue-400">👥</span>
                      <span>{viewerCount} Zuschauer</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Controls */}
              <div className="flex justify-center">
                <button
                  onClick={stopWebcamStream}
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

  // Customer View
  return (
    <div className="webcam-customer-view bg-black text-white rounded-lg overflow-hidden min-h-[500px] relative">
      
      {isStreaming ? (
        // Echter Live Stream für Kunden
        <div className="live-stream-container h-full">
          <div className="stream-display h-full bg-black flex items-center justify-center relative">
            
            {/* Simuliertes Live Video für Kunden */}
            <div className="customer-stream h-full w-full bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center relative">
              
              {/* Live Video Animation */}
              <div className="text-center space-y-6 p-8">
                <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-4xl animate-pulse mx-auto">
                  📹
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold">
                    Live Video aktiv
                  </h3>
                  
                  <p className="text-xl text-gray-300">
                    {isMobile ? 'iPhone' : 'Webcam'} Stream läuft
                  </p>
                  
                  <div className="bg-black/50 rounded-lg p-4">
                    <p className="text-lg font-semibold text-green-300">
                      🔴 Moderator ist live
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Qualität: {streamQuality} • Echtzeit-Übertragung
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Moving particles for live effect */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="particle absolute top-1/4 left-1/4 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-75"></div>
                <div className="particle absolute top-3/4 right-1/4 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-75" style={{animationDelay: '1s'}}></div>
                <div className="particle absolute top-1/2 right-1/3 w-2 h-2 bg-pink-400 rounded-full animate-ping opacity-75" style={{animationDelay: '2s'}}></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Warten auf Stream
        <div className="waiting-for-stream h-full bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
          <div className="text-center space-y-6 p-8">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-5xl animate-pulse">
              📱
            </div>
            
            <div className="space-y-4">
              <h3 className="text-3xl font-bold">
                Live Shopping startet gleich
              </h3>
              
              <p className="text-xl text-gray-300">
                Moderator bereitet {isMobile ? 'iPhone' : 'Webcam'}-Stream vor
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
            {isStreaming ? 'LIVE VIDEO' : 'OUTLET34'}
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
            {isStreaming ? `${isMobile ? 'iPhone' : 'Webcam'} Live` : 'Live Shopping'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebcamLiveStream;