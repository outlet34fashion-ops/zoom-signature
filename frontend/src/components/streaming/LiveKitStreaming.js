/**
 * FUNKTIONIERENDE LiveKit Streaming Komponente für OUTLET34
 * Ersetzt die nicht-funktionierenden WebRTC Lösungen
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  GridLayout,
  ParticipantTile,
  ControlBar,
  Chat,
  useTracks,
  useParticipants
} from '@livekit/components-react';
import { 
  Room,
  Track,
  ConnectionState,
  RemoteParticipant,
  LocalParticipant 
} from 'livekit-client';

// Import LiveKit styles
import '@livekit/components-styles';
import './LiveKitStreaming.css';

const LiveKitStreaming = ({ 
  isAdmin = false, 
  onClose,
  currentUser,
  embedded = false 
}) => {
  const [room, setRoom] = useState(null);
  const [token, setToken] = useState(null);
  const [serverUrl, setServerUrl] = useState(null);
  const [roomName, setRoomName] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);

  // Get backend URL from environment
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  /**
   * LiveKit Room erstellen oder beitreten
   */
  const createOrJoinRoom = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      console.log('🚀 Starting LiveKit session...');

      if (isAdmin) {
        // Admin: Neuen Room erstellen
        console.log('👑 Creating room as admin...');
        
        const roomResponse = await fetch(`${backendUrl}/api/livekit/rooms/quick-create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            product_id: `product_${Date.now()}`,
            admin_name: currentUser?.name || 'outlet34-admin'
          }),
        });

        if (!roomResponse.ok) {
          throw new Error(`Room creation failed: ${roomResponse.status}`);
        }

        const roomData = await roomResponse.json();
        console.log('✅ Room created:', roomData);

        setToken(roomData.admin_token.token);
        setServerUrl(roomData.admin_token.livekit_url);
        setRoomName(roomData.room.room_name);

      } else {
        // Viewer: Bestehenden Room joinen oder Default Room
        console.log('👤 Joining as viewer...');

        // Zuerst verfügbare Rooms checken
        const roomsResponse = await fetch(`${backendUrl}/api/livekit/rooms/list`);
        const roomsData = await roomsResponse.json();

        let targetRoomName = 'outlet34-default-room';
        
        if (roomsData.success && roomsData.rooms.length > 0) {
          // Ersten verfügbaren Room joinen
          targetRoomName = roomsData.rooms[0].name;
          console.log(`📺 Joining existing room: ${targetRoomName}`);
        } else {
          console.log('📺 No rooms available, will create default room');
          // Default Room erstellen falls nötig
          try {
            await fetch(`${backendUrl}/api/livekit/rooms/create`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: targetRoomName,
                product_id: 'default',
                max_participants: 100
              })
            });
          } catch (createError) {
            console.warn('Could not create default room, continuing anyway');
          }
        }

        // Viewer Token generieren
        const tokenResponse = await fetch(`${backendUrl}/api/livekit/tokens/quick-generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room_name: targetRoomName,
            user_id: currentUser?.id || `viewer_${Date.now()}`,
            is_admin: false
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error(`Token generation failed: ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json();
        console.log('✅ Viewer token generated:', tokenData);

        setToken(tokenData.token);
        setServerUrl(tokenData.livekit_url);
        setRoomName(tokenData.room_name);
      }

    } catch (err) {
      console.error('❌ LiveKit setup failed:', err);
      setError(`LiveKit Setup Fehler: ${err.message}`);
      setIsConnecting(false);
    }
  };

  /**
   * Room Connection Handler
   */
  const handleRoomConnect = useCallback((room) => {
    console.log('🔗 Connected to LiveKit room:', room.name);
    setRoom(room);
    setIsConnected(true);
    setIsConnecting(false);

    // Participant tracking
    room.on('participantConnected', (participant) => {
      console.log('👤 Participant joined:', participant.identity);
      setViewerCount(prev => prev + 1);
    });

    room.on('participantDisconnected', (participant) => {
      console.log('👋 Participant left:', participant.identity);
      setViewerCount(prev => Math.max(0, prev - 1));
    });

  }, []);

  /**
   * Connection Error Handler
   */
  const handleConnectionError = useCallback((error) => {
    console.error('❌ LiveKit connection error:', error);
    setError(`Verbindungsfehler: ${error.message}`);
    setIsConnecting(false);
    setIsConnected(false);
  }, []);

  /**
   * Disconnect Handler
   */
  const handleDisconnect = useCallback(() => {
    console.log('📡 Disconnected from LiveKit');
    setIsConnected(false);
    setRoom(null);
    setViewerCount(0);
  }, []);

  /**
   * Component Mount Effect
   */
  useEffect(() => {
    createOrJoinRoom();
    
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [isAdmin]);

  /**
   * Custom Participant Display für Mobile
   */
  const MobileParticipantView = () => {
    const participants = useParticipants();
    const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);

    return (
      <div className="mobile-participants">
        <div className="participant-grid">
          {tracks.map((track) => (
            <ParticipantTile
              key={track.publication.trackSid}
              participant={track.participant}
              source={track.source}
              className="mobile-participant-tile"
            />
          ))}
        </div>
      </div>
    );
  };

  /**
   * Mobile Control Bar
   */
  const MobileControls = () => (
    <div className="mobile-controls">
      <ControlBar 
        variation="minimal"
        controls={{
          microphone: isAdmin,
          camera: isAdmin,
          screenShare: isAdmin,
          chat: true,
          leave: true
        }}
      />
    </div>
  );

  /**
   * Loading State
   */
  if (isConnecting) {
    return (
      <div className="livekit-loading">
        <div className="loading-content">
          <div className="loading-spinner">📡</div>
          <h2>LiveKit wird gestartet...</h2>
          <p>{isAdmin ? 'Admin-Raum wird erstellt...' : 'Live-Stream wird geladen...'}</p>
        </div>
      </div>
    );
  }

  /**
   * Error State
   */
  if (error) {
    return (
      <div className="livekit-error">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h2>LiveKit Fehler</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={createOrJoinRoom} className="retry-button">
              🔄 Erneut versuchen
            </button>
            {!embedded && (
              <button onClick={onClose} className="close-button">
                ❌ Schließen
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /**
   * Main LiveKit Room Component
   */
  if (!token || !serverUrl || !roomName) {
    return (
      <div className="livekit-setup">
        <div className="setup-content">
          <h2>⚙️ LiveKit Setup...</h2>
          <p>Verbindungsdaten werden vorbereitet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`livekit-container ${embedded ? 'embedded' : 'fullscreen'}`}>
      {/* Header für Mobile */}
      <div className="livekit-header">
        <div className="header-left">
          <div className="outlet-brand">🛍️ OUTLET34</div>
          <div className="live-indicator">
            {isConnected && <span className="live-dot">🔴</span>}
            <span>{isConnected ? 'LIVE' : 'OFFLINE'}</span>
          </div>
        </div>
        
        <div className="header-right">
          <div className="viewer-count">👥 {viewerCount}</div>
          {!embedded && (
            <button onClick={onClose} className="close-btn">✕</button>
          )}
        </div>
      </div>

      {/* LiveKit Room */}
      <LiveKitRoom
        video={isAdmin}
        audio={isAdmin}
        token={token}
        serverUrl={serverUrl}
        data-lk-theme="default"
        style={{ height: embedded ? '400px' : 'calc(100vh - 120px)' }}
        onConnected={handleRoomConnect}
        onDisconnected={handleDisconnect}
        onError={handleConnectionError}
        className="livekit-room"
      >
        {/* Mobile-Optimized Layout */}
        <div className="livekit-layout">
          
          {/* Video Area */}
          <div className="video-area">
            {isAdmin ? (
              // Admin: Full video conference interface
              <VideoConference 
                chatMessageFormatter={undefined}
                SettingsComponent={undefined}
              />
            ) : (
              // Viewer: Custom mobile-optimized view
              <MobileParticipantView />
            )}
          </div>

          {/* Chat Sidebar für Desktop, Bottom für Mobile */}
          <div className="chat-area">
            <Chat 
              className="livekit-chat"
              messageFormatter={(message, participant) => (
                <div className="chat-message">
                  <strong>{participant?.name || participant?.identity}:</strong>
                  <span>{message}</span>
                </div>
              )}
            />
          </div>

          {/* Controls */}
          <MobileControls />
        </div>
      </LiveKitRoom>

      {/* Status Indicator */}
      <div className="status-bar">
        <div className="connection-status">
          {isConnected ? '✅ Verbunden' : '📡 Verbinde...'}
        </div>
        {isAdmin && (
          <div className="admin-status">
            👑 Admin-Modus aktiv
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveKitStreaming;