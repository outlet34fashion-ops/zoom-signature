/**
 * LiveKit Room Manager
 * Handles room creation, joining, and management
 */

import React, { useState, useEffect, useCallback } from 'react';
import SimpleLiveKitStreaming from './SimpleLiveKitStreaming';
import livekitService from '../../services/livekitService';
import './LiveKitRoomManager.css';

const LiveKitRoomManager = ({ 
    isAdmin = false, 
    currentUser, 
    onClose,
    initialRoomName = null 
}) => {
    const [currentState, setCurrentState] = useState('lobby'); // 'lobby', 'creating', 'joining', 'streaming'
    const [rooms, setRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [token, setToken] = useState(null);
    const [serverUrl, setServerUrl] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [roomName, setRoomName] = useState(initialRoomName || '');
    const [capabilities, setCapabilities] = useState(null);

    // Check device capabilities on mount
    useEffect(() => {
        const checkCapabilities = async () => {
            try {
                const caps = await livekitService.checkDeviceCapabilities();
                setCapabilities(caps);
                
                if (!caps.webrtc) {
                    setError('WebRTC wird von diesem Browser nicht unterstützt');
                }
            } catch (err) {
                console.error('Error checking capabilities:', err);
                setError('Gerätezugriff konnte nicht geprüft werden');
            }
        };

        checkCapabilities();
    }, []);

    // Load active rooms
    useEffect(() => {
        if (currentState === 'lobby') {
            loadActiveRooms();
        }
    }, [currentState]);

    // Auto-join room if initialRoomName is provided
    useEffect(() => {
        if (initialRoomName && !isAdmin) {
            handleJoinRoom(initialRoomName);
        }
    }, [initialRoomName, isAdmin]);

    const loadActiveRooms = async () => {
        try {
            setLoading(true);
            const activeRooms = await livekitService.getActiveRooms();
            setRooms(activeRooms.filter(room => room.isLive));
        } catch (err) {
            console.error('Error loading rooms:', err);
            setError('Aktive Räume konnten nicht geladen werden');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRoom = async () => {
        if (!isAdmin) {
            setError('Nur Administratoren können Räume erstellen');
            return;
        }

        if (!roomName.trim()) {
            setError('Bitte geben Sie einen Raum-Namen ein');
            return;
        }

        try {
            setLoading(true);
            setCurrentState('creating');
            setError(null);

            // Create room
            const roomInfo = await livekitService.createRoom(
                roomName,
                50, // max participants
                { 
                    created_by: currentUser?.customer_number || 'admin',
                    type: 'live_shopping',
                    timestamp: Date.now(),
                    description: 'HD Live Shopping Stream'
                }
            );

            console.log('Room created:', roomInfo);

            // Generate publisher token
            const tokenResponse = await livekitService.generatePublisherToken(
                roomName,
                currentUser?.name || 'Admin',
                { 
                    role: 'publisher', 
                    user_id: currentUser?.customer_number || 'admin'
                }
            );

            setToken(tokenResponse.token);
            setServerUrl(tokenResponse.livekitUrl);
            setSelectedRoom({ roomName, ...roomInfo });
            setCurrentState('streaming');

        } catch (err) {
            console.error('Error creating room:', err);
            setError(err.message || 'Raum konnte nicht erstellt werden');
            setCurrentState('lobby');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRoom = async (roomNameToJoin) => {
        try {
            setLoading(true);
            setCurrentState('joining');
            setError(null);

            const targetRoomName = roomNameToJoin || selectedRoom?.roomName;
            
            if (!targetRoomName) {
                throw new Error('Kein Raum ausgewählt');
            }

            // Check if room exists and is active
            const roomInfo = await livekitService.getRoomInfo(targetRoomName);
            if (!roomInfo || !roomInfo.isLive) {
                throw new Error('Raum ist nicht aktiv oder existiert nicht');
            }

            // Generate viewer token
            const tokenResponse = await livekitService.generateViewerToken(
                targetRoomName,
                currentUser?.name || 'Zuschauer',
                { 
                    role: 'viewer', 
                    user_id: currentUser?.customer_number || 'guest'
                }
            );

            setToken(tokenResponse.token);
            setServerUrl(tokenResponse.livekitUrl);
            setSelectedRoom({ roomName: targetRoomName, ...roomInfo.room });
            setCurrentState('streaming');

        } catch (err) {
            console.error('Error joining room:', err);
            setError(err.message || 'Raum konnte nicht beigetreten werden');
            setCurrentState('lobby');
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveRoom = useCallback(async () => {
        try {
            // If admin and room owner, optionally end the room
            if (isAdmin && selectedRoom) {
                // Could add option to end room for everyone
                // await livekitService.endRoom(selectedRoom.roomName);
            }

            // Reset state
            setToken(null);
            setServerUrl(null);
            setSelectedRoom(null);
            setCurrentState('lobby');
            
            // Reload rooms
            await loadActiveRooms();

        } catch (err) {
            console.error('Error leaving room:', err);
        }
    }, [isAdmin, selectedRoom]);

    const handleStreamingError = useCallback((error) => {
        console.error('Streaming error:', error);
        setError(`Streaming-Fehler: ${error.message}`);
        // Don't automatically leave on error, let user decide
    }, []);

    const handleLiveKitStreamClose = useCallback((reason) => {
        console.log('Disconnected from stream:', reason);
        
        // Auto-return to lobby after disconnect
        setTimeout(() => {
            handleLeaveRoom();
        }, 2000);
    }, [handleLeaveRoom]);

    // Render streaming interface
    if (currentState === 'streaming' && token && serverUrl) {
        return (
            <SimpleLiveKitStreaming
                token={token}
                serverUrl={serverUrl}
                roomName={selectedRoom?.roomName}
                isPublisher={isAdmin}
                onDisconnected={handleLiveKitStreamClose}
                onError={handleStreamingError}
                onConnected={() => console.log('Connected to LiveKit streaming')}
            />
        );
    }

    // Render lobby/management interface
    return (
        <div className="livekit-room-manager">
            <div className="room-manager-header">
                <h2>
                    {isAdmin ? '📹 Live Stream starten' : '👥 Live Streams'}
                </h2>
                <button className="close-btn" onClick={onClose}>
                    ✕
                </button>
            </div>

            {error && (
                <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    <span>{error}</span>
                    <button 
                        className="error-dismiss"
                        onClick={() => setError(null)}
                    >
                        ✕
                    </button>
                </div>
            )}

            {capabilities && !capabilities.webrtc && (
                <div className="warning-message">
                    <span className="warning-icon">⚠️</span>
                    <span>WebRTC wird von diesem Browser nicht vollständig unterstützt</span>
                </div>
            )}

            {/* Admin: Create Room Section */}
            {isAdmin && (
                <div className="create-room-section">
                    <h3>Neuen Stream erstellen</h3>
                    <div className="create-room-form">
                        <input
                            type="text"
                            placeholder="Raum-Name (z.B. Live-Shopping-Demo)"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            disabled={loading || currentState !== 'lobby'}
                            className="room-name-input"
                        />
                        <button
                            onClick={handleCreateRoom}
                            disabled={loading || !roomName.trim() || currentState !== 'lobby'}
                            className="create-room-btn"
                        >
                            {loading && currentState === 'creating' 
                                ? '🔄 Erstelle Raum...' 
                                : '📹 Stream starten'
                            }
                        </button>
                    </div>
                    
                    {capabilities && (
                        <div className="capabilities-info">
                            <h4>Gerätestatus:</h4>
                            <div className="capability-list">
                                <span className={capabilities.camera ? 'supported' : 'not-supported'}>
                                    {capabilities.camera ? '✅' : '❌'} Kamera
                                </span>
                                <span className={capabilities.microphone ? 'supported' : 'not-supported'}>
                                    {capabilities.microphone ? '✅' : '❌'} Mikrofon
                                </span>
                                <span className={capabilities.h264 ? 'supported' : 'not-supported'}>
                                    {capabilities.h264 ? '✅' : '❌'} H.264 Codec
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Active Rooms Section */}
            <div className="active-rooms-section">
                <div className="section-header">
                    <h3>
                        {isAdmin ? 'Aktive Streams verwalten' : 'Verfügbare Live Streams'}
                    </h3>
                    <button 
                        onClick={loadActiveRooms} 
                        disabled={loading}
                        className="refresh-btn"
                    >
                        🔄 Aktualisieren
                    </button>
                </div>

                {loading && currentState === 'lobby' ? (
                    <div className="loading-message">
                        <span className="loading-spinner">🔄</span>
                        <span>Lade aktive Räume...</span>
                    </div>
                ) : rooms.length === 0 ? (
                    <div className="no-rooms-message">
                        <span className="no-rooms-icon">📺</span>
                        <span>
                            {isAdmin 
                                ? 'Keine aktiven Streams. Erstellen Sie einen neuen Stream.' 
                                : 'Momentan sind keine Live Streams verfügbar.'
                            }
                        </span>
                    </div>
                ) : (
                    <div className="rooms-list">
                        {rooms.map((room) => (
                            <div key={room.roomName} className="room-card">
                                <div className="room-info">
                                    <div className="room-name">
                                        <span className="live-indicator">🔴</span>
                                        {room.roomName}
                                    </div>
                                    <div className="room-stats">
                                        <span>👥 {room.numParticipants} Zuschauer</span>
                                        <span>📅 {new Date(room.creationTime * 1000).toLocaleTimeString('de-DE')}</span>
                                    </div>
                                    {/* DEBUG INFO */}
                                    <div className="debug-info" style={{fontSize: '10px', color: '#666'}}>
                                        Admin: {isAdmin ? 'Ja' : 'Nein'} | Loading: {loading ? 'Ja' : 'Nein'} | State: {currentState}
                                    </div>
                                </div>
                                <div className="room-actions" style={{ display: 'flex !important', visibility: 'visible', opacity: 1 }}>
                                    <button
                                        onClick={() => handleJoinRoom(room.roomName)}
                                        disabled={loading || currentState !== 'lobby'}
                                        className="join-room-btn"
                                        style={{
                                            display: 'block !important',
                                            visibility: 'visible !important',
                                            opacity: '1 !important',
                                            backgroundColor: isAdmin ? '#f59e0b' : '#10b981',
                                            color: 'white',
                                            padding: '8px 16px',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {loading && currentState === 'joining' 
                                            ? '🔄 Beitritt...' 
                                            : isAdmin ? '⚙️ Verwalten' : '👀 Zuschauen'
                                        }
                                    </button>
                                    
                                    {isAdmin && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await livekitService.endRoom(room.roomName);
                                                    await loadActiveRooms();
                                                } catch (err) {
                                                    setError(`Stream konnte nicht beendet werden: ${err.message}`);
                                                }
                                            }}
                                            disabled={loading}
                                            className="end-room-btn"
                                        >
                                            🛑 Beenden
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Instructions */}
            {!isAdmin && rooms.length > 0 && (
                <div className="instructions">
                    <h4>💡 Hinweise:</h4>
                    <ul>
                        <li>Klicken Sie auf "Zuschauen" um einem Live Stream beizutreten</li>
                        <li>Sie können während des Streams chatten</li>
                        <li>Für die beste Qualität nutzen Sie eine stabile Internetverbindung</li>
                    </ul>
                </div>
            )}

            {isAdmin && (
                <div className="admin-instructions">
                    <h4>📋 Admin-Anweisungen:</h4>
                    <ul>
                        <li>Geben Sie einen eindeutigen Namen für Ihren Stream ein</li>
                        <li>Stellen Sie sicher, dass Kamera und Mikrofon aktiviert sind</li>
                        <li>Für iPhone: Verwenden Sie Safari Browser für beste Kompatibilität</li>
                        <li>Empfohlene Auflösung: 1080p @ 30fps</li>
                        <li>Ziel-Bitrate: 3.5-5 Mbit/s für optimale Qualität</li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default LiveKitRoomManager;