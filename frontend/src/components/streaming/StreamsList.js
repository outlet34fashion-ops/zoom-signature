import React, { useState, useEffect } from 'react';

const StreamsList = ({ onJoinStream, backendUrl = null }) => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get backend URL from environment
  const getBackendUrl = () => {
    if (backendUrl) return backendUrl;
    return process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
  };

  // Fetch active streams
  const fetchActiveStreams = async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/streams/active`);
      
      if (response.ok) {
        const data = await response.json();
        setStreams(data.streams || []);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to fetch streams');
      }
    } catch (error) {
      console.error('Error fetching active streams:', error);
      setError('Verbindungsfehler beim Laden der Streams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveStreams();
    
    // Refresh stream list every 30 seconds
    const interval = setInterval(fetchActiveStreams, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Format date/time for display
  const formatDateTime = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unbekannt';
    }
  };

  if (loading) {
    return (
      <div className="streams-list w-full max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Lade aktive Streams...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="streams-list w-full max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Fehler:</strong> {error}
          </div>
          <button
            onClick={fetchActiveStreams}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            🔄 Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="streams-list w-full max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📺</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Keine aktiven Streams
            </h3>
            <p className="text-gray-600 mb-4">
              Momentan sind keine Live-Streams verfügbar.
            </p>
            <button
              onClick={fetchActiveStreams}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              🔄 Aktualisieren
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="streams-list w-full max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          🔴 Live-Streams ({streams.length})
        </h2>
        <button
          onClick={fetchActiveStreams}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors text-sm"
        >
          🔄 Aktualisieren
        </button>
      </div>
      
      <div className="space-y-4">
        {streams.map((stream) => (
          <div 
            key={stream.stream_id} 
            className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:border-blue-300 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="inline-block w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                  <span className="text-sm font-medium text-red-600 uppercase">LIVE</span>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {stream.stream_title || 'Live Shopping Stream'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center space-x-2">
                    <span>👥</span>
                    <span>
                      {stream.viewer_count} / {stream.max_viewers} Zuschauer
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>🕒</span>
                    <span>Gestartet: {formatDateTime(stream.created_at)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>📡</span>
                    <span className="text-green-600 font-medium">
                      {stream.status === 'active' ? 'Aktiv' : stream.status}
                    </span>
                  </div>
                </div>
                
                {stream.viewer_count >= stream.max_viewers && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-lg text-sm mb-4">
                    ⚠️ Stream ist derzeit ausgelastet
                  </div>
                )}
              </div>
              
              <div className="ml-4">
                <button 
                  onClick={() => onJoinStream(stream.stream_id)}
                  disabled={stream.viewer_count >= stream.max_viewers}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    stream.viewer_count >= stream.max_viewers
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {stream.viewer_count >= stream.max_viewers ? (
                    <>🚫 Ausgelastet</>
                  ) : (
                    <>▶️ Stream beitreten</>
                  )}
                </button>
              </div>
            </div>
            
            {/* Progress bar for viewer capacity */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Kapazität</span>
                <span>{Math.round((stream.viewer_count / stream.max_viewers) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    stream.viewer_count >= stream.max_viewers
                      ? 'bg-red-500'
                      : stream.viewer_count / stream.max_viewers > 0.8
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ 
                    width: `${Math.min((stream.viewer_count / stream.max_viewers) * 100, 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StreamsList;