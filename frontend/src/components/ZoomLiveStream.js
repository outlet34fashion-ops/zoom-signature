import React, { useState, useEffect } from 'react';

const ZoomLiveStream = ({ 
  isHost = false, 
  sessionTopic = "outlet34_live_shopping",
  onSessionEnd,
  productData = []
}) => {
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [viewerCount, setViewerCount] = useState(34);
  
  // Ihr echter Zoom Meeting Link
  const ZOOM_MEETING_URL = "https://us02web.zoom.us/j/5183673726?pwd=UEVMNEoyREZhdEQvNVNRNTNkRDFLQT09";
  const MEETING_ID = "518 367 3726";
  const MEETING_PASSWORD = "UEVMNEoyREZhdEQvNVNRNTNkRDFLQT09";
  
  // Simuliere Live-Status Updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (isStreamActive) {
        setViewerCount(prev => prev + Math.floor(Math.random() * 3) - 1);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isStreamActive]);

  const joinZoomMeeting = () => {
    // Öffne Zoom Meeting in neuem Fenster
    window.open(ZOOM_MEETING_URL, '_blank', 'width=1200,height=800');
    setIsStreamActive(true);
  };

  const startHostStream = () => {
    // Für Host: Öffne Zoom Meeting als Host
    window.open(ZOOM_MEETING_URL, '_blank', 'width=1200,height=800');
    setIsStreamActive(true);
  };

  const copyMeetingInfo = () => {
    const meetingInfo = `
OUTLET34 Live Shopping
Zoom Meeting beitreten: ${ZOOM_MEETING_URL}
Meeting-ID: ${MEETING_ID}
Kenncode: ${MEETING_PASSWORD}
    `.trim();
    
    navigator.clipboard.writeText(meetingInfo).then(() => {
      alert('Meeting-Informationen kopiert!');
    });
  };

  return (
    <div className="zoom-live-stream">
      <div className="bg-black text-white rounded-lg overflow-hidden">
        <div className="p-6 min-h-[400px] relative">
          
          {/* Live-Video Platzhalter mit Meeting Info */}
          <div className="video-area relative h-full flex flex-col justify-center items-center">
            
            {/* Live Indicator */}
            <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center">
              <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
              LIVE
            </div>

            {/* Viewer Count */}
            <div className="absolute top-4 right-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm flex items-center">
              👥 {viewerCount} Zuschauer
            </div>

            {/* Meeting Info Display */}
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-pink-400">
                  🛍️ OUTLET34 Live Shopping
                </h2>
                <p className="text-gray-300">
                  Echtes Zoom Meeting - Jetzt live!
                </p>
              </div>

              {/* Meeting Details Card */}
              <div className="bg-gray-900 p-6 rounded-lg max-w-md mx-auto space-y-4">
                <div className="text-left space-y-3">
                  <div>
                    <span className="text-gray-400 text-sm">Meeting-ID:</span>
                    <p className="text-white font-mono text-lg">{MEETING_ID}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Kenncode:</span>
                    <p className="text-white font-mono text-xs break-all">{MEETING_PASSWORD}</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-700 pt-4 space-y-3">
                  {isHost ? (
                    <button 
                      onClick={startHostStream}
                      className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 px-4 rounded-lg text-lg font-semibold"
                    >
                      🎥 Als Host beitreten
                    </button>
                  ) : (
                    <button 
                      onClick={joinZoomMeeting}
                      className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 px-4 rounded-lg text-lg font-semibold"
                    >
                      📱 Zoom Meeting beitreten
                    </button>
                  )}
                  
                  <button 
                    onClick={copyMeetingInfo}
                    className="w-full border border-gray-600 text-gray-300 hover:bg-gray-800 py-2 px-4 rounded-lg"
                  >
                    📋 Meeting-Info kopieren
                  </button>
                </div>
              </div>

              {/* Zusätzliche Hinweise */}
              <div className="text-xs text-gray-400 space-y-1">
                <p>💡 Das Meeting öffnet sich in einem neuen Fenster</p>
                <p>📱 Funktioniert auf Desktop, Tablet und Handy</p>
                <p>🔗 Zoom App wird automatisch geöffnet (falls installiert)</p>
              </div>
            </div>

            {/* QR Code Area für Mobile */}
            <div className="absolute bottom-4 left-4 bg-white p-2 rounded hidden lg:block">
              <div className="w-16 h-16 bg-gray-800 rounded flex items-center justify-center text-white text-xs">
                QR
              </div>
              <p className="text-xs text-gray-600 mt-1 text-center">Mobile Join</p>
            </div>
          </div>

          {/* Zoom Logo */}
          <div className="absolute bottom-4 right-4 text-blue-400 text-sm flex items-center">
            <span className="mr-2">Powered by</span>
            <span className="font-bold">Zoom</span>
          </div>
        </div>
      </div>

      {/* Meeting Instruktionen für verschiedene Geräte */}
      <div className="mt-4 bg-gray-50 rounded-lg">
        <div className="p-4">
          <h4 className="font-semibold mb-3 text-gray-800">📱 So treten Sie bei:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h5 className="font-medium text-blue-600">💻 Desktop</h5>
              <p className="text-gray-600">Klicken Sie auf "Meeting beitreten" - Zoom öffnet sich automatisch im Browser oder der App</p>
            </div>
            <div className="space-y-2">
              <h5 className="font-medium text-green-600">📱 Handy</h5>
              <p className="text-gray-600">Zoom App öffnet sich automatisch. Falls nicht installiert, wird Download angeboten</p>
            </div>
            <div className="space-y-2">
              <h5 className="font-medium text-purple-600">🌐 Browser</h5>
              <p className="text-gray-600">Wählen Sie "Im Browser beitreten" falls die App nicht gewünscht ist</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoomLiveStream;