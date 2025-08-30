/**
 * Simple LiveKit Streaming Component
 * Direct LiveKit Client integration without problematic React Hooks
 * Avoids context errors by using direct API calls
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Room, connect, RoomEvent, Track } from 'livekit-client';
import './SimpleLiveKitStreaming.css';

const SimpleLiveKitStreaming = ({ 
    token, 
    serverUrl, 
    roomName,
    isPublisher = false,
    onDisconnected,
    onError,
    onConnected 
}) => {
    const [connectionState, setConnectionState] = useState('disconnected'); // disconnected, connecting, connected, error
    const [error, setError] = useState(null);
    const [viewerCount, setViewerCount] = useState(0);
    const [showChat, setShowChat] = useState(true);
    const [isCameraEnabled, setIsCameraEnabled] = useState(true);
    const [isMicEnabled, setIsMicEnabled] = useState(true);
    const [facingMode, setFacingMode] = useState('user');
    
    const roomRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideosRef = useRef(new Map());
    const chatMessagesRef = useRef([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');

    // Connect to LiveKit room using direct client API with retry logic
    const connectToRoom = useCallback(async () => {
        if (!token || !serverUrl) {
            setError('Token oder Server URL fehlt');
            return;
        }

        const maxRetries = 3;
        let retryCount = 0;

        const attemptConnection = async () => {
            try {
                setConnectionState('connecting');
                setError(null);

                console.log(`🔄 Connecting to LiveKit (Attempt ${retryCount + 1}/${maxRetries})`);
                console.log('Server URL:', serverUrl);
                console.log('Token length:', token.length);

                // Create room instance with optimized settings
                const room = new Room({
                    videoCaptureDefaults: {
                        resolution: { width: 1920, height: 1080 },
                        frameRate: 30
                    },
                    publishDefaults: {
                        videoSimulcastLayers: [
                            { resolution: { width: 1920, height: 1080 }, encoding: { maxBitrate: 3500000 } },
                            { resolution: { width: 1280, height: 720 }, encoding: { maxBitrate: 1500000 } },
                            { resolution: { width: 640, height: 360 }, encoding: { maxBitrate: 500000 } }
                        ],
                        audioPreset: {
                            maxBitrate: 128000
                        }
                    },
                    audioCaptureDefaults: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    },
                    // Add connection options for better stability
                    adaptiveStream: true,
                    dynacast: true
                });

                roomRef.current = room;

                // Set up event listeners
                room.on(RoomEvent.Connected, () => {
                    console.log('✅ Successfully connected to LiveKit room');
                    setConnectionState('connected');
                    if (onConnected) onConnected();
                });

                room.on(RoomEvent.Disconnected, (reason) => {
                    console.log('❌ Disconnected from room:', reason);
                    setConnectionState('disconnected');
                    if (onDisconnected) onDisconnected(reason);
                    cleanup();
                });

                room.on(RoomEvent.ParticipantConnected, (participant) => {
                    console.log('👤 Participant connected:', participant.identity);
                    updateViewerCount();
                    handleParticipantTracks(participant);
                });

                room.on(RoomEvent.ParticipantDisconnected, () => {
                    console.log('👤 Participant disconnected');
                    updateViewerCount();
                });

                room.on(RoomEvent.TrackPublished, (publication, participant) => {
                    console.log('🎥 Track published:', publication.trackSid);
                });

                room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                    console.log('🎥 Track subscribed:', track.sid);
                    handleTrackSubscribed(track, participant);
                });

                room.on(RoomEvent.DataReceived, (payload, participant) => {
                    // Handle chat messages
                    try {
                        const message = JSON.parse(new TextDecoder().decode(payload));
                        if (message.type === 'chat') {
                            const newMsg = {
                                id: Date.now(),
                                participant: participant?.identity || 'Unknown',
                                message: message.text,
                                timestamp: new Date()
                            };
                            chatMessagesRef.current.push(newMsg);
                            setChatMessages([...chatMessagesRef.current]);
                        }
                    } catch (error) {
                        console.error('Error parsing chat message:', error);
                    }
                });

                // Add error handling
                room.on(RoomEvent.Reconnecting, () => {
                    console.log('🔄 Reconnecting to LiveKit...');
                    setConnectionState('connecting');
                });

                room.on(RoomEvent.Reconnected, () => {
                    console.log('✅ Reconnected to LiveKit');
                    setConnectionState('connected');
                });

                // Connect to room with timeout
                const connectTimeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Connection timeout')), 10000)
                );

                await Promise.race([
                    room.connect(serverUrl, token),
                    connectTimeout
                ]);

                console.log('✅ Connection established, room state:', room.state);

                // If publisher, enable camera and microphone after connection
                if (isPublisher) {
                    setTimeout(async () => {
                        try {
                            await enableCamera();
                            await enableMicrophone();
                        } catch (err) {
                            console.warn('Error enabling media after connection:', err);
                        }
                    }, 1000);
                }

            } catch (err) {
                console.error(`❌ Connection attempt ${retryCount + 1} failed:`, err);
                
                retryCount++;
                
                if (retryCount < maxRetries) {
                    console.log(`🔄 Retrying connection in ${retryCount * 2} seconds...`);
                    setError(`Verbindungsversuch ${retryCount}/${maxRetries} - Erneuter Versuch...`);
                    
                    await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
                    return attemptConnection();
                } else {
                    console.error('❌ All connection attempts failed');
                    setError(`Verbindung fehlgeschlagen nach ${maxRetries} Versuchen: ${err.message}`);
                    setConnectionState('error');
                    if (onError) onError(err);
                }
            }
        };

        return attemptConnection();
    }, [token, serverUrl, isPublisher, onConnected, onDisconnected, onError]);

    // Handle participant tracks
    const handleParticipantTracks = (participant) => {
        participant.trackPublications.forEach((publication) => {
            if (publication.track) {
                handleTrackSubscribed(publication.track, participant);
            }
        });
    };

    // Handle track subscription
    const handleTrackSubscribed = (track, participant) => {
        if (track.kind === Track.Kind.Video) {
            const videoElement = document.createElement('video');
            videoElement.autoplay = true;
            videoElement.playsInline = true;
            videoElement.controls = false;
            videoElement.style.width = '100%';
            videoElement.style.height = '100%';
            videoElement.style.objectFit = 'cover';
            
            track.attach(videoElement);
            
            // Store reference
            remoteVideosRef.current.set(participant.sid, {
                element: videoElement,
                track: track,
                participant: participant
            });

            // Add to DOM
            const remoteVideoContainer = document.getElementById('remote-videos-container');
            if (remoteVideoContainer) {
                const participantDiv = document.createElement('div');
                participantDiv.id = `participant-${participant.sid}`;
                participantDiv.className = 'remote-participant';
                participantDiv.appendChild(videoElement);
                
                const nameLabel = document.createElement('div');
                nameLabel.className = 'participant-name';
                nameLabel.textContent = participant.identity;
                participantDiv.appendChild(nameLabel);
                
                remoteVideoContainer.appendChild(participantDiv);
            }
        }
    };

    // Enable camera
    const enableCamera = async () => {
        if (!roomRef.current) return;

        try {
            await roomRef.current.localParticipant.setCameraEnabled(true);
            
            // Get local video track and attach to video element
            const videoTrack = roomRef.current.localParticipant.videoTrackPublications.values().next().value?.track;
            if (videoTrack && localVideoRef.current) {
                videoTrack.attach(localVideoRef.current);
            }
            
            setIsCameraEnabled(true);
        } catch (error) {
            console.error('Error enabling camera:', error);
            setError(`Kamera-Fehler: ${error.message}`);
        }
    };

    // Enable microphone
    const enableMicrophone = async () => {
        if (!roomRef.current) return;

        try {
            await roomRef.current.localParticipant.setMicrophoneEnabled(true);
            setIsMicEnabled(true);
        } catch (error) {
            console.error('Error enabling microphone:', error);
        }
    };

    // Toggle camera
    const toggleCamera = useCallback(async () => {
        if (!roomRef.current) return;

        try {
            const newState = !isCameraEnabled;
            await roomRef.current.localParticipant.setCameraEnabled(newState);
            setIsCameraEnabled(newState);
        } catch (error) {
            console.error('Error toggling camera:', error);
        }
    }, [isCameraEnabled]);

    // Toggle microphone
    const toggleMicrophone = useCallback(async () => {
        if (!roomRef.current) return;

        try {
            const newState = !isMicEnabled;
            await roomRef.current.localParticipant.setMicrophoneEnabled(newState);
            setIsMicEnabled(newState);
        } catch (error) {
            console.error('Error toggling microphone:', error);
        }
    }, [isMicEnabled]);

    // Flip camera (front/back)
    const flipCamera = useCallback(async () => {
        if (!roomRef.current) return;

        try {
            const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
            
            // Switch camera device
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            if (videoDevices.length > 1) {
                // Find device with different facing mode
                const currentDeviceId = roomRef.current.localParticipant.videoTrackPublications.values().next().value?.track?.mediaStreamTrack?.getSettings().deviceId;
                const nextDevice = videoDevices.find(device => device.deviceId !== currentDeviceId);
                
                if (nextDevice) {
                    await roomRef.current.localParticipant.switchActiveDevice('videoinput', nextDevice.deviceId);
                    setFacingMode(newFacingMode);
                }
            }
        } catch (error) {
            console.error('Error flipping camera:', error);
        }
    }, [facingMode]);

    // Update viewer count
    const updateViewerCount = () => {
        if (roomRef.current) {
            const count = roomRef.current.remoteParticipants.size + (isPublisher ? 0 : 1);
            setViewerCount(count);
        }
    };

    // Send chat message
    const sendChatMessage = useCallback(async () => {
        if (!roomRef.current || !newMessage.trim()) return;

        try {
            const message = {
                type: 'chat',
                text: newMessage.trim(),
                timestamp: Date.now()
            };

            const encoder = new TextEncoder();
            await roomRef.current.localParticipant.publishData(encoder.encode(JSON.stringify(message)));
            
            // Add to local messages
            const localMsg = {
                id: Date.now(),
                participant: 'You',
                message: newMessage.trim(),
                timestamp: new Date()
            };
            chatMessagesRef.current.push(localMsg);
            setChatMessages([...chatMessagesRef.current]);
            
            setNewMessage('');
        } catch (error) {
            console.error('Error sending chat message:', error);
        }
    }, [newMessage]);

    // Cleanup
    const cleanup = () => {
        if (roomRef.current) {
            roomRef.current.disconnect();
            roomRef.current = null;
        }
        
        // Clean up video elements
        remoteVideosRef.current.forEach(({ element, track }) => {
            track.detach(element);
            element.remove();
        });
        remoteVideosRef.current.clear();
        
        setConnectionState('disconnected');
        setViewerCount(0);
    };

    // Connect on mount
    useEffect(() => {
        connectToRoom();
        
        // Cleanup on unmount
        return () => {
            cleanup();
        };
    }, [connectToRoom]);

    // Error state
    if (connectionState === 'error') {
        return (
            <div className="livekit-error-container">
                <div className="livekit-error-message">
                    <h3>🚨 Verbindungsfehler</h3>
                    <p>{error}</p>
                    <button 
                        onClick={connectToRoom}
                        className="retry-btn"
                    >
                        🔄 Erneut versuchen
                    </button>
                </div>
            </div>
        );
    }

    // Connecting state
    if (connectionState === 'connecting') {
        return (
            <div className="livekit-connecting-container">
                <div className="connecting-animation">
                    <div className="spinner">🔄</div>
                    <h3>Verbindung zu LiveKit...</h3>
                    <p>HD-Stream wird initialisiert...</p>
                    <div className="progress-bar">
                        <div className="progress-fill"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Connected streaming interface
    return (
        <div className="simple-livekit-container">
            {/* Header */}
            <div className="streaming-header">
                <div className="live-info">
                    <div className="live-badge">
                        <span className="live-dot"></span>
                        LIVE
                    </div>
                    <div className="viewer-count">
                        👥 {viewerCount} Zuschauer
                    </div>
                </div>
                
                <button 
                    className="chat-toggle"
                    onClick={() => setShowChat(!showChat)}
                >
                    💬 Chat {showChat ? 'ausblenden' : 'einblenden'}
                </button>
            </div>

            <div className={`streaming-layout ${showChat ? 'with-chat' : 'full-width'}`}>
                {/* Video Area */}
                <div className="video-area">
                    {/* Local video (publisher only) */}
                    {isPublisher && (
                        <div className="local-video-container">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="local-video"
                            />
                            <div className="local-label">Sie (Live)</div>
                        </div>
                    )}

                    {/* Remote videos container */}
                    <div id="remote-videos-container" className="remote-videos">
                        {/* Remote participant videos will be added here dynamically */}
                    </div>

                    {/* Publisher controls */}
                    {isPublisher && (
                        <div className="publisher-controls">
                            <button 
                                className={`control-btn ${isCameraEnabled ? 'active' : 'inactive'}`}
                                onClick={toggleCamera}
                            >
                                {isCameraEnabled ? '📹' : '📹❌'}
                            </button>
                            
                            <button 
                                className={`control-btn ${isMicEnabled ? 'active' : 'inactive'}`}
                                onClick={toggleMicrophone}
                            >
                                {isMicEnabled ? '🎤' : '🎤❌'}
                            </button>

                            <button 
                                className="control-btn"
                                onClick={flipCamera}
                            >
                                🔄
                            </button>
                        </div>
                    )}
                </div>

                {/* Chat sidebar */}
                {showChat && (
                    <div className="chat-sidebar">
                        <div className="chat-header">
                            <h3>Live Chat</h3>
                        </div>
                        
                        <div className="chat-messages">
                            {chatMessages.map((msg) => (
                                <div key={msg.id} className="chat-message">
                                    <div className="message-header">
                                        <span className="message-author">{msg.participant}</span>
                                        <span className="message-time">
                                            {msg.timestamp.toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div className="message-text">{msg.message}</div>
                                </div>
                            ))}
                        </div>

                        <div className="chat-input">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                                placeholder="Nachricht eingeben..."
                                className="message-input"
                            />
                            <button 
                                onClick={sendChatMessage}
                                className="send-btn"
                                disabled={!newMessage.trim()}
                            >
                                ➤
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SimpleLiveKitStreaming;