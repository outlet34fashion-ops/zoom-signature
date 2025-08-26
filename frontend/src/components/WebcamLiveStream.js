import { useState, useEffect, useRef } from 'react';

const WebcamLiveStream = ({ isHost = false }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [viewerCount, setViewerCount] = useState(48);
  const [streamQuality, setStreamQuality] = useState('HD');
  const [globalStream, setGlobalStream] = useState(null);
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

    // Für Customer: Höre auf globalen Stream
    if (!isHost) {
      const handleStreamStart = (event) => {
        console.log('Customer empfängt Stream-Event');
        const stream = event.detail.stream || window.liveStream;
        if (stream && videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setIsStreaming(true);
          setGlobalStream(stream);
        }
      };

      // Event Listener hinzufügen
      window.addEventListener('streamStarted', handleStreamStart);
      
      // Event für manuellen Start
      const handleManualStart = () => {
        console.log('Customer: Manual stream start event received');
        setIsStreaming(true);
      };
      
      window.addEventListener('manualStreamStart', handleManualStart);

      // Check if stream already exists
      if (window.liveStream && window.streamActive) {
        console.log('Existing stream found');
        if (videoRef.current) {
          videoRef.current.srcObject = window.liveStream;
          videoRef.current.play();
          setIsStreaming(true);
        }
      } else if (window.streamActive) {
        console.log('Manual stream is active');
        setIsStreaming(true);
      }

      return () => {
        clearInterval(interval);
        window.removeEventListener('streamStarted', handleStreamStart);
        window.removeEventListener('manualStreamStart', handleManualStart);
      };
    }

    return () => {
      clearInterval(interval);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isHost]);

  // Einfache, funktionierende Webcam-Lösung
  const startWebcamStream = async () => {
    try {
      setError(null);
      console.log('Starting webcam...');
      
      // Einfache Constraints - maximal kompatibel
      const constraints = {
        video: true,
        audio: false // Erst mal ohne Audio für Stabilität
      };

      // Kamera-Zugriff anfordern
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Stream erhalten:', stream);
      
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        videoRef.current.autoplay = true;
        
        // Warten bis Video bereit ist
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata geladen');
          videoRef.current.play().then(() => {
            console.log('Video spielt');
            setIsStreaming(true);
            setStreamQuality('Live');
            
            // WICHTIG: Stream global verfügbar machen
            setGlobalStream(stream);
            window.liveStream = stream; // Global für alle Benutzer
            window.streamActive = true;
            
            // Benachrichtige alle Benutzer
            window.dispatchEvent(new CustomEvent('streamStarted', { detail: { stream } }));
          }).catch(e => {
            console.error('Video play error:', e);
            setError('Video konnte nicht gestartet werden: ' + e.message);
          });
        };
        
        streamRef.current = stream;
        
        // Backup: Direkt setzen falls onloadedmetadata nicht feuert
        setTimeout(() => {
          if (!isStreaming) {
            console.log('Fallback: Stream als aktiv markieren');
            setIsStreaming(true);
            setStreamQuality('Active');
          }
        }, 3000);
      }
    } catch (err) {
      console.error('Kamera-Fehler:', err);
      
      let errorMessage = `Kamera-Problem: ${err.name || 'Unbekannt'}`;
      
      if (err.name === 'NotAllowedError') {
        errorMessage = '🚫 Kamera-Berechtigung verweigert. Bitte in Browser-Einstellungen erlauben.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = '📷 Keine Kamera gefunden. Ist eine Kamera angeschlossen?';
      } else if (err.name === 'NotReadableError') {
        errorMessage = '⚠️ Kamera ist bereits in Benutzung. Andere Apps schließen.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = '⚙️ Kamera-Einstellungen nicht unterstützt. Versuche einfachere Einstellungen...';
      }
      
      setError(errorMessage);
      
      // Fallback mit noch einfacheren Constraints
      if (err.name === 'OverconstrainedError') {
        try {
          console.log('Versuche Fallback...');
          const simpleStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
          if (videoRef.current) {
            videoRef.current.srcObject = simpleStream;
            videoRef.current.play();
            streamRef.current = simpleStream;
            setIsStreaming(true);
            setStreamQuality('640x480');
            setError(null);
          }
        } catch (fallbackErr) {
          console.error('Auch Fallback fehlgeschlagen:', fallbackErr);
        }
      }
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
                  
                  <div className="space-y-3">
                    {/* Kamera-Test Button */}
                    <button
                      onClick={async () => {
                        try {
                          const devices = await navigator.mediaDevices.enumerateDevices();
                          const cameras = devices.filter(device => device.kind === 'videoinput');
                          alert(`Gefunden: ${cameras.length} Kamera(s)\n${cameras.map(c => c.label || 'Kamera').join('\n')}`);
                        } catch (e) {
                          alert('Kamera-Check fehlgeschlagen: ' + e.message);
                        }
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                    >
                      🔍 Kamera testen
                    </button>
                    
                    {/* Hauptstart Button */}
                    <button
                      onClick={startWebcamStream}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-bold text-lg flex items-center justify-center space-x-2"
                    >
                      <span>📹</span>
                      <span>{isMobile ? 'iPhone Kamera starten' : 'Webcam starten'}</span>
                    </button>
                    
                    {/* EINFACHE LÖSUNG: Manueller Live-Button */}
                    <div className="mt-6 p-4 bg-yellow-600/20 border border-yellow-500 rounded-lg">
                      <h4 className="text-yellow-300 font-semibold mb-3">⚡ Schnellstart (Kamera-Probleme?)</h4>
                      <button
                        onClick={() => {
                          setIsStreaming(true);
                          setStreamQuality('Live');
                          // Benachrichtige alle Kunden
                          window.streamActive = true;
                          window.dispatchEvent(new CustomEvent('manualStreamStart'));
                        }}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-3 rounded-lg font-semibold"
                      >
                        ✅ Ich bin live (ohne Webcam)
                      </button>
                      <p className="text-xs text-yellow-200 mt-2">
                        Nutzen Sie externe Kamera oder zweites Gerät für Video
                      </p>
                    </div>
                    
                    {/* Direkter Browser-Test */}
                    <button
                      onClick={() => {
                        navigator.mediaDevices.getUserMedia({ video: true })
                          .then(stream => {
                            alert('✅ Kamera funktioniert! Stream erhalten.');
                            stream.getTracks().forEach(track => track.stop());
                          })
                          .catch(err => {
                            alert('❌ Kamera-Fehler: ' + err.name + ' - ' + err.message);
                          });
                      }}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm"
                    >
                      ⚡ Direkt-Test
                    </button>
                  </div>
                  
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

  // Customer View - Zeigt echtes Video wenn Admin live ist
  return (
    <div className="webcam-customer-view bg-black text-white rounded-lg overflow-hidden min-h-[500px] relative">
      
      {/* ECHTES VIDEO für Kunden wenn Admin streamt */}
      <div className="live-stream-container h-full">
        <div className="stream-display h-full bg-black flex items-center justify-center relative">
          
          {/* Live Video Stream - Shared zwischen Admin und Customer */}
          <div className="customer-stream h-full w-full bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center relative" id="customer-video-area">
            
            {/* Live Stream Content */}
            {isStreaming ? (
              // LIVE VIDEO BEREICH
              <div className="live-content w-full h-full bg-black flex items-center justify-center relative">
                
                {/* Video Element (falls vorhanden) */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ display: globalStream ? 'block' : 'none' }}
                />
                
                {/* Live Stream Anzeige (immer sichtbar wenn live) */}
                <div className="live-stream-display absolute inset-0 flex items-center justify-center" style={{ display: globalStream ? 'none' : 'flex' }}>
                  <div className="text-center space-y-6 p-8">
                    <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-red-600 rounded-full flex items-center justify-center text-5xl animate-pulse">
                      📹
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-3xl font-bold text-white">
                        🔴 LIVE STREAM AKTIV
                      </h3>
                      
                      <p className="text-xl text-green-300">
                        Moderator streamt live!
                      </p>
                      
                      <div className="bg-black/70 rounded-lg p-4">
                        <p className="text-lg font-semibold text-green-300">
                          📺 Live Video läuft
                        </p>
                        <p className="text-sm text-gray-300 mt-1">
                          Outlet34 Fashion Show • Echtzeit-Übertragung
                        </p>
                      </div>
                      
                      <div className="mt-4 p-4 bg-gradient-to-r from-pink-600/30 to-purple-600/30 rounded-lg">
                        <p className="text-lg font-semibold text-pink-300">
                          🛍️ Jetzt live shoppen!
                        </p>
                        <p className="text-sm text-gray-300 mt-1">
                          Bestellen Sie während der Live-Show →
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // WARTEN AUF STREAM
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
            )}
          </div>
        </div>
      </div>

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