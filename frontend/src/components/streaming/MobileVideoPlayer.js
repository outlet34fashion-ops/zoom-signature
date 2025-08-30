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
            
            // Check if getUserMedia is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not available. HTTPS required in production.');
            }

            // Simple constraints that work on HTTP for development
            const constraints = {
                video: {
                    width: { ideal: 640, min: 320 },
                    height: { ideal: 480, min: 240 },
                    frameRate: { ideal: 30, min: 15 }
                },
                audio: false // Disable audio for HTTP development
            };

            // Try to access camera
            console.log('📷 Requesting camera access with constraints:', constraints);
            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.muted = true; // Always muted for development
                
                // Wait for video to be ready
                videoRef.current.onloadedmetadata = () => {
                    console.log('✅ Video metadata loaded, playing...');
                    videoRef.current.play().then(() => {
                        setIsPlaying(true);
                        setIsLoading(false);
                        console.log('✅ Mobile video erfolgreich gestartet!');
                    }).catch(playErr => {
                        console.error('❌ Video play error:', playErr);
                        setError('Video-Wiedergabe fehlgeschlagen. Browser-Einstellungen prüfen.');
                        setIsLoading(false);
                    });
                };
                
                // Handle video errors
                videoRef.current.onerror = (vidError) => {
                    console.error('❌ Video element error:', vidError);
                    setError('Video-Element Fehler. Seite neu laden.');
                    setIsLoading(false);
                };
            }

        } catch (err) {
            console.error('❌ Mobile camera error:', err);
            setIsLoading(false);
            
            // Enhanced error handling
            if (err.name === 'NotAllowedError') {
                setError('🔒 Kamera-Zugriff verweigert. Bitte in Browser-Einstellungen erlauben und Seite neu laden.');
            } else if (err.name === 'NotFoundError') {
                setError('📷 Keine Kamera gefunden. Überprüfen Sie Ihr Gerät oder versuchen Sie ein anderes Gerät.');
            } else if (err.name === 'NotSupportedError' || err.message.includes('HTTPS')) {
                setError('🔒 HTTPS erforderlich für Kamera-Zugriff. App über HTTPS öffnen oder lokale Entwicklung verwenden.');
            } else if (err.name === 'OverconstrainedError') {
                setError('⚙️ Kamera-Einstellungen nicht unterstützt. Versuche alternative Einstellungen...');
                // Retry with basic constraints
                retryWithBasicConstraints();
            } else {
                setError(`❌ Kamera-Fehler: ${err.message || 'Unbekannter Fehler'}. Seite neu laden und erneut versuchen.`);
            }
        }
    };

    // Retry with very basic constraints
    const retryWithBasicConstraints = async () => {
        try {
            console.log('🔄 Retrying with basic constraints...');
            const basicStream = await navigator.mediaDevices.getUserMedia({
                video: true, // Most basic constraint
                audio: false
            });

            if (videoRef.current) {
                videoRef.current.srcObject = basicStream;
                videoRef.current.muted = true;
                await videoRef.current.play();
                
                setIsPlaying(true);
                setIsLoading(false);
                setError(null);
                console.log('✅ Basic camera access successful!');
            }
        } catch (retryErr) {
            console.error('❌ Basic constraints also failed:', retryErr);
            setError('❌ Kamera kann nicht gestartet werden. Gerät oder Browser möglicherweise nicht kompatibel.');
            setIsLoading(false);
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