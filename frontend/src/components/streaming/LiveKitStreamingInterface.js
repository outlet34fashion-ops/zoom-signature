/**
 * LiveKit Streaming Interface
 * Optimized for iPhone Safari with mobile-first approach
 * Supports Publisher (Admin) and Viewer (Customer) modes
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    LiveKitRoom,
    useLocalParticipant,
    useRemoteParticipants,
    useRoomContext,
    useTracks,
    VideoTrack,
    AudioTrack,
    ParticipantTile,
    ControlBar,
    GridLayout,
    ConnectionQualityIndicator,
    Chat,
    ChatEntry,
    usePersistentUserChoices,
    useConnectionState
} from '@livekit/components-react';
import { Track, Room, RoomEvent, ConnectionQuality, ConnectionState } from 'livekit-client';
import '@livekit/components-styles';
import './LiveKitStreamingInterface.css';

const LiveKitStreamingInterface = ({ 
    token, 
    serverUrl, 
    roomName,
    isPublisher = false,
    onDisconnected,
    onError,
    onConnected 
}) => {
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState(null);
    const [showChat, setShowChat] = useState(true);
    const [viewerCount, setViewerCount] = useState(0);
    const [isLive, setIsLive] = useState(false);
    const [connectionQuality, setConnectionQuality] = useState('excellent');
    const [networkStats, setNetworkStats] = useState({
        rtt: 0,
        bitrate: 0,
        packetLoss: 0,
        fps: 0
    });

    // Room options optimized for mobile and iPhone Safari
    const roomOptions = {
        videoCaptureDefaults: {
            resolution: { width: 1920, height: 1080 },
            frameRate: 30
        },
        publishDefaults: {
            audioPreset: {
                maxBitrate: 128000,
                priority: 'high'
            },
            videoPreset: {
                maxBitrate: 3500000, // 3.5 Mbps target
                priority: 'high'
            },
            simulcast: true,
            dynacast: true
        },
        audioCaptureDefaults: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        },
        adaptiveStream: {
            pixelDensity: 'screen'
        }
    };

    // Connection options for iPhone Safari compatibility
    const connectOptions = {
        autoSubscribe: true,
        maxRetries: 3,
        peerConnectionTimeout: 15000
    };

    const handleConnected = useCallback(() => {
        console.log('Connected to LiveKit room:', roomName);
        setIsConnected(true);
        setConnectionError(null);
        setIsLive(true);
        if (onConnected) onConnected();
    }, [roomName, onConnected]);

    const handleDisconnected = useCallback((reason) => {
        console.log('Disconnected from LiveKit room:', reason);
        setIsConnected(false);
        setIsLive(false);
        if (onDisconnected) onDisconnected(reason);
    }, [onDisconnected]);

    const handleError = useCallback((error) => {
        console.error('LiveKit room error:', error);
        setConnectionError(error.message || 'Connection error occurred');
        if (onError) onError(error);
    }, [onError]);

    if (!token || !serverUrl) {
        return (
            <div className="livekit-error-container">
                <div className="livekit-error-message">
                    <h3>Connection Error</h3>
                    <p>Missing authentication token or server URL</p>
                </div>
            </div>
        );
    }

    return (
        <div className="livekit-streaming-container">
            <LiveKitRoom
                video={isPublisher}
                audio={isPublisher}
                token={token}
                serverUrl={serverUrl}
                options={roomOptions}
                connectOptions={connectOptions}
                onConnected={handleConnected}
                onDisconnected={handleDisconnected}
                onError={handleError}
                className="livekit-room"
            >
                <StreamingContent 
                    isPublisher={isPublisher}
                    showChat={showChat}
                    setShowChat={setShowChat}
                    viewerCount={viewerCount}
                    setViewerCount={setViewerCount}
                    isLive={isLive}
                    connectionQuality={connectionQuality}
                    setConnectionQuality={setConnectionQuality}
                    networkStats={networkStats}
                    setNetworkStats={setNetworkStats}
                />
            </LiveKitRoom>
        </div>
    );
};

// Main streaming content component
const StreamingContent = ({ 
    isPublisher, 
    showChat, 
    setShowChat, 
    viewerCount, 
    setViewerCount,
    isLive,
    connectionQuality,
    setConnectionQuality,
    networkStats,
    setNetworkStats
}) => {
    // Check connection state first - CRITICAL for avoiding context errors
    const connectionState = useConnectionState();
    const room = useRoomContext();
    
    // Only initialize hooks after connection is established
    const [hooksReady, setHooksReady] = useState(false);
    
    useEffect(() => {
        // Wait for connection to be established before using other hooks
        if (connectionState === ConnectionState.Connected && room) {
            setHooksReady(true);
        } else {
            setHooksReady(false);
        }
    }, [connectionState, room]);

    // Show loading state while connecting
    if (!hooksReady || connectionState !== ConnectionState.Connected) {
        return (
            <div className="streaming-content">
                <div className="connection-loading">
                    <div className="loading-spinner">🔄</div>
                    <div className="connection-status">
                        <h3>Verbindung wird hergestellt...</h3>
                        <p>Status: {getConnectionStateText(connectionState)}</p>
                        <div className="loading-progress">
                            <div className="progress-bar"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Now safe to use LiveKit hooks
    return <ConnectedStreamingContent
        isPublisher={isPublisher}
        showChat={showChat}
        setShowChat={setShowChat}
        viewerCount={viewerCount}
        setViewerCount={setViewerCount}
        isLive={isLive}
        connectionQuality={connectionQuality}
        setConnectionQuality={setConnectionQuality}
        networkStats={networkStats}
        setNetworkStats={setNetworkStats}
    />;
};

// Component that safely uses LiveKit hooks after connection
const ConnectedStreamingContent = ({
    isPublisher, 
    showChat, 
    setShowChat, 
    viewerCount, 
    setViewerCount,
    isLive,
    connectionQuality,
    setConnectionQuality,
    networkStats,
    setNetworkStats
}) => {
    const room = useRoomContext();
    const localParticipant = useLocalParticipant();
    const remoteParticipants = useRemoteParticipants();
    const [isCameraEnabled, setIsCameraEnabled] = useState(true);
    const [isMicEnabled, setIsMicEnabled] = useState(true);
    const [facingMode, setFacingMode] = useState('user'); // 'user' or 'environment'
    const statsIntervalRef = useRef(null);
    const userChoices = usePersistentUserChoices();

    // Get video and audio tracks
    const tracks = useTracks([
        { source: Track.Source.Camera, withPlaceholder: true },
        { source: Track.Source.Microphone, withPlaceholder: false },
        { source: Track.Source.ScreenShare, withPlaceholder: false },
    ]);

    // Update viewer count
    useEffect(() => {
        if (room) {
            const updateParticipantCount = () => {
                // Count remote participants (viewers) + 1 if publisher is present
                const publisherCount = localParticipant.localParticipant ? 1 : 0;
                const totalViewers = remoteParticipants.length;
                setViewerCount(totalViewers);
            };

            room.on(RoomEvent.ParticipantConnected, updateParticipantCount);
            room.on(RoomEvent.ParticipantDisconnected, updateParticipantCount);

            // Initial count
            updateParticipantCount();

            return () => {
                room.off(RoomEvent.ParticipantConnected, updateParticipantCount);
                room.off(RoomEvent.ParticipantDisconnected, updateParticipantCount);
            };
        }
    }, [room, localParticipant, remoteParticipants, setViewerCount]);

    // Monitor connection quality and network stats
    useEffect(() => {
        if (room) {
            const updateConnectionQuality = (quality, participant) => {
                if (participant === room.localParticipant) {
                    setConnectionQuality(quality.name.toLowerCase());
                }
            };

            const updateNetworkStats = async () => {
                try {
                    const stats = await room.engine.getConnectedServerAddress();
                    if (stats) {
                        setNetworkStats(prevStats => ({
                            ...prevStats,
                            // Update with real stats from LiveKit
                            rtt: stats.rtt || 0,
                            bitrate: stats.bitrate || 0,
                            packetLoss: stats.packetLoss || 0,
                            fps: stats.fps || 0
                        }));
                    }
                } catch (error) {
                    console.warn('Error getting network stats:', error);
                }
            };

            room.on(RoomEvent.ConnectionQualityChanged, updateConnectionQuality);
            
            // Update stats every 2 seconds
            statsIntervalRef.current = setInterval(updateNetworkStats, 2000);

            return () => {
                room.off(RoomEvent.ConnectionQualityChanged, updateConnectionQuality);
                if (statsIntervalRef.current) {
                    clearInterval(statsIntervalRef.current);
                }
            };
        }
    }, [room, setConnectionQuality, setNetworkStats]);

    // Camera toggle
    const toggleCamera = useCallback(async () => {
        if (localParticipant.localParticipant) {
            const enabled = !isCameraEnabled;
            await localParticipant.localParticipant.setCameraEnabled(enabled);
            setIsCameraEnabled(enabled);
        }
    }, [localParticipant, isCameraEnabled]);

    // Microphone toggle
    const toggleMicrophone = useCallback(async () => {
        if (localParticipant.localParticipant) {
            const enabled = !isMicEnabled;
            await localParticipant.localParticipant.setMicrophoneEnabled(enabled);
            setIsMicEnabled(enabled);
        }
    }, [localParticipant, isMicEnabled]);

    // Camera flip (front/back)
    const flipCamera = useCallback(async () => {
        if (localParticipant.localParticipant) {
            try {
                const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
                
                // Create new video constraints
                const constraints = {
                    video: {
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        frameRate: { ideal: 30 },
                        facingMode: newFacingMode
                    }
                };

                // Switch camera
                await localParticipant.localParticipant.switchActiveDevice(
                    'videoinput',
                    constraints.video
                );
                
                setFacingMode(newFacingMode);
            } catch (error) {
                console.error('Error flipping camera:', error);
            }
        }
    }, [localParticipant, facingMode]);

    return (
        <div className={`streaming-content ${showChat ? 'with-chat' : 'full-width'}`}>
            {/* Header with live badge and viewer count */}
            <div className="streaming-header">
                <div className="live-badge-container">
                    {isLive && (
                        <div className="live-badge">
                            <span className="live-indicator"></span>
                            LIVE
                        </div>
                    )}
                    <div className="viewer-count">
                        <span className="viewer-icon">👥</span>
                        {viewerCount} {viewerCount === 1 ? 'Zuschauer' : 'Zuschauer'}
                    </div>
                </div>
                
                {/* Network quality indicator */}
                <div className={`network-quality ${connectionQuality}`}>
                    <ConnectionQualityIndicator className="quality-icon" />
                    <div className="network-stats">
                        <span>RTT: {networkStats.rtt}ms</span>
                        <span>FPS: {networkStats.fps}</span>
                        <span>Bitrate: {(networkStats.bitrate / 1000).toFixed(0)}kbps</span>
                    </div>
                </div>

                {/* Chat toggle */}
                <button 
                    className="chat-toggle-btn"
                    onClick={() => setShowChat(!showChat)}
                    title={showChat ? 'Chat ausblenden' : 'Chat einblenden'}
                >
                    💬
                </button>
            </div>

            {/* Main video area */}
            <div className="video-area">
                <div className="video-grid">
                    <GridLayout tracks={tracks} style={{ height: '100%' }}>
                        <ParticipantTile />
                    </GridLayout>
                </div>

                {/* Mobile controls overlay */}
                {isPublisher && (
                    <div className="mobile-controls">
                        <button 
                            className={`control-btn ${isCameraEnabled ? 'active' : 'inactive'}`}
                            onClick={toggleCamera}
                            title="Kamera ein/aus"
                        >
                            {isCameraEnabled ? '📹' : '📹❌'}
                        </button>
                        
                        <button 
                            className={`control-btn ${isMicEnabled ? 'active' : 'inactive'}`}
                            onClick={toggleMicrophone}
                            title="Mikrofon ein/aus"
                        >
                            {isMicEnabled ? '🎤' : '🎤❌'}
                        </button>

                        <button 
                            className="control-btn"
                            onClick={flipCamera}
                            title="Kamera wechseln"
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
                        <button 
                            className="close-chat-btn"
                            onClick={() => setShowChat(false)}
                        >
                            ✕
                        </button>
                    </div>
                    <div className="chat-content">
                        <Chat 
                            style={{ height: '100%' }}
                            messageDecoder={(decoder, participant) => {
                                // Custom message decoding for German chat
                                return decoder;
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveKitStreamingInterface;