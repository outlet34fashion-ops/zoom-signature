"""
Daily.co Video Streaming Service
Implements professional low-latency video streaming with Daily.co
"""

import os
import httpx
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import uuid

logger = logging.getLogger(__name__)

class DailyService:
    """Service for managing Daily.co rooms and tokens"""
    
    def __init__(self):
        """Initialize Daily service with credentials from environment"""
        self.api_key = os.getenv("DAILY_API_KEY")
        self.domain = os.getenv("DAILY_DOMAIN", "live-shopping-demo")
        self.base_url = "https://api.daily.co/v1"
        
        if not self.api_key:
            logger.warning("Daily.co API key not configured - streaming features will be disabled")
            return
        
        logger.info(f"Daily.co service initialized with domain: {self.domain}")
    
    def get_headers(self) -> Dict[str, str]:
        """Get headers for Daily.co API requests"""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def create_room(
        self,
        room_name: Optional[str] = None,
        privacy: str = "public",
        max_participants: int = 100,
        properties: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a new Daily.co room for streaming
        
        Args:
            room_name: Name of the room (auto-generated if None)
            privacy: Room privacy ("public" or "private")
            max_participants: Maximum number of participants
            properties: Additional room properties
            
        Returns:
            Room information dictionary
        """
        if not self.api_key:
            raise Exception("Daily.co service not properly initialized - API key missing")
        
        try:
            room_data = {
                "privacy": privacy,
                "properties": {
                    "max_participants": max_participants,
                    "enable_screenshare": True,
                    "enable_chat": True,
                    "enable_knocking": False,
                    "lang": "de",
                    **(properties or {})
                }
            }
            
            if room_name:
                room_data["name"] = room_name
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/rooms",
                    headers=self.get_headers(),
                    json=room_data,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    room_info = response.json()
                    logger.info(f"Room created: {room_info['name']} (URL: {room_info['url']})")
                    return room_info
                else:
                    logger.error(f"Failed to create room: {response.status_code} - {response.text}")
                    raise Exception(f"Room creation failed: {response.text}")
                
        except Exception as e:
            logger.error(f"Failed to create room: {str(e)}")
            raise Exception(f"Room creation failed: {str(e)}")
    
    async def create_meeting_token(
        self,
        room_name: str,
        user_name: Optional[str] = None,
        is_owner: bool = False,
        enable_screenshare: bool = True,
        enable_recording: bool = False,
        enable_live_streaming: bool = True,
        exp: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate a meeting token for participant authentication
        
        Args:
            room_name: Name of the room
            user_name: Display name for participant
            is_owner: Whether participant has owner privileges
            enable_screenshare: Allow screen sharing
            enable_recording: Allow recording
            enable_live_streaming: Allow live streaming
            exp: Token expiration timestamp
            
        Returns:
            Token information dictionary
        """
        if not self.api_key:
            raise Exception("Daily.co service not properly initialized - API key missing")
        
        try:
            # Set expiration time (default 2 hours)
            exp_time = exp or int((datetime.utcnow() + timedelta(hours=2)).timestamp())
            
            # Build token properties according to Daily.co API
            token_properties = {
                "properties": {
                    "room_name": room_name,
                    "exp": exp_time,
                    "is_owner": is_owner,
                    "enable_screenshare": enable_screenshare,
                    "enable_recording": enable_recording,
                    "enable_live_streaming": enable_live_streaming
                }
            }
            
            if user_name:
                token_properties["properties"]["user_name"] = user_name
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/meeting-tokens",
                    headers=self.get_headers(),
                    json=token_properties,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    token_data = response.json()
                    logger.info(f"Meeting token created for user {user_name} in room {room_name}")
                    return token_data
                else:
                    logger.error(f"Failed to create meeting token: {response.status_code} - {response.text}")
                    raise Exception(f"Token creation failed: {response.text}")
                    
        except Exception as e:
            logger.error(f"Failed to create meeting token: {str(e)}")
            raise Exception(f"Token creation failed: {str(e)}")
    
    async def get_room_info(self, room_name: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a specific room
        
        Args:
            room_name: Name of the room
            
        Returns:
            Room information or None if room doesn't exist
        """
        if not self.api_key:
            raise Exception("Daily.co service not properly initialized - API key missing")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rooms/{room_name}",
                    headers=self.get_headers(),
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 404:
                    return None
                else:
                    logger.error(f"Failed to get room info: {response.status_code} - {response.text}")
                    raise Exception(f"Failed to get room info: {response.text}")
                    
        except Exception as e:
            logger.error(f"Failed to get room info for {room_name}: {str(e)}")
            raise Exception(f"Failed to get room info: {str(e)}")
    
    async def list_rooms(self) -> List[Dict[str, Any]]:
        """
        List all Daily.co rooms
        
        Returns:
            List of room information dictionaries
        """
        if not self.api_key:
            raise Exception("Daily.co service not properly initialized - API key missing")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rooms",
                    headers=self.get_headers(),
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    rooms_data = response.json()
                    rooms = rooms_data.get("data", [])
                    logger.info(f"Listed {len(rooms)} rooms")
                    return rooms
                else:
                    logger.error(f"Failed to list rooms: {response.status_code} - {response.text}")
                    raise Exception(f"Failed to list rooms: {response.text}")
                    
        except Exception as e:
            logger.error(f"Failed to list rooms: {str(e)}")
            raise Exception(f"Failed to list rooms: {str(e)}")
    
    async def delete_room(self, room_name: str) -> bool:
        """
        Delete a Daily.co room
        
        Args:
            room_name: Name of the room to delete
            
        Returns:
            True if successful, False otherwise
        """
        if not self.api_key:
            raise Exception("Daily.co service not properly initialized - API key missing")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.base_url}/rooms/{room_name}",
                    headers=self.get_headers(),
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    logger.info(f"Room deleted: {room_name}")
                    return True
                else:
                    logger.error(f"Failed to delete room: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Failed to delete room {room_name}: {str(e)}")
            return False
    
    def get_daily_config(self) -> Dict[str, Any]:
        """
        Get Daily.co configuration for client-side connection
        
        Returns:
            Configuration dictionary for Daily.co client
        """
        return {
            "domain": self.domain,
            "theme": {
                "accent": "#8B5CF6",  # Purple theme
                "accentText": "#FFFFFF",
                "background": "#1F1F23",
                "backgroundAccent": "#2D2D37",
                "baseText": "#FFFFFF",
                "border": "#404040",
                "mainAreaBg": "#1F1F23",
                "mainAreaBgAccent": "#2D2D37",
                "supportiveText": "#A0A0A0"
            },
            "videoSettings": {
                "showParticipantLabels": True,
                "showLeaveButton": True,
                "showFullscreenButton": True,
                "showPeopleUI": True,
                "showChatUI": True,
                "showScreenshareUI": True
            },
            "audioSettings": {
                "microphoneAccess": "host-only",
                "startWithMicOff": False
            }
        }

# Global instance
daily_service = DailyService()