import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import adapter from 'webrtc-adapter';

// WebRTC configuration with STUN/TURN servers
const DEFAULT_RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:3478' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all'
};

const StreamingInterface = ({ 
  isStreamer = false, 
  streamId = null,
  onStreamEnd = null,
  backendUrl = null 
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [currentStreamId, setCurrentStreamId] = useState(streamId);
  const [error, setError] = useState(null);
  const [rtcConfig, setRtcConfig] = useState(DEFAULT_RTC_CONFIG);
  const [connectionState, setConnectionState] = useState('new');
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const socketRef = useRef(null);

  // Get backend URL from environment
  const getBackendUrl = useCallback(() => {
    if (backendUrl) return backendUrl;
    return process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
  }, [backendUrl]);

  // Fetch WebRTC configuration from backend
  const fetchWebRTCConfig = useCallback(async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/webrtc/config`);
      if (response.ok) {
        const config = await response.json();
        setRtcConfig(config.rtcConfiguration);
      }
    } catch (error) {
      console.warn('Failed to fetch WebRTC config, using defaults:', error);
    }
  }, [getBackendUrl]);

  // Initialize WebRTC peer connection
  const initializePeerConnection = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
    }

    peerConnection.current = new RTCPeerConnection(rtcConfig);
    
    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          candidate: event.candidate,
          streamId: currentStreamId
        });
      }
    };

    // Handle remote stream (for viewers)
    peerConnection.current.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setIsConnected(true);
      }
    };

    // Handle connection state changes
    peerConnection.current.onconnectionstatechange = () => {
      const state = peerConnection.current.connectionState;
      console.log('Connection state:', state);
      setConnectionState(state);
      
      if (state === 'connected') {
        setIsConnected(true);
        setError(null);
      } else if (state === 'failed' || state === 'disconnected') {
        setIsConnected(false);
        if (state === 'failed') {
          setError('Connection failed. Please try again.');
        }
      }
    };

  }, [rtcConfig, currentStreamId]);

  // Initialize media stream for streamers
  const initializeMediaStream = useCallback(async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user' // For iPhone front camera
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStream.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Add tracks to peer connection
      if (peerConnection.current) {
        stream.getTracks().forEach(track => {
          peerConnection.current.addTrack(track, stream);
        });
      }

      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      let errorMessage = 'Failed to access camera and microphone. ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera and microphone permissions.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera or microphone found.';
      } else {
        errorMessage += 'Please check your device settings.';
      }
      
      setError(errorMessage);
      throw error;
    }
  }, []);

  // Socket.IO connection management
  useEffect(() => {
    fetchWebRTCConfig();
  }, [fetchWebRTCConfig]);

  useEffect(() => {
    if (!currentStreamId) return;

    const wsUrl = isStreamer 
      ? `${getBackendUrl().replace('http', 'ws')}/ws/stream/${currentStreamId}/signaling`
      : `${getBackendUrl().replace('http', 'ws')}/ws/stream/${currentStreamId}/viewer`;

    console.log('Connecting to WebSocket:', wsUrl);

    // Create WebSocket connection
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connected');
      setError(null);
    };

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'signaling') {
          await handleSignalingMessage(message.data);
        } else if (message.type === 'viewer_count_update') {
          setViewerCount(message.count);
        } else if (message.type === 'stream_ended') {
          handleStreamEnded();
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error. Please try again.');
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [currentStreamId, isStreamer, getBackendUrl]);

  // Handle signaling messages
  const handleSignalingMessage = async (data) => {
    if (!peerConnection.current) return;

    try {
      if (data.type === 'offer' && !isStreamer) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        
        sendSignalingMessage(answer);
      } else if (data.type === 'answer' && isStreamer) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data));
      } else if (data.type === 'ice-candidate') {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
      setError('Failed to establish connection');
    }
  };

  // Send signaling message
  const sendSignalingMessage = (data) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    }
  };

  // Handle stream ended
  const handleStreamEnded = () => {
    setIsStreaming(false);
    setIsConnected(false);
    if (onStreamEnd) {
      onStreamEnd();
    }
    cleanup();
  };

  // Start streaming function
  const startStreaming = async () => {
    try {
      setError(null);
      
      // Create new stream
      const response = await fetch(`${getBackendUrl()}/api/stream/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add authentication header
        },
        body: JSON.stringify({
          stream_title: 'Live Shopping Stream',
          max_viewers: 50
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to start streaming session');
      }
      
      const streamData = await response.json();
      setCurrentStreamId(streamData.stream_id);
      
      // Initialize peer connection and media stream
      initializePeerConnection();
      await initializeMediaStream();
      
      // Create offer for streaming
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      
      setIsStreaming(true);
      
    } catch (error) {
      console.error('Error starting stream:', error);
      setError(error.message);
    }
  };

  // Join stream as viewer
  const joinStream = async (targetStreamId) => {
    try {
      setError(null);
      
      const response = await fetch(`${getBackendUrl()}/api/stream/${targetStreamId}/join`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to join streaming session');
      }
      
      setCurrentStreamId(targetStreamId);
      initializePeerConnection();
      
    } catch (error) {
      console.error('Error joining stream:', error);
      setError(error.message);
    }
  };

  // Stop streaming
  const stopStreaming = async () => {
    try {
      if (currentStreamId) {
        await fetch(`${getBackendUrl()}/api/stream/${currentStreamId}`, {
          method: 'DELETE'
        });
      }
      
      cleanup();
      setIsStreaming(false);
      setIsConnected(false);
      setCurrentStreamId(null);
      setViewerCount(0);
      
    } catch (error) {
      console.error('Error stopping stream:', error);
      setError('Failed to stop streaming session');
    }
  };

  // Cleanup function
  const cleanup = useCallback(() => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
      socketRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Auto-join stream if streamId is provided and not a streamer
  useEffect(() => {
    if (streamId && !isStreamer && !currentStreamId) {
      joinStream(streamId);
    }
  }, [streamId, isStreamer, currentStreamId]);

  return (
    <div className="streaming-interface w-full max-w-4xl mx-auto p-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="video-container space-y-4">
        {isStreamer && (
          <div className="local-video bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Dein Live-Stream</h3>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Status: {isStreaming ? (
                    <span className="text-green-600 font-medium">🔴 Live</span>
                  ) : (
                    <span className="text-gray-500">Offline</span>
                  )}
                </span>
                <span className="text-sm text-gray-600">
                  Zuschauer: <span className="font-medium">{viewerCount}</span>
                </span>
              </div>
            </div>
            
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-64 bg-black rounded object-cover"
            />
            
            <div className="mt-4 flex justify-center space-x-4">
              {!isStreaming ? (
                <button 
                  onClick={startStreaming}
                  disabled={isConnected}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  🎥 Live-Stream starten
                </button>
              ) : (
                <button 
                  onClick={stopStreaming}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  ⏹️ Stream beenden
                </button>
              )}
            </div>
            
            {connectionState && connectionState !== 'new' && (
              <div className="mt-2 text-center text-sm text-gray-500">
                Verbindung: {connectionState}
              </div>
            )}
          </div>
        )}
        
        {!isStreamer && (
          <div className="remote-video bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Live-Stream</h3>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Status: {isConnected ? (
                    <span className="text-green-600 font-medium">🟢 Verbunden</span>
                  ) : (
                    <span className="text-red-500">🔴 Nicht verbunden</span>
                  )}
                </span>
                <span className="text-sm text-gray-600">
                  Zuschauer: <span className="font-medium">{viewerCount}</span>
                </span>
              </div>
            </div>
            
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-64 bg-black rounded object-cover"
            />
            
            {!isConnected && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded text-white">
                <div className="text-center">
                  <div className="text-2xl mb-2">📺</div>
                  <div>Warten auf Live-Stream...</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {currentStreamId && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <div className="text-sm text-gray-600">
            Stream-ID: <span className="font-mono bg-white px-2 py-1 rounded">{currentStreamId}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamingInterface;