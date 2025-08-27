import { useState, useEffect } from 'react';

const SimpleLiveStream = ({ isHost = false }) => {
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(47);
  const [cameraSetup, setCameraSetup] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  useEffect(() => {
    // Viewer count simulation
    const interval = setInterval(() => {
      setViewerCount(prev => prev + Math.floor(Math.random() * 3) - 1);
    }, 4000);

    // Sync live status across tabs
    if (!isHost) {
      const checkLiveStatus = () => {
        const liveStatus = localStorage.getItem('outlet34_is_live');
        const cameraType = localStorage.getItem('outlet34_camera_type');
        
        if (liveStatus === 'true') {
          setIsLive(true);
          if (cameraType) setCameraSetup(cameraType);
          
          const storedYouTubeUrl = localStorage.getItem('outlet34_youtube_url');
          if (storedYouTubeUrl) setYoutubeUrl(storedYouTubeUrl);
        } else {
          setIsLive(false);
        }
      };

      checkLiveStatus();
      const statusInterval = setInterval(checkLiveStatus, 1000);
      
      return () => {
        clearInterval(interval);
        clearInterval(statusInterval);
      };
    }

    return () => clearInterval(interval);
  }, [isHost]);

  // Host Interface
  if (isHost) {
    return (
      <div className="simple-live-control bg-black text-white rounded-lg p-6 min-h-[500px]">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-center text-pink-400">
            📹 Live Stream Kontrolle
          </h2>
          
          {!isLive ? (
            <div className="space-y-6">
              
              {/* Option 1: YouTube Live (Direkt mit Ihrer URL) */}
              <div className="bg-red-600/20 border border-red-500 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-red-300 mb-4">
                  📺 YouTube Live - SOFORT LIVE GEHEN!
                </h3>
                
                <div className="bg-red-500/20 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-white mb-2">✅ Ihre YouTube Live URL gefunden:</h4>
                  <p className="text-sm text-red-100 break-all">
                    https://youtube.com/live/3Rj7FNxdXf8?feature=share
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    setCameraSetup('youtube');
                    setIsLive(true);
                    localStorage.setItem('outlet34_is_live', 'true');
                    localStorage.setItem('outlet34_camera_type', 'youtube');
                    localStorage.setItem('outlet34_youtube_url', 'https://youtube.com/live/3Rj7FNxdXf8?feature=share');
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-lg font-bold text-xl"
                >
                  📺 YOUTUBE LIVE AKTIVIEREN!
                </button>
              </div>
              
              {/* Schritt 1: Alternative Kamera Setup */}
              <div className="bg-blue-600/20 border border-blue-500 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-blue-300 mb-4">
                  📱 Alternative: Andere Kamera wählen
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Option 1: Handy */}
                  <button
                    onClick={() => setCameraSetup('handy')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      cameraSetup === 'handy' 
                        ? 'border-blue-500 bg-blue-500/20' 
                        : 'border-gray-600 bg-gray-800/50'
                    }`}
                  >
                    <div className="text-4xl mb-2">📱</div>
                    <div className="font-semibold">Handy</div>
                    <div className="text-sm text-gray-400">iPhone/Android</div>
                  </button>
                  
                  {/* Option 2: Webcam */}
                  <button
                    onClick={() => setCameraSetup('webcam')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      cameraSetup === 'webcam' 
                        ? 'border-blue-500 bg-blue-500/20' 
                        : 'border-gray-600 bg-gray-800/50'
                    }`}
                  >
                    <div className="text-4xl mb-2">💻</div>
                    <div className="font-semibold">Webcam</div>
                    <div className="text-sm text-gray-400">PC/Laptop</div>
                  </button>
                  
                  {/* Option 3: Professionell */}
                  <button
                    onClick={() => setCameraSetup('professional')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      cameraSetup === 'professional' 
                        ? 'border-blue-500 bg-blue-500/20' 
                        : 'border-gray-600 bg-gray-800/50'
                    }`}
                  >
                    <div className="text-4xl mb-2">📹</div>
                    <div className="font-semibold">Profi Kamera</div>
                    <div className="text-sm text-gray-400">DSLR/Camcorder</div>
                  </button>
                </div>
              </div>

              {/* Schritt 2: Anweisungen */}
              {cameraSetup && (
                <div className="bg-green-600/20 border border-green-500 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-green-300 mb-4">
                    📋 Schritt 2: Setup für {cameraSetup === 'handy' ? 'Handy' : cameraSetup === 'webcam' ? 'Webcam' : 'Profi Kamera'}
                  </h3>
                  
                  <div className="bg-green-500/20 rounded-lg p-4 mb-4">
                    {cameraSetup === 'handy' && (
                      <div className="space-y-2 text-sm text-green-100">
                        <p>1️⃣ <strong>Positionieren:</strong> Handy aufstellen oder halten</p>
                        <p>2️⃣ <strong>Beleuchtung:</strong> Gutes Licht einschalten</p>
                        <p>3️⃣ <strong>Ton:</strong> Laut und deutlich sprechen</p>
                        <p>4️⃣ <strong>Bereit?</strong> "Live gehen" klicken</p>
                      </div>
                    )}
                    
                    {cameraSetup === 'webcam' && (
                      <div className="space-y-2 text-sm text-green-100">
                        <p>1️⃣ <strong>Webcam prüfen:</strong> Funktioniert sie?</p>
                        <p>2️⃣ <strong>Position:</strong> Kamera auf Augenhöhe</p>
                        <p>3️⃣ <strong>Mikrofon:</strong> Headset empfohlen</p>
                        <p>4️⃣ <strong>Bereit?</strong> "Live gehen" klicken</p>
                      </div>
                    )}
                    
                    {cameraSetup === 'professional' && (
                      <div className="space-y-2 text-sm text-green-100">
                        <p>1️⃣ <strong>Kamera Setup:</strong> Einstellungen prüfen</p>
                        <p>2️⃣ <strong>Audio:</strong> Externes Mikrofon anschließen</p>
                        <p>3️⃣ <strong>Beleuchtung:</strong> Professionelle Ausleuchtung</p>
                        <p>4️⃣ <strong>Bereit?</strong> "Live gehen" klicken</p>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => {
                      setIsLive(true);
                      localStorage.setItem('outlet34_is_live', 'true');
                      localStorage.setItem('outlet34_camera_type', cameraSetup);
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-bold text-xl"
                  >
                    🔴 LIVE GEHEN!
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Live Status
            <div className="bg-red-600/20 border border-red-500 rounded-lg p-6">
              <div className="text-center space-y-6">
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-6 h-6 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-3xl font-bold text-red-400">SIE SIND LIVE!</span>
                  <div className="w-6 h-6 bg-red-500 rounded-full animate-pulse"></div>
                </div>
                
                <div className="bg-black/50 rounded-lg p-6">
                  <p className="text-xl text-gray-300 mb-3">
                    🎥 {cameraSetup === 'youtube' ? 'YouTube Live Stream' :
                        cameraSetup === 'handy' ? 'Handy-Kamera' : 
                        cameraSetup === 'webcam' ? 'Webcam' : 
                        'Professionelle Kamera'} aktiv
                  </p>
                  <p className="text-lg text-green-300">
                    Kunden sehen jetzt Ihren Live-Stream!
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-400">{viewerCount}</div>
                    <div className="text-sm text-gray-400">Zuschauer</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">LIVE</div>
                    <div className="text-sm text-gray-400">Status</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-pink-400">HD</div>
                    <div className="text-sm text-gray-400">Qualität</div>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setIsLive(false);
                    setCameraSetup('');
                    localStorage.removeItem('outlet34_is_live');
                    localStorage.removeItem('outlet34_camera_type');
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-bold text-lg"
                >
                  ⏹️ STREAM BEENDEN
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
    <div className="simple-customer-view bg-black text-white rounded-lg overflow-hidden min-h-[500px] relative">
      
      {isLive ? (
        // Live Stream für Kunden
        <div className="live-customer-stream h-full">
          
          {/* ECHTES YOUTUBE VIDEO */}
          {cameraSetup === 'youtube' && youtubeUrl ? (
            <div className="youtube-video-container h-full">
              <iframe
                src={`https://www.youtube.com/embed/3Rj7FNxdXf8?autoplay=1&mute=0&controls=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="YouTube Live Stream - Outlet34"
              />
            </div>
          ) : (
            // Live Status Display für andere Kamera-Types
            <div className="stream-display h-full bg-gradient-to-br from-red-900 via-pink-900 to-purple-900 flex items-center justify-center relative">
            
            {/* Live Stream Content */}
            <div className="text-center space-y-8 p-8">
              
              {/* Live Icon */}
              <div className="w-40 h-40 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center text-6xl animate-pulse mx-auto shadow-2xl">
                📹
              </div>
              
              <div className="space-y-6">
                <h2 className="text-4xl font-bold">
                  🔴 LIVE SHOPPING
                </h2>
                
                <p className="text-2xl text-red-300 font-semibold">
                  Moderator ist jetzt live!
                </p>
                
                <div className="bg-black/70 rounded-xl p-6 space-y-4">
                  <p className="text-xl font-semibold text-green-300">
                    📺 {cameraSetup === 'handy' ? 'Handy-Stream' : 
                        cameraSetup === 'webcam' ? 'Webcam-Stream' : 
                        cameraSetup === 'professional' ? 'Profi-Stream' : 'Live-Stream'} aktiv
                  </p>
                  <p className="text-gray-300">
                    Outlet34 Fashion Show • Live-Übertragung
                  </p>
                  
                  <div className="flex justify-center space-x-8 text-sm mt-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-400">LIVE</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-blue-400">HD</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                      <span className="text-purple-400">Echtzeit</span>
                    </div>
                  </div>
                </div>
                
                {/* Shopping CTA */}
                <div className="bg-gradient-to-r from-pink-600/40 to-purple-600/40 rounded-xl p-6 mt-8">
                  <p className="text-2xl font-bold text-pink-300 mb-2">
                    🛍️ JETZT LIVE SHOPPEN!
                  </p>
                  <p className="text-lg text-gray-300">
                    Bestellen Sie während der Live-Show →
                  </p>
                </div>
              </div>
            </div>
            
            {/* Animated Background Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-pink-400 rounded-full animate-ping opacity-60"></div>
              <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-blue-400 rounded-full animate-ping opacity-60" style={{animationDelay: '1s'}}></div>
              <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-purple-400 rounded-full animate-ping opacity-60" style={{animationDelay: '2s'}}></div>
              <div className="absolute bottom-1/4 left-1/3 w-3 h-3 bg-green-400 rounded-full animate-ping opacity-60" style={{animationDelay: '3s'}}></div>
            </div>
            </div>
          )}
        </div>
      ) : (
        // Warten auf Stream
        <div className="waiting-stream h-full bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
          <div className="text-center space-y-8 p-8">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-5xl animate-pulse">
              ⏰
            </div>
            
            <div className="space-y-4">
              <h3 className="text-3xl font-bold">
                Live Shopping startet gleich
              </h3>
              
              <p className="text-xl text-gray-300">
                Moderator bereitet alles vor...
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

      {/* Fixed Overlays */}
      <div className="absolute top-4 left-4 z-50">
        <div className="bg-red-600 text-white px-4 py-2 rounded-full flex items-center font-bold">
          <div className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></div>
          {isLive ? 'LIVE SHOPPING' : 'OUTLET34'}
        </div>
      </div>

      <div className="absolute top-4 right-4 z-50">
        <div className="bg-black/80 text-white px-3 py-2 rounded-full">
          <span className="text-sm font-semibold">👥 {viewerCount} live</span>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-50">
        <div className="text-white text-right">
          <div className="font-bold text-lg">OUTLET34</div>
          <div className="text-sm opacity-75">
            {isLive ? 'Live Shopping' : 'Fashion Store'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleLiveStream;