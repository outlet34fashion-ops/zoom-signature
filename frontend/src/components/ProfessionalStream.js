import React, { useState, useEffect } from 'react';

const ProfessionalStream = ({ isHost = false }) => {
  const [streamUrl, setStreamUrl] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(47);
  const [streamType, setStreamType] = useState('');

  useEffect(() => {
    // Viewer Count Simulation
    const interval = setInterval(() => {
      setViewerCount(prev => prev + Math.floor(Math.random() * 3) - 1);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Host Interface - Professionelle Streaming-Optionen
  if (isHost) {
    return (
      <div className="professional-stream-control bg-black text-white rounded-lg p-6 min-h-[500px]">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-center text-pink-400">
            🎥 Professionelle Live-Streaming Lösungen
          </h2>
          
          {!isLive ? (
            <div className="space-y-6">
              
              {/* Option 1: Instagram Live - SOFORT verfügbar */}
              <div className="bg-pink-600/20 border border-pink-500 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-pink-300 mb-4">
                  📱 Option 1: Instagram Live (SOFORT verfügbar!)
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-green-500/20 rounded-lg p-4 border border-green-500">
                    <h4 className="font-semibold text-green-300 mb-2">✅ Keine Wartezeit!</h4>
                    <div className="text-sm text-green-100 space-y-1">
                      <p>1️⃣ Instagram App öffnen</p>
                      <p>2️⃣ Story → "Live" wählen</p>
                      <p>3️⃣ Titel: "Outlet34 Live Shopping"</p>
                      <p>4️⃣ "Live gehen" - SOFORT bereit!</p>
                      <p>5️⃣ Username hier eingeben (z.B. outlet34_official)</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Instagram Username eingeben:
                    </label>
                    <input
                      type="text"
                      placeholder="outlet34_official"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                      onChange={(e) => setStreamUrl(`https://www.instagram.com/${e.target.value}/live`)}
                    />
                  </div>
                  
                  <button
                    onClick={() => {
                      if (streamUrl.includes('instagram.com')) {
                        setStreamType('instagram');
                        setIsLive(true);
                      } else {
                        alert('Bitte geben Sie Ihren Instagram Username ein');
                      }
                    }}
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white px-6 py-4 rounded-lg font-bold text-lg"
                  >
                    📱 Instagram Live aktivieren
                  </button>
                </div>
              </div>

              {/* Option 2: YouTube Live (24h Wartezeit) */}
              <div className="bg-red-600/20 border border-red-500 rounded-lg p-6 opacity-60">
                <h3 className="text-xl font-semibold text-red-300 mb-4">
                  📺 Option 2: YouTube Live (Wartezeit: 24h)
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-red-500/20 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">So geht's:</h4>
                    <div className="text-sm text-red-100 space-y-1">
                      <p>1️⃣ Öffnen Sie YouTube auf dem Handy</p>
                      <p>2️⃣ Tippen Sie auf "+" → "Live übertragen"</p>
                      <p>3️⃣ Titel: "Outlet34 Live Shopping"</p>
                      <p>4️⃣ Datenschutz: "Nicht gelistet" wählen</p>
                      <p>5️⃣ "Live gehen" - kopieren Sie die URL</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      YouTube Live URL einfügen:
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                      onChange={(e) => setStreamUrl(e.target.value)}
                    />
                  </div>
                  
                  <button
                    disabled
                    className="w-full bg-gray-600 text-gray-400 px-6 py-4 rounded-lg font-bold text-lg cursor-not-allowed"
                  >
                    ⏳ Warten auf YouTube (23:59 Std.)
                  </button>
                </div>
              </div>

              {/* Option 2: Vimeo Live */}
              <div className="bg-blue-600/20 border border-blue-500 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-blue-300 mb-4">
                  🎬 Option 2: Vimeo Live (Professionell)
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-blue-500/20 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">So geht's:</h4>
                    <div className="text-sm text-blue-100 space-y-1">
                      <p>1️⃣ Gehen Sie zu vimeo.com/live</p>
                      <p>2️⃣ "Create Live Event" klicken</p>
                      <p>3️⃣ Mit Handy/Computer streamen</p>
                      <p>4️⃣ Event-URL kopieren</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Vimeo Live URL einfügen:
                    </label>
                    <input
                      type="url"
                      placeholder="https://vimeo.com/event/..."
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                      onChange={(e) => setStreamUrl(e.target.value)}
                    />
                  </div>
                  
                  <button
                    onClick={() => {
                      if (streamUrl.includes('vimeo.com')) {
                        setStreamType('vimeo');
                        setIsLive(true);
                      } else {
                        alert('Bitte geben Sie eine gültige Vimeo URL ein');
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg font-bold text-lg"
                  >
                    🎬 Vimeo Stream aktivieren
                  </button>
                </div>
              </div>

              {/* Option 3: Facebook Live */}
              <div className="bg-blue-500/20 border border-blue-400 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-blue-300 mb-4">
                  📱 Option 3: Facebook Live
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-blue-400/20 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">So geht's:</h4>
                    <div className="text-sm text-blue-100 space-y-1">
                      <p>1️⃣ Facebook App öffnen</p>
                      <p>2️⃣ "Live" antippen</p>
                      <p>3️⃣ Titel eingeben</p>
                      <p>4️⃣ "Live gehen" - URL kopieren</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Facebook Live URL einfügen:
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.facebook.com/..."
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                      onChange={(e) => setStreamUrl(e.target.value)}
                    />
                  </div>
                  
                  <button
                    onClick={() => {
                      if (streamUrl.includes('facebook.com')) {
                        setStreamType('facebook');
                        setIsLive(true);
                      } else {
                        alert('Bitte geben Sie eine gültige Facebook URL ein');
                      }
                    }}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-4 rounded-lg font-bold text-lg"
                  >
                    📱 Facebook Stream aktivieren
                  </button>
                </div>
              </div>

              {/* Option 4: Direkter Stream-Link */}
              <div className="bg-purple-600/20 border border-purple-500 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-purple-300 mb-4">
                  🔗 Option 4: Direkter Stream-Link
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Beliebige Stream-URL (YouTube, Twitch, etc.):
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                      onChange={(e) => setStreamUrl(e.target.value)}
                    />
                  </div>
                  
                  <button
                    onClick={() => {
                      if (streamUrl.includes('http')) {
                        setStreamType('custom');
                        setIsLive(true);
                      } else {
                        alert('Bitte geben Sie eine gültige URL ein');
                      }
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-lg font-bold text-lg"
                  >
                    🔗 Stream aktivieren
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Live Status
            <div className="bg-green-600/20 border border-green-500 rounded-lg p-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-2xl font-bold text-green-400">SIE SIND LIVE!</span>
                  <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                </div>
                
                <p className="text-lg text-gray-300">
                  Platform: {streamType === 'youtube' ? '📺 YouTube Live' : 
                           streamType === 'vimeo' ? '🎬 Vimeo Live' : 
                           streamType === 'facebook' ? '📱 Facebook Live' : 
                           '🔗 Custom Stream'}
                </p>
                
                <div className="bg-black/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2">Stream URL:</p>
                  <p className="text-xs text-blue-300 break-all">{streamUrl}</p>
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

  // Customer View - Echter Embedded Stream
  return (
    <div className="professional-customer-view bg-black text-white rounded-lg overflow-hidden min-h-[500px] relative">
      
      {isLive && streamUrl ? (
        // Echter Stream für Kunden
        <div className="stream-container h-full">
          {streamType === 'youtube' && (
            <iframe
              src={streamUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/') + '?autoplay=1&mute=0'}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube Live Stream"
            />
          )}
          
          {streamType === 'instagram' && (
            <iframe
              src={`https://www.instagram.com/${streamUrl.split('/')[3]}/embed`}
              className="w-full h-full"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
              title="Instagram Live Stream"
            />
          )}
          
          {streamType === 'twitch' && (
            <iframe
              src={streamUrl.replace('twitch.tv/', 'player.twitch.tv/?channel=').replace('https://www.', '') + '&parent=shop-live-app.preview.emergentagent.com'}
              className="w-full h-full"
              allow="autoplay; fullscreen"
              allowFullScreen
              title="Twitch Live Stream"
            />
          )}
          
          {streamType === 'vimeo' && (
            <iframe
              src={streamUrl.replace('vimeo.com/', 'player.vimeo.com/video/') + '?autoplay=1'}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Vimeo Live Stream"
            />
          )}
          
          {streamType === 'facebook' && (
            <iframe
              src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(streamUrl)}&show_text=false&width=734&autoplay=true`}
              className="w-full h-full"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
              title="Facebook Live Stream"
            />
          )}
          
          {streamType === 'custom' && (
            <iframe
              src={streamUrl}
              className="w-full h-full"
              allow="autoplay; fullscreen"
              allowFullScreen
              title="Live Stream"
            />
          )}
        </div>
      ) : (
        // Warten auf Stream
        <div className="waiting-for-stream h-full bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
          <div className="text-center space-y-6 p-8">
            <div className="w-32 h-32 bg-gradient-to-br from-red-500 via-pink-500 to-purple-600 rounded-full mx-auto flex items-center justify-center text-5xl animate-pulse">
              📺
            </div>
            
            <div className="space-y-4">
              <h3 className="text-3xl font-bold">
                Live Shopping startet gleich
              </h3>
              
              <p className="text-xl text-gray-300">
                Outlet34 Fashion Show
              </p>
              
              <div className="mt-8 p-6 bg-black/60 rounded-lg">
                <h4 className="text-lg font-semibold mb-3 text-pink-400">
                  🛍️ Gleich live präsentiert:
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

      {/* Live Overlays */}
      <div className="absolute top-4 left-4">
        <div className="bg-red-600 text-white px-4 py-2 rounded-full flex items-center">
          <div className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></div>
          <span className="font-bold">
            {isLive ? 'LIVE SHOPPING' : 'OUTLET34'}
          </span>
        </div>
      </div>

      <div className="absolute top-4 right-4">
        <div className="bg-black/70 text-white px-3 py-2 rounded-full">
          <span className="text-sm">👥 {viewerCount} warten</span>
        </div>
      </div>

      <div className="absolute bottom-4 right-4">
        <div className="text-white text-right">
          <div className="font-bold text-lg">OUTLET34</div>
          <div className="text-sm opacity-75">Live Shopping</div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalStream;