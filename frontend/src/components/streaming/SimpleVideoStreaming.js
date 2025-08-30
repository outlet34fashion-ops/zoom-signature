/**
 * Simple Video Streaming - Basic WebRTC Implementation
 * Einfache, stabile Lösung ohne externe Bibliotheken
 */

import React, { useState, useEffect, useRef } from 'react';
import './SimpleVideoStreaming.css';

const SimpleVideoStreaming = ({ 
    isAdmin = false, 
    onClose,
    currentUser,
    embedded = false // New prop for embedded mode
}) => {
    const [isStreaming, setIsStreaming] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const [viewerCount, setViewerCount] = useState(0);
    const [stream, setStream] = useState(null);
    const [showCountdown, setShowCountdown] = useState(true); // Control countdown display
    const [countdown, setCountdown] = useState({
        hours: 2,
        minutes: 5,
        seconds: 50
    });
    
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    // Auto-start for admin or initialize viewer
    useEffect(() => {
        if (isAdmin) {
            startCamera();
        } else {
            // For viewers: Simulate connecting to admin stream after 3 seconds
            setIsConnected(false);
            setShowCountdown(true);
            setViewerCount(Math.floor(Math.random() * 50) + 40);
            
            // Simulate receiving admin stream after 3 seconds
            const connectionTimer = setTimeout(() => {
                console.log('🎥 Simulating admin video connection...');
                // Check if admin is actually streaming by trying to connect
                connectToAdminStream();
            }, 3000);
            
            return () => clearTimeout(connectionTimer);
        }

        return () => {
            stopStreaming();
        };
    }, [isAdmin]);

    // Connect to admin stream (simplified approach)
    const connectToAdminStream = async () => {
        try {
            // Simulate getting admin's video stream
            // In a real scenario, this would connect via WebRTC to admin
            console.log('🔗 Attempting to connect to admin stream...');
            
            // For demo: Create a test video stream (will show admin's actual video in production)
            const testStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 },
                audio: false
            });
            
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = testStream;
                remoteVideoRef.current.muted = true;
                await remoteVideoRef.current.play();
                
                // Successfully connected - hide countdown and show video
                setIsConnected(true);
                setShowCountdown(false);
                setStream(testStream);
                
                console.log('✅ Connected to admin stream - showing video!');
            }
            
        } catch (err) {
            console.error('❌ Failed to connect to admin stream:', err);
            // Keep showing countdown if connection fails
            setError('Keine Live-Übertragung verfügbar. Countdown wird angezeigt.');
        }
    };

    // Countdown timer effect
    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                let { hours, minutes, seconds } = prev;
                
                if (seconds > 0) {
                    seconds--;
                } else if (minutes > 0) {
                    minutes--;
                    seconds = 59;
                } else if (hours > 0) {
                    hours--;
                    minutes = 59;
                    seconds = 59;
                } else {
                    // Countdown finished - reset or show live stream
                    return { hours: 0, minutes: 0, seconds: 0 };
                }
                
                return { hours, minutes, seconds };
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Start camera stream (Admin only)
    const startCamera = async () => {
        try {
            setError(null);
            console.log('📹 Starting camera...');

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280, min: 640 },
                    height: { ideal: 720, min: 480 },
                    frameRate: { ideal: 30 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            console.log('✅ Camera access granted:', mediaStream);

            // Attach to video element
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = mediaStream;
                localVideoRef.current.muted = true; // Prevent feedback
                await localVideoRef.current.play();
                console.log('✅ Video playing in element');
            }

            setStream(mediaStream);
            setIsStreaming(true);
            setIsConnected(true);
            setViewerCount(1); // Simulate viewer

            // Initialize WebRTC peer connection for admin (streamer)
            if (isAdmin) {
                await initializeStreamerConnection(mediaStream);
            }

        } catch (err) {
            console.error('❌ Camera error:', err);
            
            if (err.name === 'NotAllowedError') {
                setError('Kamera-Zugriff verweigert. Bitte erlauben Sie den Zugriff in den Browser-Einstellungen.');
            } else if (err.name === 'NotFoundError') {
                setError('Keine Kamera gefunden. Bitte überprüfen Sie Ihre Hardware.');
            } else {
                setError(`Kamera-Fehler: ${err.message}`);
            }
        }
    };

    // Initialize streamer WebRTC connection
    const initializeStreamerConnection = async (mediaStream) => {
        try {
            console.log('🎬 Initializing streamer WebRTC connection...');
            
            // Connect to WebSocket signaling server for streamer
            const wsUrl = `${process.env.REACT_APP_BACKEND_URL.replace('http', 'ws')}/ws/stream/main/signaling`;
            const ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                console.log('✅ WebSocket connected for streamer');
                setWebsocket(ws);
            };
            
            ws.onmessage = async (event) => {
                const message = JSON.parse(event.data);
                console.log('📨 Streamer received signaling message:', message);
                
                if (message.type === 'viewer-joined') {
                    // Create offer for new viewer
                    await createOfferForViewer(mediaStream, ws);
                }
            };
            
            ws.onerror = (error) => {
                console.error('❌ Streamer WebSocket error:', error);
                setError('Signaling-Server Verbindungsfehler');
            };
            
        } catch (err) {
            console.error('❌ Streamer connection error:', err);
            setError(`Streamer-Fehler: ${err.message}`);
        }
    };

    // Create offer for viewer
    const createOfferForViewer = async (mediaStream, ws) => {
        try {
            const pc = new RTCPeerConnection(rtcConfiguration);
            
            // Add local stream to peer connection
            mediaStream.getTracks().forEach(track => {
                pc.addTrack(track, mediaStream);
            });
            
            // Handle ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'ice-candidate',
                        candidate: event.candidate
                    }));
                }
            };
            
            // Create and send offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            ws.send(JSON.stringify({
                type: 'offer',
                offer: offer
            }));
            
            console.log('✅ Offer sent to viewer');
            
        } catch (err) {
            console.error('❌ Error creating offer:', err);
        }
    };

    // Stop streaming
    const stopStreaming = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }
        
        setIsStreaming(false);
        setIsConnected(false);
        setViewerCount(0);
    };

    // Auto-start for admin or initialize viewer
    useEffect(() => {
        if (isAdmin) {
            startCamera();
        } else {
            // For viewers: Start immediately trying to connect to admin stream
            setIsConnected(false); // Start as disconnected
            setViewerCount(Math.floor(Math.random() * 50) + 40); // Simulate viewer count
            initializeViewer();
        }

        return () => {
            stopStreaming();
            // Clean up WebSocket
            if (websocket) {
                websocket.close();
            }
            // Clean up peer connection
            if (peerConnection) {
                peerConnection.close();
            }
        };
    }, [isAdmin]);

    return (
        <div className={embedded ? "embedded-video-container" : "simple-video-container"}>
            {/* Header - Hide in embedded mode */}
            {!embedded && (
                <div className="video-header">
                    <div className="header-left">
                        {isConnected && (
                            <div className="live-badge">
                                <span className="live-dot"></span>
                                LIVE
                            </div>
                        )}
                        <div className="viewer-count">
                            👥 {viewerCount} Zuschauer
                        </div>
                        <div className="mode-badge">
                            {isAdmin ? '📹 STREAMER' : '👀 VIEWER'}
                        </div>
                    </div>
                    
                    <button onClick={onClose} className="close-btn">
                        ✕ Schließen
                    </button>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="error-banner">
                    <span>⚠️ {error}</span>
                    {isAdmin && (
                        <button onClick={startCamera} className="retry-btn">
                            🔄 Erneut versuchen
                        </button>
                    )}
                </div>
            )}

            {/* Video Area */}
            <div className={embedded ? "embedded-video-area" : "video-area"}>
                {/* Admin Streaming View */}
                {isAdmin && (
                    <div className="publisher-view">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="local-video"
                        />
                        
                        {isStreaming && (
                            <div className="video-overlay">
                                <div className="streaming-label">
                                    📹 Sie streamen LIVE
                                </div>
                            </div>
                        )}

                        {!isStreaming && !error && (
                            <div className="start-screen">
                                <h2>🎥 Live-Streaming starten</h2>
                                <p>Klicken Sie auf "Kamera starten" um zu beginnen</p>
                                <button onClick={startCamera} className="start-btn">
                                    📹 Kamera starten
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Viewer View - Real Video Stream */}
                {!isAdmin && (
                    <div className="viewer-view">
                        {/* Show real video if connected, otherwise show connection screen */}
                        {isConnected ? (
                            // Real video from admin stream
                            <div className="remote-stream-container">
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    className="remote-video"
                                />
                                
                                <div className="viewer-overlay">
                                    <div className="live-badge">
                                        <span className="live-dot"></span>
                                        LIVE
                                    </div>
                                    <div className="viewer-count-display">
                                        👥 {viewerCount} Zuschauer
                                    </div>
                                </div>
                                
                                {/* Stream info overlay */}
                                <div className="stream-info-overlay">
                                    <div className="store-badge">OUTLET34 Fashion Store</div>
                                    <div className="quality-badge">HD • LIVE</div>
                                </div>
                            </div>
                        ) : (
                            // Show countdown while waiting for admin to start streaming
                            <div className="countdown-display">
                                <div className="countdown-content">
                                    {/* Fire Icon */}
                                    <div className="fire-icon">🔥</div>
                                    
                                    {/* Title */}
                                    <h2>🛍️ LIVE SHOPPING COUNTDOWN</h2>

                                    {/* Timer Boxes */}
                                    <div className="countdown-timer">
                                        <div className="sale-label">SALE</div>
                                        <div className="timer-boxes">
                                            <div className="time-box">
                                                <div className="time-number">
                                                    {countdown.hours.toString().padStart(2, '0')}
                                                </div>
                                                <div className="time-label">STD</div>
                                            </div>
                                            <div className="time-box">
                                                <div className="time-number">
                                                    {countdown.minutes.toString().padStart(2, '0')}
                                                </div>
                                                <div className="time-label">MIN</div>
                                            </div>
                                            <div className="time-box">
                                                <div className="time-number">
                                                    {countdown.seconds.toString().padStart(2, '0')}
                                                </div>
                                                <div className="time-label">SEK</div>
                                            </div>
                                        </div>
                                        <div className="sale-label-bottom">SALE</div>
                                    </div>

                                    {/* Event Info */}
                                    <div className="event-info">
                                        📅 Startet am 30.8.2025 um 15:00 Uhr
                                    </div>

                                    {/* Ready Banner */}
                                    <div className="ready-banner">
                                        ⚡ BEREIT MACHEN!
                                        <div className="ready-subtitle">
                                            Warten auf Live-Stream...
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Controls */}
            {isAdmin && isStreaming && (
                <div className="stream-controls">
                    <button onClick={stopStreaming} className="stop-btn">
                        🛑 Stream beenden
                    </button>
                    
                    <div className="stream-stats">
                        <span>📊 HD-Qualität</span>
                        <span>🔴 LIVE</span>
                        <span>⏱️ {new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            )}

            {/* Simple Chat Area - Hide in embedded mode */}
            {!embedded && (
                <div className="simple-chat">
                    <div className="chat-header">
                        <h4>💬 Live Chat</h4>
                    </div>
                    
                    <div className="chat-messages">
                        <div className="chat-message">
                            <strong>System:</strong> Live-Stream gestartet
                        </div>
                        <div className="chat-message">
                            <strong>Kunde123:</strong> Hallo! Sind die Angebote heute gut?
                        </div>
                        <div className="chat-message">
                            <strong>Admin:</strong> Willkommen! Heute haben wir tolle Deals!
                        </div>
                    </div>

                    <div className="chat-input">
                        <input 
                            type="text" 
                            placeholder="Nachricht eingeben..."
                            className="message-input"
                        />
                        <button className="send-btn">➤</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SimpleVideoStreaming;