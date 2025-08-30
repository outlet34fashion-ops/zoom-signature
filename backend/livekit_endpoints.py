"""
LiveKit API Endpoints für OUTLET34 Live Shopping
FUNKTIONIERENDE Implementation
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging

from .livekit_streaming import (
    livekit_service,
    RoomCreateRequest,
    TokenRequest,
    create_outlet34_room,
    create_admin_token,
    create_viewer_token
)

logger = logging.getLogger(__name__)

# Router erstellen
livekit_router = APIRouter(prefix="/api/livekit", tags=["LiveKit Streaming"])

class QuickRoomRequest(BaseModel):
    product_id: Optional[str] = None
    admin_name: Optional[str] = "outlet34-admin"

class QuickTokenRequest(BaseModel):
    room_name: str
    user_id: str
    is_admin: Optional[bool] = False

@livekit_router.post("/rooms/create")
async def create_room(request: RoomCreateRequest):
    """
    LiveKit Raum erstellen
    """
    try:
        logger.info(f"🏠 API: Creating room {request.name}")
        result = await livekit_service.create_room(request)
        logger.info(f"✅ API: Room created - {result['room_id']}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ API: Room creation error - {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@livekit_router.post("/rooms/quick-create")
async def quick_create_room(request: QuickRoomRequest):
    """
    Schnell einen OUTLET34 Raum erstellen und Admin Token generieren
    """
    try:
        logger.info(f"🚀 API: Quick creating room for product {request.product_id}")
        
        # 1. Raum erstellen
        room_result = await create_outlet34_room(request.product_id)
        room_name = room_result["room_name"]
        
        # 2. Admin Token erstellen
        admin_token = await create_admin_token(room_name, request.admin_name)
        
        logger.info(f"✅ API: Quick room setup complete - {room_name}")
        
        return {
            "success": True,
            "room": room_result,
            "admin_token": admin_token,
            "join_url": f"livekit://{room_result['livekit_url']}/{room_name}"
        }
        
    except Exception as e:
        logger.error(f"❌ API: Quick room creation error - {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@livekit_router.post("/tokens/generate")
async def generate_token(request: TokenRequest):
    """
    Access Token für Teilnehmer generieren
    """
    try:
        logger.info(f"🎫 API: Generating token for {request.participant_name}")
        result = await livekit_service.generate_token(request)
        logger.info(f"✅ API: Token generated for {request.participant_name}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ API: Token generation error - {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@livekit_router.post("/tokens/quick-generate")
async def quick_generate_token(request: QuickTokenRequest):
    """
    Schnell Token für Benutzer generieren
    """
    try:
        logger.info(f"🚀 API: Quick token for user {request.user_id}")
        
        if request.is_admin:
            result = await create_admin_token(request.room_name, f"admin-{request.user_id}")
        else:
            result = await create_viewer_token(request.room_name, request.user_id)
        
        logger.info(f"✅ API: Quick token generated for {request.user_id}")
        return result
        
    except Exception as e:
        logger.error(f"❌ API: Quick token error - {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@livekit_router.get("/rooms/list")
async def list_rooms():
    """
    Aktive Räume auflisten
    """
    try:
        logger.info("📋 API: Listing rooms")
        result = await livekit_service.list_rooms()
        logger.info(f"✅ API: Found {result['total_rooms']} rooms")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ API: List rooms error - {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@livekit_router.get("/rooms/{room_name}/status")
async def get_room_status(room_name: str):
    """
    Status eines spezifischen Raums
    """
    try:
        logger.info(f"📊 API: Getting status for room {room_name}")
        result = await livekit_service.get_room_status(room_name)
        logger.info(f"✅ API: Room status retrieved - {result['participant_count']} participants")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ API: Room status error - {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@livekit_router.delete("/rooms/{room_name}")
async def delete_room(room_name: str):
    """
    Raum löschen
    """
    try:
        logger.info(f"🗑️ API: Deleting room {room_name}")
        result = await livekit_service.delete_room(room_name)
        logger.info(f"✅ API: Room deleted - {room_name}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ API: Delete room error - {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@livekit_router.get("/config/frontend")
async def get_frontend_config():
    """
    Frontend-Konfiguration für LiveKit Client
    """
    try:
        logger.info("⚙️ API: Getting frontend config")
        config = livekit_service.get_frontend_config()
        return {
            "success": True,
            "config": config
        }
    except Exception as e:
        logger.error(f"❌ API: Frontend config error - {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@livekit_router.get("/health")
async def livekit_health():
    """
    LiveKit Service Health Check
    """
    try:
        # Test LiveKit connection
        rooms = await livekit_service.list_rooms()
        
        return {
            "success": True,
            "status": "healthy",
            "livekit_url": livekit_service.config.url,
            "active_rooms": rooms["total_rooms"],
            "sdk_available": True
        }
    except Exception as e:
        logger.error(f"❌ API: Health check failed - {str(e)}")
        return {
            "success": False,
            "status": "unhealthy",
            "error": str(e),
            "sdk_available": False
        }

# Export router
__all__ = ["livekit_router"]