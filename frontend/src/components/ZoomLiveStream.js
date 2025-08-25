import React, { useState, useEffect, useCallback, useRef } from 'react';
import ZoomVideo from '@zoom/videosdk';
import axios from 'axios';

const ZoomLiveStream = ({ 
  isHost = false, 
  sessionTopic = "live_shopping_demo",
  onSessionEnd,
  productData = []
}) => {
  // State management for Zoom video session
  const [client, setClient] = useState(null);
  const [stream, setStream] = useState(null);
  const [isInSession, setIsInSession] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  
  // Refs for video containers
  const videoContainerRef = useRef(null);
  const selfVideoRef = useRef(null);
  
  // API base URL
  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Initialize Zoom Video SDK client
  useEffect(() => {
    const initializeClient = async () => {
      try {
        const videoClient = ZoomVideo.createClient();
        setClient(videoClient);
        
        // Initialize with proper configuration
        await videoClient.init('de-DE', 'Global', { 
          patchJsMedia: true,
          stayAwake: true,
          enforceMultipleVideos: true
        });
        
        console.log('Zoom Video SDK initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Zoom Video SDK:', error);
        setError('Failed to initialize video service: ' + error.message);
      }
    };

    initializeClient();
    
    // Cleanup on unmount
    return () => {
      if (client && isInSession) {
        leaveSession();
      }
    };
  }, []);

  // Create new Zoom session (for hosts)
  const createZoomSession = useCallback(async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/zoom/create-session`, {
        topic: sessionTopic,
        duration: 120, // 2 hours
        password: null
      });
      
      setSessionInfo(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to create Zoom session:', error);
      throw new Error('Session creation failed');
    }
  }, [sessionTopic]);

  // Get authentication token from backend
  const getZoomToken = useCallback(async (zoomTopic, userName, role = 0) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/zoom/generate-token`, {
        topic: zoomTopic,
        user_name: userName,
        role: role
      });
      
      return response.data.token;
    } catch (error) {
      console.error('Zoom token generation failed:', error);
      throw new Error('Authentication failed');
    }
  }, []);

  // Join Zoom video session
  const joinSession = useCallback(async (userName) => {
    if (!client) {
      setError('Zoom client not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let zoomSessionData;
      
      if (isHost) {
        // Create new session for host
        zoomSessionData = await createZoomSession();
      } else {
        // For viewers, we'll use a default session topic
        // In production, this would come from the host's shared session
        zoomSessionData = {
          zoom_topic: `live_shopping_${Date.now()}`,
          session_id: `viewer_session_${Date.now()}`
        };
      }

      // Get authentication token
      const token = await getZoomToken(
        zoomSessionData.zoom_topic || zoomSessionData.session_id,
        userName,
        isHost ? 1 : 0
      );

      // Join the Zoom session
      await client.join(
        zoomSessionData.zoom_topic || zoomSessionData.session_id,
        token,
        userName
      );
      
      // Get media stream for video/audio operations
      const mediaStream = client.getMediaStream();
      setStream(mediaStream);
      setIsInSession(true);

      // Set up event listeners
      setupEventListeners();

      console.log('Successfully joined Zoom session:', zoomSessionData.session_id);
      
      // Auto-start video for host
      if (isHost) {
        setTimeout(() => {
          startVideo();
        }, 1000);
      }
      
    } catch (error) {
      console.error('Failed to join Zoom session:', error);
      setError(`Failed to join video session: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [client, isHost, createZoomSession, getZoomToken]);

  // Setup Zoom SDK event listeners
  const setupEventListeners = useCallback(() => {
    if (!client) return;

    // Participant events
    client.on('user-added', (payload) => {
      console.log('User added to Zoom session:', payload);
      setParticipants(prev => [...prev, payload[0]]);
    });

    client.on('user-removed', (payload) => {
      console.log('User removed from Zoom session:', payload);
      setParticipants(prev => 
        prev.filter(p => p.userId !== payload[0].userId)
      );
    });

    client.on('user-updated', (payload) => {
      console.log('User updated in Zoom session:', payload);
    });

    // Video events  
    client.on('video-on', async (payload) => {
      console.log('Video started for user:', payload);
      await renderVideo(payload.userId);
    });

    client.on('video-off', (payload) => {
      console.log('Video stopped for user:', payload);
      // Remove video element for this user
      const videoElement = document.querySelector(`video[data-user-id="${payload.userId}"]`);
      if (videoElement) {
        videoElement.remove();
      }
    });

    // Audio events
    client.on('audio-on', (payload) => {
      console.log('Audio started for user:', payload);
    });

    client.on('audio-off', (payload) => {
      console.log('Audio stopped for user:', payload);
    });

    // Connection events
    client.on('connection-change', (payload) => {
      console.log('Connection status changed:', payload);
      if (payload.state === 'Disconnected') {
        setIsInSession(false);
        setError('Connection lost');
      }
    });

    // Session events
    client.on('peer-video-state-changed', async (payload) => {
      console.log('Peer video state changed:', payload);
      if (payload.action === 'Start') {
        await renderVideo(payload.userId);
      }
    });

  }, [client]);

  // Render video stream for a user
  const renderVideo = useCallback(async (userId) => {
    if (!stream || !videoContainerRef.current) return;

    try {
      // Check if video element already exists
      const existingVideo = document.querySelector(`video[data-user-id="${userId}"]`);
      if (existingVideo) {
        return;
      }

      const videoElement = await stream.attachVideo(userId, 3); // 3 for 720p
      videoElement.setAttribute('data-user-id', userId);
      videoElement.style.width = '100%';
      videoElement.style.height = '100%';
      videoElement.style.objectFit = 'cover';
      
      if (userId === client.getCurrentUserInfo()?.userId && selfVideoRef.current) {
        // Self video goes to preview area
        selfVideoRef.current.appendChild(videoElement);
      } else {
        // Other participants' videos go to main container
        videoContainerRef.current.appendChild(videoElement);
      }
    } catch (error) {
      console.error('Failed to render video for user:', userId, error);
    }
  }, [stream, client]);

  // Start video for current user
  const startVideo = useCallback(async () => {
    if (!stream) return;

    try {
      await stream.startVideo();
      setIsVideoOn(true);
      
      // Render self video preview after a short delay
      setTimeout(async () => {
        const currentUser = client.getCurrentUserInfo();
        if (currentUser) {
          await renderVideo(currentUser.userId);
        }
      }, 500);
      
    } catch (error) {
      console.error('Failed to start video:', error);
      setError('Failed to start video: ' + error.message);
    }
  }, [stream, client, renderVideo]);

  // Stop video
  const stopVideo = useCallback(async () => {
    if (!stream) return;

    try {
      await stream.stopVideo();
      setIsVideoOn(false);
      
      // Clear self video preview
      if (selfVideoRef.current) {
        selfVideoRef.current.innerHTML = '';
      }
    } catch (error) {
      console.error('Failed to stop video:', error);
    }
  }, [stream]);

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    if (!stream) return;

    try {
      if (isAudioOn) {
        await stream.stopAudio();
        setIsAudioOn(false);
      } else {
        await stream.startAudio();
        setIsAudioOn(true);
      }
    } catch (error) {
      console.error('Failed to toggle audio:', error);
      setError('Failed to toggle audio: ' + error.message);
    }
  }, [stream, isAudioOn]);

  // Leave Zoom session
  const leaveSession = useCallback(async () => {
    if (!client || !isInSession) return;

    try {
      // Stop media streams
      if (stream) {
        if (isVideoOn) await stream.stopVideo();
        if (isAudioOn) await stream.stopAudio();
      }

      // Leave session
      await client.leave();
      
      // Reset state
      setStream(null);
      setIsInSession(false);
      setIsVideoOn(false);
      setIsAudioOn(false);
      setParticipants([]);
      setSessionInfo(null);
      
      // Clear video containers
      if (videoContainerRef.current) {
        videoContainerRef.current.innerHTML = '';
      }
      if (selfVideoRef.current) {
        selfVideoRef.current.innerHTML = '';
      }

      if (onSessionEnd) {
        onSessionEnd();
      }

    } catch (error) {
      console.error('Failed to leave Zoom session:', error);
    }
  }, [client, isInSession, stream, isVideoOn, isAudioOn, onSessionEnd]);

  // Render component
  return (
    <div className="zoom-live-stream">
      {error && (
        <div className="error-banner bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 text-red-900 hover:text-red-700">
            ×
          </button>
        </div>
      )}

      <div className="video-section">
        {!isInSession ? (
          <div className="join-controls bg-black text-white p-8 rounded-lg text-center">
            <h3 className="text-xl mb-4">
              {isHost ? 'Live Shopping Stream starten' : 'Live Shopping Stream beitreten'}
            </h3>
            <p className="text-gray-300 mb-6">
              {isHost 
                ? 'Starten Sie Ihren Live Shopping Stream und präsentieren Sie Ihre Produkte'
                : 'Schauen Sie live zu und entdecken Sie tolle Angebote'
              }
            </p>
            <button 
              onClick={() => joinSession(isHost ? 'Host' : `Viewer_${Date.now()}`)}
              disabled={isLoading}
              className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-3 rounded-lg text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verbinde...' : (isHost ? 'Stream starten' : 'Stream beitreten')}
            </button>
          </div>
        ) : (
          <>
            {/* Main video area */}
            <div className="main-video-container bg-black rounded-lg overflow-hidden relative" style={{ minHeight: '400px' }}>
              <div ref={videoContainerRef} className="video-streams w-full h-full flex items-center justify-center">
                {!participants.length && !isVideoOn && (
                  <div className="text-white text-center">
                    <p className="text-lg">Warte auf Video-Stream...</p>
                    {isHost && (
                      <p className="text-sm text-gray-300 mt-2">Klicken Sie auf "Video starten" um zu beginnen</p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Self video preview for host */}
              {isHost && (
                <div 
                  ref={selfVideoRef} 
                  className="self-video-preview absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded border-2 border-white overflow-hidden"
                  style={{ zIndex: 10 }}
                >
                </div>
              )}

              {/* Live indicator */}
              <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                🔴 LIVE
              </div>

              {/* Participant count */}
              <div className="absolute top-4 left-20 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                👥 {participants.length + 1} Zuschauer
              </div>
            </div>

            {/* Control panel */}
            <div className="controls-panel mt-4 flex justify-center space-x-4">
              {isHost && (
                <>
                  <button 
                    onClick={isVideoOn ? stopVideo : startVideo}
                    className={`control-button px-4 py-2 rounded-lg font-semibold ${
                      isVideoOn 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    📹 {isVideoOn ? 'Video stoppen' : 'Video starten'}
                  </button>
                  <button 
                    onClick={toggleAudio}
                    className={`control-button px-4 py-2 rounded-lg font-semibold ${
                      isAudioOn 
                        ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                        : 'bg-gray-500 hover:bg-gray-600 text-white'
                    }`}
                  >
                    🎤 {isAudioOn ? 'Stumm' : 'Mikro an'}
                  </button>
                </>
              )}
              
              <button 
                onClick={leaveSession}
                className="control-button px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
              >
                Stream verlassen
              </button>
            </div>

            {/* Session info for debugging */}
            {sessionInfo && (
              <div className="session-info mt-4 text-xs text-gray-500">
                Session: {sessionInfo.session_id}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ZoomLiveStream;