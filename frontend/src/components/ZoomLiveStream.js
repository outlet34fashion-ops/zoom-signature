import React, { useState, useEffect } from 'react';

const ZoomLiveStream = ({ 
  isHost = false, 
  sessionTopic = "outlet34_live_shopping",
  onSessionEnd,
  productData = []
}) => {
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [viewerCount, setViewerCount] = useState(37);
  
  // Ihre Zoom Meeting Details
  const ZOOM_MEETING_ID = "5183673726";
  const ZOOM_PASSWORD = "outlet34";
  const ZOOM_HOST_URL = `https://us02web.zoom.us/j/${ZOOM_MEETING_ID}?pwd=UEVMNEoyREZhdEQvNVNRNTNkRDFLQT09`;
  
  // Direkter Viewer-Link für eingebetteten Stream
  const ZOOM_VIEWER_EMBED = `https://us02web.zoom.us/wc/join/${ZOOM_MEETING_ID}?pwd=${ZOOM_PASSWORD}&tk=`;
  
  // Simuliere Live-Status Updates
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount(prev => prev + Math.floor(Math.random() * 3) - 1);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Admin startet Zoom als Host
  const startHostStream = () => {
    window.open(ZOOM_HOST_URL, '_blank', 'width=1200,height=800');
    setIsStreamActive(true);
  };

  // Kunde sieht direkten Stream
  const renderCustomerStream = () => {
    return (
      <div className="customer-stream-view">
        {/* Eingebetteter Zoom Web Client für Viewer */}
        <div className="zoom-embed-container">
          <iframe
            src={`https://us02web.zoom.us/wc/join/${ZOOM_MEETING_ID}?pwd=${ZOOM_PASSWORD}&uname=Kunde_${Date.now()}&meeting_result=success`}
            style={{
              width: '100%',
              height: '400px',
              border: 'none',
              borderRadius: '8px'
            }}
            allow="microphone; camera; display-capture"
            title="OUTLET34 Live Shopping Stream"
          />
        </div>
        
        {/* Fallback für direkten Join */}
        <div className="stream-fallback mt-4 text-center">
          <p className="text-gray-300 text-sm mb-2">
            Stream wird geladen... Falls der Stream nicht automatisch startet:
          </p>
          <button 
            onClick={() => window.open(`https://us02web.zoom.us/wc/join/${ZOOM_MEETING_ID}?pwd=${ZOOM_PASSWORD}`, '_blank')}
            className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded text-sm"
          >
            🎥 Stream in neuem Fenster öffnen
          </button>
        </div>
      </div>
    );
  };

  // Admin Interface
  const renderAdminInterface = () => {
    return (
      <div className="admin-interface text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-pink-400">
            🎥 Host Bereich
          </h2>
          <p className="text-gray-300">
            Starten Sie Ihr Live Shopping als Zoom Host
          </p>
        </div>

        <div className="bg-gray-900 p-6 rounded-lg max-w-md mx-auto space-y-4">
          <div className="text-left space-y-3">
            <div>
              <span className="text-gray-400 text-sm">Meeting-ID:</span>
              <p className="text-white font-mono text-lg">{ZOOM_MEETING_ID}</p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Host-Passwort:</span>
              <p className="text-white font-mono text-sm">outlet34</p>
            </div>
          </div>
          
          <div className="border-t border-gray-700 pt-4">
            <button 
              onClick={startHostStream}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 px-4 rounded-lg text-lg font-semibold"
            >
              🎥 Live Shopping starten (als Host)
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-400 space-y-1">
          <p>💡 Sobald Sie live gehen, sehen Kunden automatisch Ihren Stream</p>
          <p>🎯 Kunden müssen keine Meeting-Details eingeben</p>
        </div>
      </div>
    );
  };

  return (
    <div className="zoom-live-stream">
      <div className="bg-black text-white rounded-lg overflow-hidden">
        <div className="p-6 min-h-[400px] relative">
          
          {/* Live Indicator */}
          <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center z-10">
            <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
            LIVE
          </div>

          {/* Viewer Count */}
          <div className="absolute top-4 right-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm flex items-center z-10">
            👥 {viewerCount} Zuschauer
          </div>

          {/* Main Content Area */}
          <div className="video-area relative h-full flex flex-col justify-center items-center">
            
            {isHost ? (
              /* Admin sieht Host-Interface */
              renderAdminInterface()
            ) : (
              /* Kunde sieht direkten Stream */
              <div className="customer-stream-container w-full">
                <div className="space-y-4">
                  <div className="text-center space-y-2 mb-4">
                    <h2 className="text-2xl font-bold text-pink-400">
                      🛍️ OUTLET34 Live Shopping
                    </h2>
                    <p className="text-gray-300">
                      Live Stream - Direkte Teilnahme
                    </p>
                  </div>
                  
                  {renderCustomerStream()}
                </div>
              </div>
            )}
          </div>

          {/* Zoom Branding */}
          <div className="absolute bottom-4 right-4 text-blue-400 text-sm flex items-center z-10">
            <span className="mr-2">Powered by</span>
            <span className="font-bold">Zoom</span>
          </div>
        </div>
      </div>

      {/* Info für Kunden - nur bei Kundensicht */}
      {!isHost && (
        <div className="mt-4 bg-gray-50 rounded-lg">
          <div className="p-4">
            <h4 className="font-semibold mb-3 text-gray-800">💡 Automatische Teilnahme</h4>
            <div className="text-sm text-gray-600 space-y-2">
              <p>✅ Sie sind automatisch mit dem Live Shopping verbunden</p>
              <p>✅ Kein Zoom-Account erforderlich</p>
              <p>✅ Funktioniert direkt im Browser</p>
              <p>🛍️ Schauen Sie zu und bestellen Sie live!</p>
            </div>
          </div>
        </div>
      )}

      {/* Info für Admin - nur bei Admin-Sicht */}
      {isHost && (
        <div className="mt-4 bg-blue-50 rounded-lg">
          <div className="p-4">
            <h4 className="font-semibold mb-3 text-blue-800">🎯 Host Anleitung</h4>
            <div className="text-sm text-blue-700 space-y-2">
              <p>1. Klicken Sie auf "Live Shopping starten"</p>
              <p>2. Zoom öffnet sich - loggen Sie sich als Host ein</p>
              <p>3. Starten Sie Video und Audio in Zoom</p>
              <p>4. Kunden sehen automatisch Ihren Stream hier!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZoomLiveStream;