"""
FUNKTIONIERENDE LiveKit Streaming Implementation für OUTLET34
Basiert auf LiveKit Integration Playbook
"""

import os
import logging
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import uuid

from fastapi import HTTPException
from pydantic import BaseModel

# LiveKit Imports
try:
    from livekit import api
    from livekit.api import AccessToken, VideoGrants, CreateRoomRequest, ListRoomsRequest
    LIVEKIT_AVAILABLE = True
except ImportError as e:
    print(f"LiveKit not available: {e}")
    LIVEKIT_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LiveKitConfig:
    """LiveKit configuration management"""
    
    def __init__(self):
        self.url = os.getenv("LIVEKIT_URL", "wss://live-stream-q7s7lvvw.livekit.cloud")
        self.api_key = os.getenv("LIVEKIT_API_KEY", "APInU4CkTuQLWBj")
        self.api_secret = os.getenv("LIVEKIT_API_SECRET", "SQUALLZWpP034ZdOk35sePtWyVVaMA8Lutg7UHMFOFD")
        
        if not all([self.url, self.api_key, self.api_secret]):
            raise ValueError("LiveKit credentials not configured")
        
        logger.info(f"LiveKit configured: {self.url}")

# Global config instance
livekit_config = LiveKitConfig()

class RoomCreateRequest(BaseModel):
    name: str
    product_id: Optional[str] = None
    max_participants: Optional[int] = 100
    recording_enabled: Optional[bool] = False

class TokenRequest(BaseModel):
    room_name: str
    participant_name: str
    is_admin: Optional[bool] = False

class LiveKitStreamingService:
    """Hauptklasse für LiveKit Streaming Operations"""
    
    def __init__(self):
        self.config = livekit_config
        self.active_rooms = {}
        self.participants = {}
        
    def get_livekit_api(self):
        """LiveKit API Client erstellen"""
        if not LIVEKIT_AVAILABLE:
            raise HTTPException(status_code=500, detail="LiveKit SDK nicht verfügbar")
            
        return api.LiveKitAPI(
            url=self.config.url,
            api_key=self.config.api_key,
            api_secret=self.config.api_secret
        )
    
    async def create_room(self, request: RoomCreateRequest) -> Dict[str, Any]:
        """Neuen LiveKit Raum erstellen"""
        try:
            logger.info(f"🏠 Creating LiveKit room: {request.name}")
            
            lk_api = self.get_livekit_api()
            
            # Room erstellen
            room_info = await lk_api.room.create_room(
                CreateRoomRequest(
                    name=request.name,
                    max_participants=request.max_participants,
                    empty_timeout=300,  # 5 minutes
                    departure_timeout=60,  # 1 minute
                    metadata=f"product_id:{request.product_id or 'none'}"
                )
            )
            
            # Room in lokaler Registry speichern
            self.active_rooms[request.name] = {
                "sid": room_info.sid,
                "name": room_info.name,
                "created_at": datetime.utcnow(),
                "product_id": request.product_id,
                "max_participants": request.max_participants,
                "participants": []
            }
            
            await lk_api.aclose()
            
            logger.info(f"✅ LiveKit room created successfully: {room_info.sid}")
            
            return {
                "success": True,
                "room_id": room_info.sid,
                "room_name": room_info.name,
                "livekit_url": self.config.url,
                "created_at": room_info.creation_time,
                "max_participants": room_info.max_participants
            }
            
        except Exception as e:
            logger.error(f"❌ Room creation failed: {str(e)}")
            raise HTTPException(
                status_code=500, 
                detail=f"LiveKit room creation failed: {str(e)}"
            )
    
    async def generate_token(self, request: TokenRequest) -> Dict[str, Any]:
        """Access Token für Teilnehmer generieren"""
        try:
            logger.info(f"🎫 Generating token for {request.participant_name} (admin: {request.is_admin})")
            
            # Token erstellen
            token = AccessToken(self.config.api_key, self.config.api_secret)
            token = token.with_identity(request.participant_name)
            
            # Permissions je nach Rolle
            if request.is_admin:
                grants = VideoGrants(
                    room_join=True,
                    room=request.room_name,
                    room_admin=True,
                    can_publish=True,
                    can_subscribe=True,
                    can_publish_data=True
                )
                logger.info(f"👑 Admin permissions granted for {request.participant_name}")
            else:
                grants = VideoGrants(
                    room_join=True,
                    room=request.room_name,
                    can_subscribe=True,
                    can_publish_data=True
                )
                logger.info(f"👤 Viewer permissions granted for {request.participant_name}")
            
            token = token.with_grants(grants)
            token = token.with_ttl("4h")  # 4 Stunden gültig
            
            jwt_token = token.to_jwt()
            
            # Teilnehmer registrieren
            if request.room_name not in self.participants:
                self.participants[request.room_name] = []
            
            self.participants[request.room_name].append({
                "name": request.participant_name,
                "is_admin": request.is_admin,
                "joined_at": datetime.utcnow(),
                "token_expires": datetime.utcnow() + timedelta(hours=4)
            })
            
            logger.info(f"✅ Token generated successfully for {request.participant_name}")
            
            return {
                "success": True,
                "token": jwt_token,
                "participant_name": request.participant_name,
                "room_name": request.room_name,
                "livekit_url": self.config.url,
                "expires_in": 14400,  # 4 hours in seconds
                "is_admin": request.is_admin
            }
            
        except Exception as e:
            logger.error(f"❌ Token generation failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Token generation failed: {str(e)}"
            )
    
    async def list_rooms(self) -> Dict[str, Any]:
        """Aktive Räume auflisten"""
        try:
            lk_api = self.get_livekit_api()
            
            rooms_response = await lk_api.room.list_rooms(ListRoomsRequest())
            await lk_api.aclose()
            
            rooms_list = []
            for room in rooms_response.rooms:
                local_room = self.active_rooms.get(room.name, {})
                rooms_list.append({
                    "sid": room.sid,
                    "name": room.name,
                    "num_participants": room.num_participants,
                    "creation_time": room.creation_time,
                    "product_id": local_room.get("product_id"),
                    "metadata": room.metadata
                })
            
            return {
                "success": True,
                "rooms": rooms_list,
                "total_rooms": len(rooms_list)
            }
            
        except Exception as e:
            logger.error(f"❌ List rooms failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to list rooms: {str(e)}"
            )
    
    async def get_room_status(self, room_name: str) -> Dict[str, Any]:
        """Status eines spezifischen Raums abrufen"""
        try:
            lk_api = self.get_livekit_api()
            
            # Participants abrufen
            participants_response = await lk_api.room.list_participants(
                api.ListParticipantsRequest(room=room_name)
            )
            
            await lk_api.aclose()
            
            participants_list = []
            admin_count = 0
            viewer_count = 0
            
            for p in participants_response.participants:
                local_participant = None
                room_participants = self.participants.get(room_name, [])
                for lp in room_participants:
                    if lp["name"] == p.identity:
                        local_participant = lp
                        break
                
                is_admin = local_participant["is_admin"] if local_participant else False
                if is_admin:
                    admin_count += 1
                else:
                    viewer_count += 1
                
                participants_list.append({
                    "identity": p.identity,
                    "name": p.name or p.identity,
                    "is_admin": is_admin,
                    "is_publisher": len(p.tracks) > 0,
                    "track_count": len(p.tracks),
                    "joined_at": p.joined_at,
                    "metadata": p.metadata
                })
            
            # Local room info
            local_room = self.active_rooms.get(room_name, {})
            
            return {
                "success": True,
                "room_name": room_name,
                "participant_count": len(participants_list),
                "admin_count": admin_count,
                "viewer_count": viewer_count,
                "participants": participants_list,
                "room_info": local_room
            }
            
        except Exception as e:
            logger.error(f"❌ Get room status failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to get room status: {str(e)}"
            )
    
    async def delete_room(self, room_name: str) -> Dict[str, Any]:
        """Raum löschen"""
        try:
            lk_api = self.get_livekit_api()
            
            await lk_api.room.delete_room(
                api.DeleteRoomRequest(room=room_name)
            )
            
            await lk_api.aclose()
            
            # Aus lokaler Registry entfernen
            if room_name in self.active_rooms:
                del self.active_rooms[room_name]
            if room_name in self.participants:
                del self.participants[room_name]
            
            logger.info(f"✅ Room {room_name} deleted successfully")
            
            return {
                "success": True,
                "message": f"Room {room_name} deleted successfully"
            }
            
        except Exception as e:
            logger.error(f"❌ Delete room failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to delete room: {str(e)}"
            )
    
    def get_frontend_config(self) -> Dict[str, Any]:
        """Frontend-Konfiguration für LiveKit Client"""
        return {
            "livekit_url": self.config.url,
            "features": {
                "video_enabled": True,
                "audio_enabled": True,
                "chat_enabled": True,
                "screen_share": True,
                "recording": False
            },
            "quality_presets": {
                "mobile_low": {"width": 480, "height": 360, "framerate": 15},
                "mobile_standard": {"width": 720, "height": 480, "framerate": 30},
                "mobile_hd": {"width": 1280, "height": 720, "framerate": 30}
            }
        }

# Global service instance
livekit_service = LiveKitStreamingService()

# Utility functions für direkten Gebrauch
async def create_outlet34_room(product_id: str = None) -> Dict[str, Any]:
    """Convenience function zum Erstellen eines OUTLET34 Raums"""
    room_name = f"outlet34-{uuid.uuid4().hex[:8]}"
    
    request = RoomCreateRequest(
        name=room_name,
        product_id=product_id,
        max_participants=100,
        recording_enabled=False
    )
    
    return await livekit_service.create_room(request)

async def create_admin_token(room_name: str, admin_name: str = "outlet34-admin") -> Dict[str, Any]:
    """Convenience function für Admin Token"""
    request = TokenRequest(
        room_name=room_name,
        participant_name=admin_name,
        is_admin=True
    )
    
    return await livekit_service.generate_token(request)

async def create_viewer_token(room_name: str, viewer_id: str) -> Dict[str, Any]:
    """Convenience function für Viewer Token"""
    request = TokenRequest(
        room_name=room_name,
        participant_name=f"viewer-{viewer_id}",
        is_admin=False
    )
    
    return await livekit_service.generate_token(request)