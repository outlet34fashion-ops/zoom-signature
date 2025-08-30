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
    const [countdown, setCountdown] = useState({
        hours: 2,
        minutes: 5,
        seconds: 50
    });
    
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

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

    // Auto-start for admin
    useEffect(() => {
        if (isAdmin) {
            startCamera();
        } else {
            // Simulate viewer joining existing stream
            setIsConnected(true);
            setViewerCount(2); // Simulate 2 viewers
        }

        return () => {
            stopStreaming();
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