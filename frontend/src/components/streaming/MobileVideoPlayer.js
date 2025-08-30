/**
 * Mobile-Optimized Video Player - Einfach und zuverlässig für Handys
 * Hochformat-optimiert für OUTLET34 Live Shopping
 */

import React, { useState, useRef, useEffect } from 'react';
import './MobileVideoPlayer.css';

const MobileVideoPlayer = ({ 
    isAdmin = false, 
    onClose,
    embedded = true 
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [viewerCount, setViewerCount] = useState(Math.floor(Math.random() * 50) + 40);
    const [currentTime, setCurrentTime] = useState("15:30");
    
    const videoRef = useRef(null);

    // Start simple camera for mobile
    const startMobileCamera = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            console.log('📱 Starting mobile camera...');
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: isAdmin ? 'user' : 'environment', // Admin: Selfie, Viewer: Rückkamera
                    width: { ideal: 720, min: 480 }, // Mobile-optimiert
                    height: { ideal: 1280, min: 854 }, // Hochformat
                    frameRate: { ideal: 30, min: 15 }
                },
                audio: true
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.muted = false; // Audio erlauben für Live Shopping
                await videoRef.current.play();
                
                setIsPlaying(true);
                setIsLoading(false);
                
                console.log('✅ Mobile video erfolgreich gestartet!');
            }

        } catch (err) {
            console.error('❌ Mobile camera error:', err);
            setIsLoading(false);
            
            if (err.name === 'NotAllowedError') {
                setError('Kamera-Zugriff erforderlich. Bitte in Browser-Einstellungen erlauben.');
            } else if (err.name === 'NotFoundError') {
                setError('Keine Kamera gefunden. Überprüfen Sie Ihr Gerät.');
            } else {
                setError('Kamera-Fehler. Aktualisieren Sie die Seite und versuchen es erneut.');
            }
        }
    };

    // Stop video
    const stopVideo = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsPlaying(false);
    };

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('de-DE', { 
                hour: '2-digit', 
                minute: '2-digit' 
            }));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="mobile-video-player">
            {/* Mobile Header */}
            <div className="mobile-video-header">
                <div className="header-left">
                    <div className="outlet-logo">🛍️ OUTLET34</div>
                    <div className="live-indicator">
                        {isPlaying && <span className="live-dot">🔴</span>}
                        <span>{isPlaying ? 'LIVE' : 'OFFLINE'}</span>
                    </div>
                </div>
                
                <div className="header-right">
                    <div className="viewer-count">👥 {viewerCount}</div>
                    <div className="current-time">{currentTime}</div>
                    {!embedded && (
                        <button onClick={onClose} className="close-mobile-btn">✕</button>
                    )}
                </div>
            </div>

            {/* Video Container - Mobile Portrait Optimized */}
            <div className="mobile-video-container">
                {/* Video Element */}
                <video
                    ref={videoRef}
                    className="mobile-video"
                    playsInline
                    webkit-playsinline="true"
                    autoPlay
                    controls={false}
                />

                {/* Overlay Controls */}
                <div className="video-overlay">
                    {/* Live Shopping Info */}
                    {isPlaying && (
                        <div className="shopping-info">
                            <div className="product-badge">
                                🏷️ Aktuelle Angebote
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading && (
                        <div className="loading-overlay">
                            <div className="loading-spinner">📱</div>
                            <p>Kamera wird gestartet...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="error-overlay">
                            <div className="error-icon">⚠️</div>
                            <p>{error}</p>
                            <button onClick={startMobileCamera} className="retry-mobile-btn">
                                🔄 Erneut versuchen
                            </button>
                        </div>
                    )}

                    {/* Start Screen */}
                    {!isPlaying && !isLoading && !error && (
                        <div className="start-overlay">
                            <div className="start-content">
                                <div className="start-icon">🎥</div>
                                <h2>OUTLET34 Live Shopping</h2>
                                <p>Handy-optimierte Live-Übertragung</p>
                                
                                {isAdmin ? (
                                    <button onClick={startMobileCamera} className="start-mobile-btn">
                                        📱 Live-Stream starten
                                    </button>
                                ) : (
                                    <div className="viewer-waiting">
                                        <p>Warten auf Live-Übertragung...</p>
                                        <button onClick={startMobileCamera} className="join-mobile-btn">
                                            👀 Stream beitreten
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Control Bar */}
            {isPlaying && (
                <div className="mobile-controls">
                    <div className="control-left">
                        <div className="live-status">
                            <span className="pulse-dot">●</span>
                            LIVE ÜBERTRAGUNG
                        </div>
                    </div>
                    
                    <div className="control-right">
                        {isAdmin && (
                            <button onClick={stopVideo} className="stop-mobile-btn">
                                🛑 Beenden
                            </button>
                        )}
                        
                        <div className="quality-indicator">📱 HD</div>
                    </div>
                </div>
            )}

            {/* Mobile Chat (if needed) */}
            {embedded && isPlaying && (
                <div className="mobile-chat-quick">
                    <div className="chat-messages-mobile">
                        <div className="chat-msg">
                            <strong>System:</strong> Live-Stream gestartet 🎥
                        </div>
                    </div>
                    <div className="chat-input-mobile">
                        <input 
                            type="text" 
                            placeholder="Nachricht..." 
                            className="mobile-input"
                        />
                        <button className="send-mobile-btn">➤</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MobileVideoPlayer;