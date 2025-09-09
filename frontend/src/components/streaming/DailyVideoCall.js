import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DailyProvider,
  useCallObject,
  useParticipantIds,
  useParticipant,
  useLocalParticipant,
  useMeetingState,
  useScreenShare,
  useMediaTrack
} from '@daily-co/daily-react';
import DailyIframe from '@daily-co/daily-js';
import './DailyVideoCall.css';

// Main App Component
function DailyVideoCallApp({ roomUrl, token, onLeave, isAdmin = false }) {
  const [callObject, setCallObject] = useState(null);
  const [showCall, setShowCall] = useState(false);

  const createCallObject = useCallback(() => {
    const newCallObject = DailyIframe.createCallObject({
      url: roomUrl,
      showLeaveButton: false,
      showFullscreenButton: true,
      theme: {
        accent: '#8B5CF6',
        accentText: '#FFFFFF',
        background: '#1F1F23',
        backgroundAccent: '#2D2D37',
        baseText: '#FFFFFF',
        border: '#404040',
        mainAreaBg: '#1F1F23',
        mainAreaBgAccent: '#2D2D37',
        supportiveText: '#A0A0A0'
      }
    });
    setCallObject(newCallObject);
    return newCallObject;
  }, [roomUrl]);

  const joinCall = useCallback(async () => {
    if (!roomUrl || !token) return;
    
    try {
      const callObj = createCallObject();
      
      await callObj.join({
        url: roomUrl,
        token: token
      });
      
      setShowCall(true);
    } catch (error) {
      console.error('Failed to join call:', error);
      alert('Fehler beim Beitreten: ' + error.message);
    }
  }, [roomUrl, token, createCallObject]);

  const leaveCall = useCallback(async () => {
    if (!callObject) return;
    
    await callObject.leave();
    setCallObject(null);
    setShowCall(false);
    onLeave();
  }, [callObject, onLeave]);

  useEffect(() => {
    if (roomUrl && token) {
      joinCall();
    }
  }, [roomUrl, token, joinCall]);

  if (showCall && callObject) {
    return (
      <DailyProvider callObject={callObject}>
        <DailyVideoCall onLeave={leaveCall} isAdmin={isAdmin} />
      </DailyProvider>
    );
  }

  return (
    <div className="daily-loading">
      <div className="loading-spinner"></div>
      <p>Verbinde mit Live Stream...</p>
    </div>
  );
}

// Video Call Component
function DailyVideoCall({ onLeave, isAdmin }) {
  const callObject = useCallObject();
  const meetingState = useMeetingState();
  const participantIds = useParticipantIds();
  const localParticipant = useLocalParticipant();
  const { isSharingScreen, startScreenShare, stopScreenShare } = useScreenShare();

  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(!isAdmin);

  const toggleVideo = useCallback(async () => {
    await callObject.setLocalVideo(!isVideoMuted);
    setIsVideoMuted(!isVideoMuted);
  }, [callObject, isVideoMuted]);

  const toggleAudio = useCallback(async () => {
    await callObject.setLocalAudio(!isAudioMuted);
    setIsAudioMuted(!isAudioMuted);
  }, [callObject, isAudioMuted]);

  const handleScreenShare = useCallback(async () => {
    if (isSharingScreen) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  }, [isSharingScreen, startScreenShare, stopScreenShare]);

  if (meetingState === 'loading') {
    return (
      <div className="daily-loading">
        <div className="loading-spinner"></div>
        <p>Lade Live Stream...</p>
      </div>
    );
  }

  if (meetingState === 'error') {
    return (
      <div className="daily-error">
        <p>❌ Fehler beim Laden des Live Streams</p>
        <button onClick={onLeave}>Zurück</button>
      </div>
    );
  }

  return (
    <div className="daily-video-call">
      <div className="video-header">
        <h3>🔴 Live Shopping Stream</h3>
        <span className="participant-count">👥 {participantIds.length} Teilnehmer</span>
      </div>
      
      <div className="video-container">
        <ParticipantGrid participantIds={participantIds} />
      </div>
      
      {isAdmin && (
        <div className="admin-controls">
          <h4>Admin Kontrollen</h4>
          <CallControls
            localParticipant={localParticipant}
            isVideoMuted={isVideoMuted}
            isAudioMuted={isAudioMuted}
            isSharingScreen={isSharingScreen}
            onToggleVideo={toggleVideo}
            onToggleAudio={toggleAudio}
            onScreenShare={handleScreenShare}
            onLeave={onLeave}
          />
        </div>
      )}
      
      {!isAdmin && (
        <div className="viewer-controls">
          <button onClick={onLeave} className="leave-button">
            Stream verlassen
          </button>
        </div>
      )}
    </div>
  );
}

