import { useState, useEffect } from 'react';

const RealVideoStream = ({ isHost = false }) => {
  const [isLive, setIsLive] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [streamType, setStreamType] = useState('');
  const [viewerCount, setViewerCount] = useState(52);

  // Gerät erkennen
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    // Viewer count simulation
    const interval = setInterval(() => {
      setViewerCount(prev => prev + Math.floor(Math.random() * 3) - 1);
    }, 4000);

    // Für Customer: Check if stream is active
    if (!isHost) {
      const checkStreamStatus = () => {
        const liveStatus = localStorage.getItem('outlet34_live_status');
        const liveUrl = localStorage.getItem('outlet34_stream_url');
        const liveType = localStorage.getItem('outlet34_stream_type');
        
        if (liveStatus === 'true') {
          setIsLive(true);
          if (liveUrl) setStreamUrl(liveUrl);
          if (liveType) setStreamType(liveType);
        }
      };

      // Check initially
      checkStreamStatus();
      
      // Check every 2 seconds for updates
      const statusInterval = setInterval(checkStreamStatus, 2000);
      
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
      <div className="real-video-control bg-black text-white rounded-lg p-6 min-h-[500px]">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-center text-pink-400">
            📹 Echte Video-Streaming Lösungen
          </h2>
          
          {!isLive ? (
            <div className="space-y-6">
              
              {/* Option 1: YouTube Live */}
              <div className="bg-red-600/20 border border-red-500 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-red-300 mb-4">
                  📺 Option 1: YouTube Live (Beste Qualität)
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-red-500/20 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">So geht's:</h4>
                    <div className="text-sm text-red-100 space-y-1">
                      <p>1️⃣ YouTube App → "+" → "Live übertragen"</p>
                      <p>2️⃣ Titel: "Outlet34 Live Shopping"</p>
                      <p>3️⃣ Privatsphäre: "Nicht gelistet"</p>
                      <p>4️⃣ Live gehen → URL kopieren</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                      onChange={(e) => setStreamUrl(e.target.value)}
                    />
                  </div>
                  
                  <button
                    onClick={() => {
                      if (streamUrl.includes('youtube.com') || streamUrl.includes('youtu.be')) {
                        setStreamType('youtube');
                        setIsLive(true);
                        // Save to localStorage for customer sync
                        localStorage.setItem('outlet34_live_status', 'true');
                        localStorage.setItem('outlet34_stream_url', streamUrl);
                        localStorage.setItem('outlet34_stream_type', 'youtube');
                      } else {
                        alert('Bitte YouTube URL eingeben');
                      }
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-lg font-bold text-lg"
                  >
                    📺 YouTube Live aktivieren
                  </button>
                </div>
              </div>

              {/* Option 2: Instagram Live */}
              <div className="bg-pink-600/20 border border-pink-500 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-pink-300 mb-4">
                  📱 Option 2: Instagram Live
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-pink-500/20 rounded-lg p-4">
                    <div className="text-sm text-pink-100 space-y-1">
                      <p>1️⃣ Instagram Story → "Live"</p>
                      <p>2️⃣ Live gehen</p>
                      <p>3️⃣ Username hier eingeben</p>
                    </div>
                  </div>
                  
                  <input
                    type="text"
                    placeholder="instagram_username"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    onChange={(e) => setStreamUrl(`https://www.instagram.com/${e.target.value}/live`)}
                  />
                  
                  <button
                    onClick={() => {
                      if (streamUrl.includes('instagram.com')) {
                        setStreamType('instagram');
                        setIsLive(true);
                        localStorage.setItem('outlet34_live_status', 'true');
                        localStorage.setItem('outlet34_stream_url', streamUrl);
                        localStorage.setItem('outlet34_stream_type', 'instagram');
                      } else {
                        alert('Bitte Instagram Username eingeben');
                      }
                    }}
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white px-6 py-4 rounded-lg font-bold text-lg"
                  >
                    📱 Instagram Live aktivieren
                  </button>
                </div>
              </div>

              {/* Option 3: Externe Kamera */}
              <div className="bg-green-600/20 border border-green-500 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-green-300 mb-4">
                  📹 Option 3: Externe Kamera
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-green-500/20 rounded-lg p-4">
                    <div className="text-sm text-green-100 space-y-1">
                      <p>• Zweites Handy als Kamera</p>
                      <p>• Externe Webcam</p>
                      <p>• Professionelle Kamera</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setStreamType('external');
                      setIsLive(true);
                      localStorage.setItem('outlet34_live_status', 'true');
                      localStorage.setItem('outlet34_stream_type', 'external');
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-bold text-lg"
                  >
                    📹 Externe Kamera - Jetzt Live!
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Live Status
            <div className="bg-green-600/20 border border-green-500 rounded-lg p-6">
              <div className="text-center space-y-6">
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-2xl font-bold text-green-400">SIE SIND LIVE!</span>
                  <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                </div>
                
                <div className="bg-black/50 rounded-lg p-4">
                  <p className="text-lg text-gray-300 mb-2">
                    Platform: {streamType === 'youtube' ? '📺 YouTube Live' : 
                             streamType === 'instagram' ? '📱 Instagram Live' : 
                             '📹 Externe Kamera'}
                  </p>
                  {streamUrl && (
                    <p className="text-sm text-blue-300 break-all">{streamUrl}</p>
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
                    setStreamUrl('');
                    setStreamType('');
                    localStorage.removeItem('outlet34_live_status');
                    localStorage.removeItem('outlet34_stream_url');
                    localStorage.removeItem('outlet34_stream_type');
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

  // Customer View
  return (
    <div className="real-customer-view bg-black text-white rounded-lg overflow-hidden min-h-[500px] relative">
      
      {isLive ? (
        // Echter Stream für Kunden
        <div className="live-stream-container h-full">
          
          {streamType === 'youtube' && streamUrl && (
            <iframe
              src={streamUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/') + (streamUrl.includes('?') ? '&autoplay=1&mute=0' : '?autoplay=1&mute=0')}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube Live Stream"
            />
          )}
          
          {streamType === 'instagram' && (
            <div className="instagram-live h-full bg-gradient-to-br from-pink-900 to-purple-900 flex items-center justify-center">
              <div className="text-center space-y-6 p-8">
                <div className="w-32 h-32 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-5xl animate-pulse">
                  📱
                </div>
                <h3 className="text-3xl font-bold">Instagram Live Stream</h3>
                <p className="text-xl text-gray-300">Moderator ist live auf Instagram</p>
                <div className="bg-black/50 rounded-lg p-4">
                  <p className="text-lg font-semibold text-pink-300">
                    🔴 Live auf Instagram
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {streamType === 'external' && (
            <div className="external-camera h-full bg-gradient-to-br from-green-900 to-blue-900 flex items-center justify-center">
              <div className="text-center space-y-6 p-8">
                <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-5xl animate-pulse">
                  📹
                </div>
                <h3 className="text-3xl font-bold">Live Kamera aktiv</h3>
                <p className="text-xl text-gray-300">Professionelle Live-Übertragung</p>
                <div className="bg-black/50 rounded-lg p-4">
                  <p className="text-lg font-semibold text-green-300">
                    🔴 Externe Kamera Live
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    HD-Qualität • Outlet34 Fashion Show
                  </p>
                </div>
                
                <div className="mt-6 p-4 bg-gradient-to-r from-pink-600/30 to-purple-600/30 rounded-lg">
                  <p className="text-lg font-semibold text-pink-300">
                    🛍️ Jetzt live shoppen!
                  </p>
                  <p className="text-sm text-gray-300 mt-1">
                    Bestellen Sie während der Live-Show →
                  </p>
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
              📺
            </div>
            
            <div className="space-y-4">
              <h3 className="text-3xl font-bold">
                Live Shopping startet gleich
              </h3>
              
              <p className="text-xl text-gray-300">
                Moderator bereitet Live-Stream vor
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
            {isLive ? 'LIVE VIDEO' : 'OUTLET34'}
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
            {isLive ? 'Live Stream' : 'Live Shopping'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealVideoStream;