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
    const [peerConnection, setPeerConnection] = useState(null);
    const [websocket, setWebsocket] = useState(null);
    const [countdown, setCountdown] = useState({
        hours: 2,
        minutes: 5,
        seconds: 50
    });
    
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    // WebRTC Configuration
    const rtcConfiguration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    // Initialize WebRTC for viewers
    const initializeViewer = async () => {
        try {
            console.log('🔗 Initializing viewer WebRTC connection...');
            
            // Create peer connection
            const pc = new RTCPeerConnection(rtcConfiguration);
            
            // Set up event handlers
            pc.onicecandidate = (event) => {
                if (event.candidate && websocket && websocket.readyState === WebSocket.OPEN) {
                    websocket.send(JSON.stringify({
                        type: 'ice-candidate',
                        candidate: event.candidate
                    }));
                }
            };
            
            pc.ontrack = (event) => {
                console.log('✅ Received remote stream:', event.streams[0]);
                if (remoteVideoRef.current && event.streams[0]) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                    setIsConnected(true);
                }
            };
            
            pc.onconnectionstatechange = () => {
                console.log('📡 Connection state:', pc.connectionState);
                if (pc.connectionState === 'connected') {
                    setIsConnected(true);
                    setViewerCount(prev => prev + 1);
                } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                    setIsConnected(false);
                }
            };
            
            setPeerConnection(pc);
            
            // Connect to WebSocket signaling server
            const wsUrl = `${process.env.REACT_APP_BACKEND_URL.replace('http', 'ws')}/ws/stream/main/viewer`;
            const ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                console.log('✅ WebSocket connected for viewer');
                setWebsocket(ws);
            };
            
            ws.onmessage = async (event) => {
                const message = JSON.parse(event.data);
                console.log('📨 Received signaling message:', message);
                
                switch (message.type) {
                    case 'offer':
                        await pc.setRemoteDescription(new RTCSessionDescription(message.offer));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        
                        ws.send(JSON.stringify({
                            type: 'answer',
                            answer: answer
                        }));
                        break;
                        
                    case 'ice-candidate':
                        if (message.candidate) {
                            await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
                        }
                        break;
                        
                    case 'viewer-count':
                        setViewerCount(message.count || 0);
                        break;
                }
            };
            
            ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                setError('Verbindungsfehler zum Live-Stream');
            };
            
            ws.onclose = () => {
                console.log('📡 WebSocket closed');
                setIsConnected(false);
            };
            
        } catch (err) {
            console.error('❌ Viewer initialization error:', err);
            setError(`Viewer-Fehler: ${err.message}`);
        }
    };
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
            // Initialize viewer WebRTC connection
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
                            // Loading/Connection state
                            <div className="connection-screen">
                                <div className="connection-content">
                                    <div className="loading-spinner">📡</div>
                                    <h2>Verbindung wird hergestellt...</h2>
                                    <p>Warten auf Live-Stream von OUTLET34</p>
                                    <div className="connection-progress">
                                        <div className="progress-bar"></div>
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