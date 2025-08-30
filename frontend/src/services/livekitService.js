/**
 * LiveKit Cloud Service
 * Handles all LiveKit Cloud integrations with optimized settings
 * for iPhone Safari and mobile-first approach
 */

import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const LIVEKIT_URL = process.env.REACT_APP_LIVEKIT_URL;

class LiveKitService {
    constructor() {
        this.apiClient = axios.create({
            baseURL: BACKEND_URL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        // Add request interceptor for authentication
        this.apiClient.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('access_token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );
    }

    /**
     * Generate LiveKit token for publisher (admin)
     */
    async generatePublisherToken(roomName, participantName = null, metadata = null) {
        try {
            const response = await this.apiClient.post('/api/livekit/token', {
                room_name: roomName,
                participant_type: 'publisher',
                participant_name: participantName,
                metadata: metadata || { role: 'admin', streaming: true }
            });

            return {
                token: response.data.token,
                roomName: response.data.room_name,
                participantIdentity: response.data.participant_identity,
                livekitUrl: response.data.livekit_url,
                expiresIn: response.data.expires_in
            };
        } catch (error) {
            console.error('Error generating publisher token:', error);
            throw new Error(`Failed to generate publisher token: ${error.response?.data?.detail || error.message}`);
        }
    }

    /**
     * Generate LiveKit token for viewer (customer)
     */
    async generateViewerToken(roomName, participantName = null, metadata = null) {
        try {
            const response = await this.apiClient.post('/api/livekit/token', {
                room_name: roomName,
                participant_type: 'viewer',
                participant_name: participantName,
                metadata: metadata || { role: 'customer', viewing: true }
            });

            return {
                token: response.data.token,
                roomName: response.data.room_name,
                participantIdentity: response.data.participant_identity,
                livekitUrl: response.data.livekit_url,
                expiresIn: response.data.expires_in
            };
        } catch (error) {
            console.error('Error generating viewer token:', error);
            throw new Error(`Failed to generate viewer token: ${error.response?.data?.detail || error.message}`);
        }
    }

    /**
     * Create a new LiveKit room
     */
    async createRoom(roomName, maxParticipants = 50, metadata = null) {
        try {
            const response = await this.apiClient.post('/api/livekit/room/create', {
                room_name: roomName,
                max_participants: maxParticipants,
                empty_timeout: 300, // 5 minutes
                metadata: metadata || { type: 'live_shopping', created_at: Date.now() }
            });

            return {
                roomName: response.data.room_name,
                sid: response.data.sid,
                maxParticipants: response.data.max_participants,
                numParticipants: response.data.num_participants,
                creationTime: response.data.creation_time,
                status: response.data.status
            };
        } catch (error) {
            console.error('Error creating room:', error);
            throw new Error(`Failed to create room: ${error.response?.data?.detail || error.message}`);
        }
    }

    /**
     * Get list of active rooms
     */
    async getActiveRooms() {
        try {
            const response = await this.apiClient.get('/api/livekit/rooms');
            return response.data.rooms.map(room => ({
                roomName: room.room_name,
                sid: room.sid,
                numParticipants: room.num_participants,
                maxParticipants: room.max_participants,
                isLive: room.is_live,
                creationTime: room.creation_time,
                metadata: room.metadata
            }));
        } catch (error) {
            console.error('Error getting active rooms:', error);
            throw new Error(`Failed to get active rooms: ${error.response?.data?.detail || error.message}`);
        }
    }

    /**
     * Get room information
     */
    async getRoomInfo(roomName) {
        try {
            const response = await this.apiClient.get(`/api/livekit/room/${roomName}`);
            return {
                room: response.data.room,
                participants: response.data.participants,
                isLive: response.data.is_live
            };
        } catch (error) {
            console.error('Error getting room info:', error);
            throw new Error(`Failed to get room info: ${error.response?.data?.detail || error.message}`);
        }
    }

    /**
     * End a room (admin only)
     */
    async endRoom(roomName) {
        try {
            const response = await this.apiClient.delete(`/api/livekit/room/${roomName}`);
            return response.data.message;
        } catch (error) {
            console.error('Error ending room:', error);
            throw new Error(`Failed to end room: ${error.response?.data?.detail || error.message}`);
        }
    }

    /**
     * Get LiveKit configuration optimized for mobile and iPhone Safari
     */
    async getLiveKitConfig() {
        try {
            const response = await this.apiClient.get('/api/livekit/config');
            return response.data;
        } catch (error) {
            console.error('Error getting LiveKit config:', error);
            // Return fallback config
            return this.getFallbackConfig();
        }
    }

    /**
     * Fallback configuration for LiveKit
     */
    getFallbackConfig() {
        return {
            url: LIVEKIT_URL,
            simulcast: true,
            dynacast: true,
            adaptiveStream: true,
            videoCodecs: {
                preferred: ["h264", "vp9", "av1"],
                backup: ["vp8"]
            },
            audioCodecs: {
                preferred: ["opus"],
                sampleRate: 48000,
                channels: 2
            },
            videoSettings: {
                resolution: {
                    width: 1920,
                    height: 1080
                },
                frameRate: 30,
                bitrate: {
                    min: 500000,
                    max: 5000000,
                    target: 3500000
                }
            },
            audioSettings: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                bitrate: 128000
            }
        };
    }

    /**
     * Remove participant from room (admin only)
     */
    async removeParticipant(roomName, participantIdentity) {
        try {
            const response = await this.apiClient.post(
                `/api/livekit/room/${roomName}/participant/${participantIdentity}/remove`
            );
            return response.data.message;
        } catch (error) {
            console.error('Error removing participant:', error);
            throw new Error(`Failed to remove participant: ${error.response?.data?.detail || error.message}`);
        }
    }

    /**
     * Get optimal video constraints for iPhone Safari
     */
    getOptimalVideoConstraints() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        if (isIOS || isSafari) {
            return {
                width: { ideal: 1920, max: 1920 },
                height: { ideal: 1080, max: 1080 },
                frameRate: { ideal: 30, max: 30 },
                facingMode: 'user', // Front camera by default
                aspectRatio: { ideal: 16/9 }
            };
        }

        return {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
            aspectRatio: { ideal: 16/9 }
        };
    }

    /**
     * Get optimal audio constraints
     */
    getOptimalAudioConstraints() {
        return {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 2
        };
    }

    /**
     * Create room name with timestamp
     */
    generateRoomName(prefix = 'live-shopping') {
        const timestamp = Date.now();
        return `${prefix}-${timestamp}`;
    }

    /**
     * Check if device supports required features
     */
    async checkDeviceCapabilities() {
        const capabilities = {
            webrtc: !!window.RTCPeerConnection,
            getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            camera: false,
            microphone: false,
            h264: false
        };

        try {
            // Check camera and microphone
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            capabilities.camera = stream.getVideoTracks().length > 0;
            capabilities.microphone = stream.getAudioTracks().length > 0;
            
            // Stop test stream
            stream.getTracks().forEach(track => track.stop());

            // Check H.264 support
            if (window.RTCRtpSender && RTCRtpSender.getCapabilities) {
                const videoCapabilities = RTCRtpSender.getCapabilities('video');
                capabilities.h264 = videoCapabilities.codecs.some(
                    codec => codec.mimeType.toLowerCase().includes('h264')
                );
            }
        } catch (error) {
            console.warn('Error checking device capabilities:', error);
        }

        return capabilities;
    }

    /**
     * Get connection quality metrics
     */
    async getConnectionQuality(room) {
        if (!room) return null;

        try {
            // This would be implemented with LiveKit's connection quality API
            // For now, return a placeholder
            return {
                quality: 'good', // good, fair, poor
                rtt: 0,
                bitrate: 0,
                packetLoss: 0,
                fps: 0
            };
        } catch (error) {
            console.error('Error getting connection quality:', error);
            return null;
        }
    }
}

// Export singleton instance
export const livekitService = new LiveKitService();
export default livekitService;