// Participant Grid Component
function ParticipantGrid({ participantIds }) {
  const gridClass = useMemo(() => {
    const count = participantIds.length;
    if (count <= 1) return 'grid-single';
    if (count <= 4) return 'grid-quad';
    if (count <= 9) return 'grid-nine';
    return 'grid-many';
  }, [participantIds.length]);

  return (
    <div className={`participant-grid ${gridClass}`}>
      {participantIds.map(id => (
        <ParticipantTile key={id} participantId={id} />
      ))}
    </div>
  );
}

// Individual Participant Tile
function ParticipantTile({ participantId }) {
  const participant = useParticipant(participantId);
  const videoTrack = useMediaTrack(participantId, 'video');
  const audioTrack = useMediaTrack(participantId, 'audio');

  useEffect(() => {
    if (videoTrack.track && videoTrack.persistentTrack) {
      const videoElement = document.getElementById(`video-${participantId}`);
      if (videoElement) {
        videoElement.srcObject = new MediaStream([videoTrack.persistentTrack]);
      }
    }
  }, [videoTrack, participantId]);

  if (!participant) return null;

  const isLocal = participant.local;
  const hasVideo = !videoTrack.isOff;
  const hasAudio = !audioTrack.isOff;

  return (
    <div className={`participant-tile ${isLocal ? 'local' : 'remote'}`}>
      {hasVideo ? (
        <video
          id={`video-${participantId}`}
          autoPlay
          muted={isLocal}
          playsInline
          className="participant-video"
        />
      ) : (
        <div className="video-placeholder">
          <div className="avatar">
            {(participant.user_name || 'G')[0].toUpperCase()}
          </div>
        </div>
      )}
      
      <div className="participant-info">
        <span className="participant-name">
          {participant.user_name || 'Gast'}
          {isLocal && ' (Du)'}
        </span>
        <div className="participant-status">
          {hasVideo && <span className="video-on" title="Video an">📹</span>}
          {hasAudio && <span className="audio-on" title="Audio an">🎤</span>}
          {!hasVideo && <span className="video-off" title="Video aus">📹❌</span>}
          {!hasAudio && <span className="audio-off" title="Audio aus">🎤❌</span>}
        </div>
      </div>
    </div>
  );
}

// Call Controls Component
function CallControls({ 
  localParticipant,
  isVideoMuted,
  isAudioMuted,
  isSharingScreen,
  onToggleVideo,
  onToggleAudio,
  onScreenShare,
  onLeave
}) {
  return (
    <div className="call-controls">
      <div className="media-controls">
        <button 
          onClick={onToggleVideo} 
          className={`control-button ${isVideoMuted ? 'muted' : 'active'}`}
          title={isVideoMuted ? 'Video einschalten' : 'Video ausschalten'}
        >
          {isVideoMuted ? '📹❌' : '📹'}
        </button>
        
        <button 
          onClick={onToggleAudio} 
          className={`control-button ${isAudioMuted ? 'muted' : 'active'}`}
          title={isAudioMuted ? 'Mikrofon einschalten' : 'Mikrofon ausschalten'}
        >
          {isAudioMuted ? '🎤❌' : '🎤'}
        </button>
        
        <button 
          onClick={onScreenShare} 
          className={`control-button ${isSharingScreen ? 'active' : ''}`}
          title={isSharingScreen ? 'Bildschirm-Teilen beenden' : 'Bildschirm teilen'}
        >
          {isSharingScreen ? '🖥️✅' : '🖥️'}
        </button>
      </div>
      
      <button onClick={onLeave} className="leave-button">
        Stream beenden
      </button>
    </div>
  );
}

export default DailyVideoCallApp;