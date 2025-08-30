"""
LiveKit Cloud Token Service
Implements professional video streaming with LiveKit Cloud
"""

import os
import logging
from datetime import timedelta
from typing import Dict, List, Optional, Any
from livekit import api
import asyncio

logger = logging.getLogger(__name__)

class LiveKitTokenService:
    """Service for managing LiveKit Cloud tokens and rooms"""
    
    def __init__(self):
        """Initialize LiveKit service with credentials from environment"""
        self.api_key = os.getenv("LIVEKIT_API_KEY")
        self.api_secret = os.getenv("LIVEKIT_API_SECRET")
        self.livekit_url = os.getenv("LIVEKIT_URL", "wss://live-stream-q7s7lvvw.livekit.cloud")
        
        if not self.api_key or not self.api_secret:
            logger.warning("LiveKit API credentials not configured - LiveKit features will be disabled")
            self.livekit_api = None
            return
        
        try:
            # Initialize LiveKit API client
            self.livekit_api = api.LiveKitAPI(
                url=self.livekit_url,
                api_key=self.api_key,
                api_secret=self.api_secret
            )
            
            logger.info(f"LiveKit service initialized with URL: {self.livekit_url}")
        except Exception as e:
            logger.error(f"Failed to initialize LiveKit API: {str(e)}")
            self.livekit_api = None
    
    async def create_publisher_token(
        self,
        room_name: str,
        participant_identity: str,
        participant_name: str = None,
        metadata: Dict[str, Any] = None
    ) -> str:
        """
        Generate LiveKit access token for publisher (admin streamer)
        
        Args:
            room_name: Name of the room
            participant_identity: Unique identity for participant
            participant_name: Display name for participant
            metadata: Additional metadata
            
        Returns:
            JWT token string for LiveKit access
        """
        if not self.livekit_api:
            raise Exception("LiveKit service not properly initialized - credentials missing")
            
        try:
            # Create access token with publisher permissions
            token = api.AccessToken(self.api_key, self.api_secret)
            token.with_identity(participant_identity)
            
            if participant_name:
                token.with_name(participant_name)
            
            if metadata:
                token.with_metadata(str(metadata))
            
            # Configure video grants for publisher (full permissions)
            video_grants = api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,        # Can publish video/audio
                can_subscribe=True,      # Can subscribe to other streams
                can_publish_data=True,   # Can send chat messages
                can_update_own_metadata=True, # Can update own metadata
                # High quality settings for publisher
                room_admin=True,
                room_create=True
            )
            
            token.with_grants(video_grants)
            
            # Token valid for 2 hours (streaming session)
            token.with_ttl(timedelta(hours=2))
            
            jwt_token = token.to_jwt()
            logger.info(f"Publisher token created for {participant_identity} in room {room_name}")
            
            return jwt_token
            
        except Exception as e:
            logger.error(f"Failed to create publisher token: {str(e)}")
            raise Exception(f"Token generation failed: {str(e)}")
    
    async def create_viewer_token(
        self,
        room_name: str,
        participant_identity: str,
        participant_name: str = None,
        metadata: Dict[str, Any] = None
    ) -> str:
        """
        Generate LiveKit access token for viewer (view-only customer)
        
        Args:
            room_name: Name of the room
            participant_identity: Unique identity for participant
            participant_name: Display name for participant
            metadata: Additional metadata
            
        Returns:
            JWT token string for LiveKit access
        """
        if not self.livekit_api:
            raise Exception("LiveKit service not properly initialized - credentials missing")
            
        try:
            # Create access token with viewer permissions only
            token = api.AccessToken(self.api_key, self.api_secret)
            token.with_identity(participant_identity)
            
            if participant_name:
                token.with_name(participant_name)
            
            if metadata:
                token.with_metadata(str(metadata))
            
            # Configure video grants for viewer (view-only permissions)
            video_grants = api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=False,       # Cannot publish video/audio
                can_subscribe=True,      # Can subscribe to streams
                can_publish_data=True,   # Can send chat messages
                can_update_own_metadata=False, # Cannot update metadata
                room_admin=False,
                room_create=False
            )
            
            token.with_grants(video_grants)
            
            # Token valid for 2 hours
            token.with_ttl(timedelta(hours=2))
            
            jwt_token = token.to_jwt()
            logger.info(f"Viewer token created for {participant_identity} in room {room_name}")
            
            return jwt_token
            
        except Exception as e:
            logger.error(f"Failed to create viewer token: {str(e)}")
            raise Exception(f"Token generation failed: {str(e)}")
    
    async def create_room(
        self,
        room_name: str,
        max_participants: int = 50,
        empty_timeout: int = 300,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Create a new LiveKit room for streaming
        
        Args:
            room_name: Name of the room to create
            max_participants: Maximum number of participants
            empty_timeout: Timeout when room is empty (seconds)
            metadata: Room metadata
            
        Returns:
            Room information dictionary
        """
        if not self.livekit_api:
            raise Exception("LiveKit service not properly initialized - credentials missing")
            
        try:
            # Create room request
            room_request = api.CreateRoomRequest(
                name=room_name,
                empty_timeout=empty_timeout,
                max_participants=max_participants,
                metadata=str(metadata) if metadata else ""
            )
            
            # Create the room
            room_info = await self.livekit_api.room.create_room(room_request)
            
            logger.info(f"Room created: {room_name} with max participants: {max_participants}")
            
            return {
                "name": room_info.name,
                "sid": room_info.sid,
                "creation_time": room_info.creation_time,
                "max_participants": room_info.max_participants,
                "num_participants": room_info.num_participants,
                "empty_timeout": room_info.empty_timeout,
                "metadata": room_info.metadata
            }
            
        except Exception as e:
            logger.error(f"Failed to create room {room_name}: {str(e)}")
            raise Exception(f"Room creation failed: {str(e)}")
    
    async def get_room_info(self, room_name: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a specific room
        
        Args:
            room_name: Name of the room
            
        Returns:
            Room information or None if room doesn't exist
        """
        if not self.livekit_api:
            raise Exception("LiveKit service not properly initialized - credentials missing")
            
        try:
            # List rooms and find the specific one
            request = api.ListRoomsRequest()
            response = await self.livekit_api.room.list_rooms(request)
            
            for room in response.rooms:
                if room.name == room_name:
                    return {
                        "name": room.name,
                        "sid": room.sid,
                        "num_participants": room.num_participants,
                        "max_participants": room.max_participants,
                        "creation_time": room.creation_time,
                        "metadata": room.metadata,
                        "empty_timeout": room.empty_timeout
                    }
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get room info for {room_name}: {str(e)}")
            raise Exception(f"Failed to get room info: {str(e)}")
    
    async def list_active_rooms(self) -> List[Dict[str, Any]]:
        """
        List all active LiveKit rooms
        
        Returns:
            List of room information dictionaries
        """
        if not self.livekit_api:
            raise Exception("LiveKit service not properly initialized - credentials missing")
            
        try:
            request = api.ListRoomsRequest()
            response = await self.livekit_api.room.list_rooms(request)
            
            rooms = []
            for room in response.rooms:
                rooms.append({
                    "name": room.name,
                    "sid": room.sid,
                    "num_participants": room.num_participants,
                    "max_participants": room.max_participants,
                    "creation_time": room.creation_time,
                    "metadata": room.metadata
                })
            
            logger.info(f"Listed {len(rooms)} active rooms")
            return rooms
            
        except Exception as e:
            logger.error(f"Failed to list rooms: {str(e)}")
            raise Exception(f"Failed to list rooms: {str(e)}")
    
    async def end_room(self, room_name: str) -> bool:
        """
        End/delete a LiveKit room
        
        Args:
            room_name: Name of the room to end
            
        Returns:
            True if successful, False otherwise
        """
        if not self.livekit_api:
            raise Exception("LiveKit service not properly initialized - credentials missing")
            
        try:
            request = api.DeleteRoomRequest(room=room_name)
            await self.livekit_api.room.delete_room(request)
            
            logger.info(f"Room ended: {room_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to end room {room_name}: {str(e)}")
            return False
    
    async def get_participants(self, room_name: str) -> List[Dict[str, Any]]:
        """
        Get list of participants in a room
        
        Args:
            room_name: Name of the room
            
        Returns:
            List of participant information
        """
        if not self.livekit_api:
            raise Exception("LiveKit service not properly initialized - credentials missing")
            
        try:
            request = api.ListParticipantsRequest(room=room_name)
            response = await self.livekit_api.room.list_participants(request)
            
            participants = []
            for participant in response.participants:
                participants.append({
                    "identity": participant.identity,
                    "name": participant.name,
                    "sid": participant.sid,
                    "state": participant.state.name,
                    "joined_at": participant.joined_at,
                    "metadata": participant.metadata,
                    "permission": {
                        "can_subscribe": participant.permission.can_subscribe,
                        "can_publish": participant.permission.can_publish,
                        "can_publish_data": participant.permission.can_publish_data
                    }
                })
            
            return participants
            
        except Exception as e:
            logger.error(f"Failed to get participants for room {room_name}: {str(e)}")
            return []
    
    async def remove_participant(
        self,
        room_name: str,
        participant_identity: str
    ) -> bool:
        """
        Remove a participant from a room
        
        Args:
            room_name: Name of the room
            participant_identity: Identity of participant to remove
            
        Returns:
            True if successful, False otherwise
        """
        if not self.livekit_api:
            raise Exception("LiveKit service not properly initialized - credentials missing")
            
        try:
            request = api.RemoveParticipantRequest(
                room=room_name,
                identity=participant_identity
            )
            
            await self.livekit_api.room.remove_participant(request)
            logger.info(f"Participant {participant_identity} removed from room {room_name}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to remove participant {participant_identity}: {str(e)}")
            return False
    
    async def get_livekit_config(self) -> Dict[str, Any]:
        """
        Get LiveKit configuration for client-side connection
        
        Returns:
            Configuration dictionary for LiveKit client
        """
        return {
            "url": self.livekit_url,
            "simulcast": True,  # Enable simulcast for quality adaptation
            "dynacast": True,   # Enable dynacast for efficient streaming
            "adaptiveStream": True,  # Enable adaptive streaming
            "videoCodecs": {
                "preferred": ["h264", "vp9", "av1"],  # Codec priority
                "backup": ["vp8"]
            },
            "audioCodecs": {
                "preferred": ["opus"],  # High quality Opus audio
                "sampleRate": 48000,    # 48 kHz sample rate
                "channels": 2           # Stereo
            },
            "videoSettings": {
                "resolution": {
                    "width": 1920,      # 1080p resolution
                    "height": 1080
                },
                "frameRate": 30,        # 30fps
                "bitrate": {
                    "min": 500000,      # 0.5 Mbps minimum
                    "max": 5000000,     # 5 Mbps maximum
                    "target": 3500000   # 3.5 Mbps target
                }
            },
            "audioSettings": {
                "echoCancellation": True,
                "noiseSuppression": True,
                "autoGainControl": True,
                "bitrate": 128000       # 128 kbps audio
            }
        }
    
    async def close(self):
        """Close the LiveKit API connection"""
        if not self.livekit_api:
            return
            
        try:
            await self.livekit_api.aclose()
            logger.info("LiveKit service connection closed")
        except Exception as e:
            logger.error(f"Error closing LiveKit service: {str(e)}")

# Global instance
livekit_service = LiveKitTokenService()