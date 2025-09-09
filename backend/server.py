from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException, File, UploadFile, Depends
from fastapi.websockets import WebSocketState
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime, timezone, timedelta
import json
import jwt
import time
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import Daily.co service after loading environment variables
from daily_service import daily_service
# CRITICAL: Import Zebra Printer Service for automatic label printing
from zebra_printer import zebra_printer

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Zoom SDK Configuration
ZOOM_SDK_KEY = os.environ.get('ZOOM_SDK_KEY')
ZOOM_SDK_SECRET = os.environ.get('ZOOM_SDK_SECRET')

if not ZOOM_SDK_KEY or not ZOOM_SDK_SECRET:
    raise ValueError("Zoom SDK credentials must be set in environment variables")

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.viewer_count = 0

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.viewer_count += 1
        await self.broadcast_viewer_count()

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            self.viewer_count -= 1

    async def send_personal_message(self, message: str, websocket: WebSocket):
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.send_text(message)

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                if connection.client_state == WebSocketState.CONNECTED:
                    await connection.send_text(message)
                else:
                    disconnected.append(connection)
            except:
                disconnected.append(connection)
        
        # Remove disconnected clients
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)
                self.viewer_count -= 1

    async def broadcast_viewer_count(self):
        message = json.dumps({
            "type": "viewer_count",
            "count": self.viewer_count
        })
        await self.broadcast(message)

manager = ConnectionManager()

def generate_zoom_jwt(topic: str, role: int = 0, expires_in_hours: int = 2) -> str:
    """
    Generate JWT token for Zoom Video SDK authentication
    """
    try:
        current_time = int(time.time())
        expiration_time = current_time + (expires_in_hours * 3600)
        
        payload = {
            'iss': ZOOM_SDK_KEY,
            'exp': expiration_time,
            'topic': topic,
            'role_type': role,
            'aud': 'zoom',
            'alg': 'HS256'
        }
        
        token = jwt.encode(payload, ZOOM_SDK_SECRET, algorithm='HS256')
        return token
        
    except Exception as e:
        logging.error(f"JWT generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Token generation failed")

# Models
class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    message: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    emoji: str = ""

class ChatMessageCreate(BaseModel):
    username: str
    message: str
    emoji: str = ""

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float
    sizes: List[str]
    image_url: str = ""
    description: str = ""

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    product_id: str
    size: str
    quantity: int
    price: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    customer_id: str
    product_id: str
    size: str
    quantity: int
    price: float = None  # Allow custom price

class ZoomTokenRequest(BaseModel):
    topic: str
    user_name: str
    role: Optional[int] = 0  # 0 for participant, 1 for host

class LiveShoppingEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # YYYY-MM-DD format
    time: str  # HH:MM format
    title: str
    description: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LiveShoppingEventCreate(BaseModel):
    date: str  # YYYY-MM-DD format
    time: str  # HH:MM format
    title: str
    description: str = ""

class LiveShoppingEventUpdate(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None

class ZoomSessionRequest(BaseModel):
    topic: str
    duration: Optional[int] = 60  # duration in minutes
    password: Optional[str] = None

# WebRTC Streaming Models
class StreamSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    streamer_id: str
    stream_title: str = "Live Shopping Stream"
    status: str = "active"  # active, ended
    viewer_count: int = 0
    max_viewers: int = 50
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ended_at: Optional[datetime] = None

class StreamSessionCreate(BaseModel):
    stream_title: Optional[str] = "Live Shopping Stream"
    max_viewers: Optional[int] = 50

class WebRTCOffer(BaseModel):
    sdp: str
    type: str

class WebRTCAnswer(BaseModel):
    sdp: str
    type: str

class ICECandidate(BaseModel):
    candidate: str
    sdpMLineIndex: int
    sdpMid: str

# Daily.co Models
class DailyTokenRequest(BaseModel):
    room_name: str
    user_name: Optional[str] = None
    is_owner: bool = False
    enable_screenshare: bool = True
    enable_recording: bool = False
    enable_live_streaming: bool = True

class DailyTokenResponse(BaseModel):
    token: str
    room_name: str
    user_name: Optional[str] = None
    is_owner: bool
    expires_in: int = 7200  # 2 hours

class DailyRoomRequest(BaseModel):
    room_name: Optional[str] = None
    privacy: str = "public"
    max_participants: Optional[int] = 100
    properties: Optional[Dict[str, Any]] = None

class DailyRoomResponse(BaseModel):
    id: str
    name: str
    api_created: bool
    privacy: str
    url: str
    created_at: str
    config: Dict[str, Any]

# Customer Management Models
class Customer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_number: str
    email: str
    name: str
    profile_image: Optional[str] = None  # URL to profile image
    activation_status: str = "pending"  # pending, active, blocked
    preferred_language: str = "de"  # de, en, tr, fr
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerCreate(BaseModel):
    customer_number: str
    email: str
    name: str
    profile_image: Optional[str] = None
    preferred_language: Optional[str] = "de"  # de, en, tr, fr

class CustomerUpdate(BaseModel):
    activation_status: str  # active, blocked
    profile_image: Optional[str] = None

# In-memory counter and settings for demo
order_counter = 0
ticker_settings = {
    "text": "Nur für Händler | Ab 10 € - Heute 18:00 - Frische Ware | Young Fashion & Plus Size",
    "enabled": True
}

# WebRTC Stream Manager
class WebRTCStreamManager:
    def __init__(self):
        self.active_streams: Dict[str, StreamSession] = {}
        self.stream_connections: Dict[str, List[WebSocket]] = {}  # stream_id -> viewer connections
        self.streamer_connections: Dict[str, WebSocket] = {}  # stream_id -> streamer connection
        
    async def create_stream(self, streamer_id: str, stream_data: StreamSessionCreate) -> StreamSession:
        """Create new streaming session"""
        stream = StreamSession(
            streamer_id=streamer_id,
            stream_title=stream_data.stream_title,
            max_viewers=stream_data.max_viewers
        )
        
        self.active_streams[stream.id] = stream
        self.stream_connections[stream.id] = []
        
        # Store in database
        await db.stream_sessions.insert_one(stream.dict())
        
        return stream
    
    async def join_stream(self, stream_id: str, viewer_ws: WebSocket) -> bool:
        """Add viewer to stream"""
        if stream_id not in self.active_streams:
            return False
            
        stream = self.active_streams[stream_id]
        if len(self.stream_connections[stream_id]) >= stream.max_viewers:
            return False
            
        self.stream_connections[stream_id].append(viewer_ws)
        stream.viewer_count = len(self.stream_connections[stream_id])
        
        # Update database
        await db.stream_sessions.update_one(
            {"id": stream_id},
            {"$set": {"viewer_count": stream.viewer_count}}
        )
        
        # Broadcast viewer count update
        await self.broadcast_to_stream(stream_id, {
            "type": "viewer_count_update",
            "count": stream.viewer_count
        })
        
        return True
    
    async def leave_stream(self, stream_id: str, viewer_ws: WebSocket):
        """Remove viewer from stream"""
        if stream_id in self.stream_connections:
            if viewer_ws in self.stream_connections[stream_id]:
                self.stream_connections[stream_id].remove(viewer_ws)
                
            if stream_id in self.active_streams:
                stream = self.active_streams[stream_id]
                stream.viewer_count = len(self.stream_connections[stream_id])
                
                # Update database
                await db.stream_sessions.update_one(
                    {"id": stream_id},
                    {"$set": {"viewer_count": stream.viewer_count}}
                )
                
                # Broadcast viewer count update
                await self.broadcast_to_stream(stream_id, {
                    "type": "viewer_count_update",
                    "count": stream.viewer_count
                })
    
    async def end_stream(self, stream_id: str, streamer_id: str) -> bool:
        """End streaming session"""
        if stream_id not in self.active_streams:
            return False
            
        stream = self.active_streams[stream_id]
        if stream.streamer_id != streamer_id:
            return False
            
        # Notify all viewers
        await self.broadcast_to_stream(stream_id, {
            "type": "stream_ended",
            "message": "The stream has ended"
        })
        
        # Update database
        stream.status = "ended"
        stream.ended_at = datetime.now(timezone.utc)
        await db.stream_sessions.update_one(
            {"id": stream_id},
            {"$set": {"status": "ended", "ended_at": stream.ended_at}}
        )
        
        # Cleanup
        if stream_id in self.streamer_connections:
            del self.streamer_connections[stream_id]
        if stream_id in self.stream_connections:
            del self.stream_connections[stream_id]
        del self.active_streams[stream_id]
        
        return True
    
    async def broadcast_to_stream(self, stream_id: str, message: dict):
        """Broadcast message to all participants in stream"""
        if stream_id not in self.stream_connections:
            return
            
        message_str = json.dumps(message, default=str)
        disconnected = []
        
        # Send to all viewers
        for ws in self.stream_connections[stream_id]:
            try:
                if ws.client_state == WebSocketState.CONNECTED:
                    await ws.send_text(message_str)
                else:
                    disconnected.append(ws)
            except:
                disconnected.append(ws)
        
        # Send to streamer
        if stream_id in self.streamer_connections:
            try:
                streamer_ws = self.streamer_connections[stream_id]
                if streamer_ws.client_state == WebSocketState.CONNECTED:
                    await streamer_ws.send_text(message_str)
            except:
                pass
        
        # Cleanup disconnected viewers
        for ws in disconnected:
            await self.leave_stream(stream_id, ws)

stream_manager = WebRTCStreamManager()

# Routes
@api_router.get("/")
async def root():
    return {"message": "Live Shopping App API with Zoom Integration"}

@api_router.get("/admin/stats")
async def get_admin_stats():
    global order_counter
    total_orders = await db.orders.count_documents({})
    return {
        "total_orders": total_orders,
        "session_orders": order_counter
    }

@api_router.post("/admin/reset-counter")
async def reset_order_counter():
    global order_counter
    order_counter = 0
    return {"message": "Order counter reset", "new_count": order_counter}

@api_router.get("/admin/ticker")
async def get_ticker_settings():
    global ticker_settings
    return ticker_settings

@api_router.post("/admin/ticker")
async def update_ticker_settings(settings: dict):
    global ticker_settings
    ticker_settings.update(settings)
    
    # Broadcast ticker update to all clients
    broadcast_data = {
        "type": "ticker_update",
        "data": ticker_settings
    }
    await manager.broadcast(json.dumps(broadcast_data, default=str))
    
    return ticker_settings

# Zoom Integration Endpoints
@api_router.post("/zoom/generate-token")
async def generate_zoom_token(request: ZoomTokenRequest):
    """
    Generate Zoom Video SDK authentication token
    """
    try:
        if not request.topic.strip():
            raise HTTPException(status_code=400, detail="Topic name cannot be empty")
            
        token = generate_zoom_jwt(
            topic=request.topic,
            role=request.role,
            expires_in_hours=2
        )
        
        expires_at = datetime.now(timezone.utc) + timedelta(hours=2)
        
        return {
            "token": token,
            "expires_at": expires_at.isoformat(),
            "topic": request.topic,
            "role": request.role
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Zoom token generation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.post("/zoom/create-session")
async def create_zoom_session(request: ZoomSessionRequest):
    """
    Create new Zoom live shopping session
    """
    try:
        session_id = f"live_shopping_{int(time.time())}"
        
        # Generate host token for session creator
        host_token = generate_zoom_jwt(
            topic=session_id,
            role=1,  # Host role
            expires_in_hours=4
        )
        
        # Generate viewer token template
        viewer_token = generate_zoom_jwt(
            topic=session_id,
            role=0,  # Participant role
            expires_in_hours=4
        )
        
        session_data = {
            "session_id": session_id,
            "topic": request.topic,
            "host_token": host_token,
            "viewer_token": viewer_token,
            "duration": request.duration,
            "password": request.password,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "created",
            "zoom_topic": session_id  # This is the actual Zoom session topic
        }
        
        # Store session data in database
        await db.zoom_sessions.insert_one(session_data.copy())
        
        return session_data
        
    except Exception as e:
        logging.error(f"Zoom session creation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create Zoom session")

@api_router.get("/zoom/validate-token")
async def validate_zoom_token(token: str):
    """
    Validate Zoom JWT token for debugging
    """
    try:
        payload = jwt.decode(token, ZOOM_SDK_SECRET, algorithms=['HS256'], audience='zoom')
        return {
            "valid": True,
            "payload": payload,
            "expires": datetime.fromtimestamp(payload['exp']).isoformat()
        }
    except jwt.ExpiredSignatureError:
        return {"valid": False, "error": "Token has expired"}
    except jwt.InvalidTokenError:
        return {"valid": False, "error": "Invalid token"}

@api_router.get("/stream/status")
async def get_stream_status():
    return {
        "is_live": True,
        "viewer_count": manager.viewer_count,
        "stream_title": "Live Shopping Demo with Zoom",
        "stream_description": ticker_settings["text"]
    }

@api_router.post("/chat", response_model=ChatMessage)
async def send_chat_message(message: ChatMessageCreate):
    chat_msg = ChatMessage(**message.dict())
    
    # Store in database
    await db.chat_messages.insert_one(chat_msg.dict())
    
    # Broadcast to all connected clients
    broadcast_data = {
        "type": "chat_message",
        "data": chat_msg.dict()
    }
    await manager.broadcast(json.dumps(broadcast_data, default=str))
    
    return chat_msg

@api_router.get("/chat", response_model=List[ChatMessage])
async def get_chat_messages(limit: int = 50):
    messages = await db.chat_messages.find().sort("timestamp", -1).limit(limit).to_list(limit)
    return [ChatMessage(**msg) for msg in reversed(messages)]

@api_router.get("/products", response_model=List[Product])
async def get_products():
    # Sample products for demo
    products = [
        {
            "id": "1",
            "name": "Young Fashion Shirt",
            "price": 12.90,
            "sizes": ["OneSize", "AA60", "AA65", "AA70", "AA75", "Oversize"],
            "image_url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
            "description": "Trendy fashion shirt for young adults"
        },
        {
            "id": "2", 
            "name": "Plus Size Blouse",
            "price": 15.90,
            "sizes": ["L", "XL", "XXL", "XXXL"],
            "image_url": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400",
            "description": "Comfortable plus size blouse"
        }
    ]
    return products

@api_router.post("/orders", response_model=Order)
async def create_order(order: OrderCreate):
    global order_counter
    
    # Get product details
    products = await get_products()
    product = next((p for p in products if p['id'] == order.product_id), None)
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Use custom price if provided, otherwise use product price
    unit_price = order.price if order.price is not None else product['price']
    
    order_obj = Order(
        customer_id=order.customer_id,
        product_id=order.product_id,
        size=order.size,
        quantity=order.quantity,
        price=unit_price * order.quantity
    )
    
    # Store in database
    await db.orders.insert_one(order_obj.dict())
    
    # Increment counter
    order_counter += 1
    
    # Broadcast order to chat in the requested German format with bold "Bestellung"
    order_id = order.customer_id[-4:] if len(order.customer_id) >= 4 else order.customer_id
    # Format price in German style (comma instead of decimal point)
    formatted_price = f"{order_obj.price:.2f}".replace(".", ",")
    chat_message = f"**Bestellung** {order_id} I {order.quantity}x I {formatted_price} I {order.size}"
    
    broadcast_data = {
        "type": "order_notification",
        "data": {
            "message": chat_message,
            "customer_id": order.customer_id,
            "product_name": product['name'],
            "size": order.size,
            "quantity": order.quantity,
            "price": order_obj.price,
            "unit_price": unit_price
        }
    }
    await manager.broadcast(json.dumps(broadcast_data, default=str))
    
    # Broadcast updated counter to admins
    counter_data = {
        "type": "order_counter_update",
        "data": {
            "session_orders": order_counter,
            "total_orders": await db.orders.count_documents({})
        }
    }
    await manager.broadcast(json.dumps(counter_data, default=str))
    
    # CRITICAL: Automatisches Etiketten-Drucken bei Bestellerstellung
    try:
        # Extrahiere Kundennummer aus customer_id
        customer_number = order.customer_id[-4:] if len(order.customer_id) >= 4 else order.customer_id
        
        # Erstelle Etiketten-Daten im gewünschten Format (aus dem Bild)
        label_data = {
            "id": order_obj.id,
            "customer_number": customer_number,
            "price": f"€{order_obj.price:.2f}".replace(".", ","),  # Deutsche Formatierung
            "quantity": order.quantity,
            "size": order.size,
            "product_name": product['name']
        }
        
        # Drucke Etikett automatisch über Zebra GK420d
        print_result = zebra_printer.print_order_label(label_data)
        
        if print_result["success"]:
            logging.info(f"✅ Etikett erfolgreich gedruckt für Bestellung {order_obj.id}, Kunde {customer_number}")
        else:
            logging.warning(f"⚠️  Etikett-Druck fehlgeschlagen für Bestellung {order_obj.id}: {print_result.get('message', 'Unknown error')}")
        
        # Log print status for admin feedback (don't modify order object)
        if print_result["success"]:
            logging.info(f"✅ Label print successful for order {order_obj.id}")
        else:
            logging.warning(f"⚠️  Label print failed for order {order_obj.id}: {print_result.get('message', 'Unknown error')}")
        
    except Exception as print_error:
        logging.error(f"❌ Etiketten-Druck Fehler für Bestellung {order_obj.id}: {str(print_error)}")
        # Bestellung bleibt gültig, auch wenn Druck fehlschlägt
    
    return order_obj

@api_router.get("/orders", response_model=List[Order])
async def get_orders():
    orders = await db.orders.find().sort("timestamp", -1).to_list(100)
    return [Order(**order) for order in orders]

# Customer Management Endpoints
@api_router.post("/customers/register")
async def register_customer(customer: CustomerCreate):
    """Register a new customer with pending status"""
    try:
        # Check if customer number already exists
        existing = await db.customers.find_one({"customer_number": customer.customer_number})
        if existing:
            raise HTTPException(status_code=400, detail="Customer number already registered")
        
        # Check if email already exists
        existing_email = await db.customers.find_one({"email": customer.email})
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create new customer with pending status
        customer_obj = Customer(
            customer_number=customer.customer_number,
            email=customer.email,
            name=customer.name,
            preferred_language=customer.preferred_language or "de",
            activation_status="pending"
        )
        
        # Store in database
        await db.customers.insert_one(customer_obj.dict())
        
        # Return clean serializable customer data
        created_customer = {
            "id": customer_obj.id,
            "customer_number": customer_obj.customer_number,
            "email": customer_obj.email,
            "name": customer_obj.name,
            "profile_image": customer_obj.profile_image,
            "preferred_language": customer_obj.preferred_language,
            "activation_status": customer_obj.activation_status,
            "created_at": customer_obj.created_at.isoformat() if hasattr(customer_obj.created_at, 'isoformat') else str(customer_obj.created_at),
            "updated_at": customer_obj.updated_at.isoformat() if hasattr(customer_obj.updated_at, 'isoformat') else str(customer_obj.updated_at)
        }
        
        return created_customer
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Customer registration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Registration failed")

@api_router.get("/customers/check/{customer_number}")
async def check_customer_status(customer_number: str):
    """Check customer registration and activation status"""
    try:
        customer = await db.customers.find_one({"customer_number": customer_number})
        if not customer:
            return {
                "exists": False,
                "activation_status": None,
                "message": "Customer not registered"
            }
        
        return {
            "exists": True,
            "customer_number": customer["customer_number"],
            "activation_status": customer["activation_status"],
            "name": customer["name"],
            "email": customer["email"],
            "profile_image": customer.get("profile_image", None),
            "preferred_language": customer.get("preferred_language", "de"),
            "message": f"Customer status: {customer['activation_status']}"
        }
        
    except Exception as e:
        logging.error(f"Customer status check error: {str(e)}")
        raise HTTPException(status_code=500, detail="Status check failed")

# Admin Customer Management Endpoints
@api_router.post("/admin/customers/create")
async def create_customer_by_admin(customer: CustomerCreate):
    """Manually create a new customer by admin with active status"""
    try:
        # Check if customer number already exists
        existing = await db.customers.find_one({"customer_number": customer.customer_number})
        if existing:
            raise HTTPException(status_code=400, detail="Customer number already exists")
        
        # Check if email already exists
        existing_email = await db.customers.find_one({"email": customer.email})
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create new customer with active status (admin created)
        customer_obj = Customer(
            customer_number=customer.customer_number,
            email=customer.email,
            name=customer.name,
            preferred_language=customer.preferred_language or "de",
            activation_status="active"  # Admin-created customers are automatically active
        )
        
        # Store in database
        await db.customers.insert_one(customer_obj.dict())
        
        # Return clean serializable customer data
        created_customer = {
            "id": customer_obj.id,
            "customer_number": customer_obj.customer_number,
            "email": customer_obj.email,
            "name": customer_obj.name,
            "profile_image": customer_obj.profile_image,
            "preferred_language": customer_obj.preferred_language,
            "activation_status": customer_obj.activation_status,
            "created_at": customer_obj.created_at.isoformat() if hasattr(customer_obj.created_at, 'isoformat') else str(customer_obj.created_at),
            "updated_at": customer_obj.updated_at.isoformat() if hasattr(customer_obj.updated_at, 'isoformat') else str(customer_obj.updated_at)
        }
        
        return created_customer
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Admin customer creation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Customer creation failed")

@api_router.get("/admin/customers", response_model=List[Customer])
async def get_all_customers():
    """Get all customers for admin management"""
    try:
        customers = await db.customers.find().sort("created_at", -1).to_list(1000)
        return [Customer(**customer) for customer in customers]
    except Exception as e:
        logging.error(f"Error fetching customers: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch customers")

@api_router.post("/admin/customers/{customer_id}/activate")
async def activate_customer(customer_id: str):
    """Activate a customer (admin only)"""
    try:
        result = await db.customers.update_one(
            {"id": customer_id},
            {"$set": {
                "activation_status": "active",
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Get updated customer
        customer = await db.customers.find_one({"id": customer_id})
        return {"message": "Customer activated successfully", "customer": Customer(**customer)}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Customer activation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Activation failed")

@api_router.post("/admin/customers/{customer_id}/block")
async def block_customer(customer_id: str):
    """Block a customer (admin only)"""
    try:
        result = await db.customers.update_one(
            {"id": customer_id},
            {"$set": {
                "activation_status": "blocked",
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Get updated customer
        customer = await db.customers.find_one({"id": customer_id})
        return {"message": "Customer blocked successfully", "customer": Customer(**customer)}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Customer blocking error: {str(e)}")
        raise HTTPException(status_code=500, detail="Blocking failed")

@api_router.delete("/admin/customers/{customer_id}")
async def delete_customer(customer_id: str):
    """Delete a customer (admin only)"""
    try:
        result = await db.customers.delete_one({"id": customer_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        return {"message": "Customer deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Customer deletion error: {str(e)}")
        raise HTTPException(status_code=500, detail="Deletion failed")

@api_router.post("/customers/{customer_number}/upload-profile-image")
async def upload_profile_image_by_number(customer_number: str, file: UploadFile = File(...)):
    """Upload profile image for a customer using customer number"""
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Validate file size (max 5MB)
        file_content = await file.read()
        if len(file_content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size too large (max 5MB)")
        
        # Convert to base64 for storage
        base64_image = base64.b64encode(file_content).decode('utf-8')
        image_data_url = f"data:{file.content_type};base64,{base64_image}"
        
        # Update customer record by customer number
        result = await db.customers.update_one(
            {"customer_number": customer_number},
            {"$set": {
                "profile_image": image_data_url,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        return {"message": "Profile image uploaded successfully", "profile_image": image_data_url}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Profile image upload error: {str(e)}")
        raise HTTPException(status_code=500, detail="Upload failed")

@api_router.get("/customers/{customer_number}/last-order")
async def get_customer_last_order(customer_number: str):
    """Get the last order for a specific customer"""
    try:
        # Find the most recent order for this customer
        last_order = await db.orders.find_one(
            {"customer_id": customer_number},
            sort=[("timestamp", -1)]  # Sort by timestamp descending (most recent first)
        )
        
        if not last_order:
            return {
                "has_order": False,
                "message": "No orders found for this customer"
            }
        
        # Get product details for the order
        products = await get_products()
        product = next((p for p in products if p['id'] == last_order.get('product_id')), None)
        product_name = product['name'] if product else "Unknown Product"
        
        return {
            "has_order": True,
            "order": {
                "id": last_order["id"],
                "product_id": last_order["product_id"],
                "product_name": product_name,
                "size": last_order["size"],
                "quantity": last_order["quantity"],
                "price": last_order["price"],
                "timestamp": last_order["timestamp"],
                "formatted_time": (last_order["timestamp"].replace(tzinfo=timezone.utc) + timedelta(hours=2)).strftime("%d.%m.%Y %H:%M:%S")
            }
        }
        
    except Exception as e:
        logging.error(f"Error getting customer last order: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get customer last order")

@api_router.delete("/customers/{customer_number}/profile-image")
async def delete_profile_image_by_number(customer_number: str):
    """Delete profile image for a customer using customer number"""
    try:
        result = await db.customers.update_one(
            {"customer_number": customer_number},
            {"$set": {
                "profile_image": None,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        return {"message": "Profile image deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Profile image deletion error: {str(e)}")
        raise HTTPException(status_code=500, detail="Profile image deletion failed")

class LanguageUpdateRequest(BaseModel):
    language: str  # de, en, tr, fr

@api_router.put("/customers/{customer_number}/language")
async def update_customer_language(customer_number: str, request: LanguageUpdateRequest):
    """Update customer's preferred language"""
    try:
        # Validate language
        valid_languages = ["de", "en", "tr", "fr"]
        if request.language not in valid_languages:
            raise HTTPException(status_code=400, detail=f"Language must be one of: {', '.join(valid_languages)}")
        
        result = await db.customers.update_one(
            {"customer_number": customer_number},
            {"$set": {
                "preferred_language": request.language,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        return {"message": "Language preference updated successfully", "language": request.language}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Language update error: {str(e)}")
        raise HTTPException(status_code=500, detail="Language update failed")

# Live Shopping Calendar Endpoints
@api_router.get("/events")
async def get_events():
    """Get all live shopping events"""
    try:
        events = []
        async for event in db.events.find():
            events.append({
                "id": event["id"],
                "date": event["date"],
                "time": event["time"],
                "title": event["title"],
                "description": event.get("description", ""),
                "created_at": event["created_at"],
                "updated_at": event["updated_at"]
            })
        
        # Sort events by date and time
        events.sort(key=lambda x: f"{x['date']} {x['time']}")
        return events
        
    except Exception as e:
        logging.error(f"Error getting events: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get events")

@api_router.post("/admin/events")
async def create_event(event: LiveShoppingEventCreate):
    """Create a new live shopping event (Admin only)"""
    try:
        new_event = LiveShoppingEvent(
            date=event.date,
            time=event.time,
            title=event.title,
            description=event.description
        )
        
        event_dict = new_event.dict()
        result = await db.events.insert_one(event_dict)
        
        # Convert ObjectId to string and return clean event data
        created_event = {
            "id": event_dict["id"],
            "date": event_dict["date"],
            "time": event_dict["time"],
            "title": event_dict["title"],
            "description": event_dict["description"],
            "created_at": event_dict["created_at"].isoformat() if hasattr(event_dict["created_at"], 'isoformat') else str(event_dict["created_at"]),
            "updated_at": event_dict["updated_at"].isoformat() if hasattr(event_dict["updated_at"], 'isoformat') else str(event_dict["updated_at"])
        }
        
        return {"message": "Event created successfully", "event": created_event}
        
    except Exception as e:
        logging.error(f"Error creating event: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create event")

@api_router.get("/admin/events")
async def get_admin_events():
    """Get all events for admin management"""
    try:
        events = []
        async for event in db.events.find():
            events.append({
                "id": event["id"],
                "date": event["date"],
                "time": event["time"],
                "title": event["title"],
                "description": event.get("description", ""),
                "created_at": event["created_at"],
                "updated_at": event["updated_at"]
            })
        
        # Sort events by date and time
        events.sort(key=lambda x: f"{x['date']} {x['time']}")
        return events
        
    except Exception as e:
        logging.error(f"Error getting admin events: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get admin events")

@api_router.put("/admin/events/{event_id}")
async def update_event(event_id: str, event_update: LiveShoppingEventUpdate):
    """Update a live shopping event (Admin only)"""
    try:
        update_data = {k: v for k, v in event_update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        result = await db.events.update_one(
            {"id": event_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Event not found")
        
        return {"message": "Event updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating event: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update event")

@api_router.delete("/admin/events/{event_id}")
async def delete_event(event_id: str):
    """Delete a live shopping event (Admin only)"""
    try:
        result = await db.events.delete_one({"id": event_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Event not found")
        
        return {"message": "Event deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting event: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete event")

# LiveKit Cloud Integration Endpoints
@api_router.post("/livekit/token", response_model=LiveKitTokenResponse)
async def generate_livekit_token(request: LiveKitTokenRequest, current_user_id: str = "user"):
    """
    Generate LiveKit access token for authenticated user
    Supports both publisher (admin) and viewer (customer) roles
    """
    try:
        # Generate unique participant identity
        participant_identity = f"{current_user_id}_{int(time.time())}"
        participant_name = request.participant_name or current_user_id
        
        # Generate appropriate token based on participant type
        if request.participant_type == "publisher":
            # Admin/publisher token with full permissions
            token = await livekit_service.create_publisher_token(
                room_name=request.room_name,
                participant_identity=participant_identity,
                participant_name=participant_name,
                metadata=request.metadata or {"role": "publisher", "user_id": current_user_id}
            )
        else:
            # Customer/viewer token with view-only permissions
            token = await livekit_service.create_viewer_token(
                room_name=request.room_name,
                participant_identity=participant_identity,
                participant_name=participant_name,
                metadata=request.metadata or {"role": "viewer", "user_id": current_user_id}
            )
        
        return LiveKitTokenResponse(
            token=token,
            room_name=request.room_name,
            participant_identity=participant_identity,
            participant_type=request.participant_type,
            livekit_url=livekit_service.livekit_url
        )
        
    except Exception as e:
        logging.error(f"LiveKit token generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate LiveKit token: {str(e)}")

@api_router.post("/livekit/room/create", response_model=LiveKitRoomResponse)
async def create_livekit_room(request: LiveKitRoomRequest, current_user_id: str = "admin"):
    """
    Create a new LiveKit room for streaming (Admin only)
    """
    try:
        # TODO: Add proper admin authentication check
        
        # Check if room already exists
        existing_room = await livekit_service.get_room_info(request.room_name)
        if existing_room:
            return LiveKitRoomResponse(
                room_name=existing_room["name"],
                sid=existing_room["sid"],
                max_participants=existing_room["max_participants"],
                num_participants=existing_room["num_participants"],
                creation_time=existing_room["creation_time"],
                status="existing"
            )
        
        # Create new room
        room_info = await livekit_service.create_room(
            room_name=request.room_name,
            max_participants=request.max_participants,
            empty_timeout=request.empty_timeout,
            metadata=request.metadata or {"created_by": current_user_id}
        )
        
        return LiveKitRoomResponse(
            room_name=room_info["name"],
            sid=room_info["sid"],
            max_participants=room_info["max_participants"],
            num_participants=room_info["num_participants"],
            creation_time=room_info["creation_time"]
        )
        
    except Exception as e:
        logging.error(f"LiveKit room creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create LiveKit room: {str(e)}")

@api_router.get("/livekit/rooms")
async def list_livekit_rooms():
    """
    List all active LiveKit rooms
    """
    try:
        rooms = await livekit_service.list_active_rooms()
        
        # Format rooms for frontend
        formatted_rooms = []
        for room in rooms:
            formatted_rooms.append({
                "room_name": room["name"],
                "sid": room["sid"],
                "num_participants": room["num_participants"],
                "max_participants": room["max_participants"],
                "creation_time": room["creation_time"],
                "is_live": room["num_participants"] > 0,
                "metadata": room.get("metadata", "")
            })
        
        return {"rooms": formatted_rooms}
        
    except Exception as e:
        logging.error(f"Error listing LiveKit rooms: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list rooms: {str(e)}")

@api_router.get("/livekit/room/{room_name}")
async def get_livekit_room_info(room_name: str):
    """
    Get detailed information about a specific LiveKit room
    """
    try:
        room_info = await livekit_service.get_room_info(room_name)
        if not room_info:
            raise HTTPException(status_code=404, detail="Room not found")
        
        # Get participants
        participants = await livekit_service.get_participants(room_name)
        
        return {
            "room": room_info,
            "participants": participants,
            "is_live": room_info["num_participants"] > 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting room info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get room info: {str(e)}")

@api_router.delete("/livekit/room/{room_name}")
async def end_livekit_room(room_name: str, current_user_id: str = "admin"):
    """
    End/delete a LiveKit room (Admin only)
    """
    try:
        # TODO: Add proper admin authentication check
        
        success = await livekit_service.end_room(room_name)
        if not success:
            raise HTTPException(status_code=404, detail="Room not found or could not be ended")
        
        return {"message": f"Room {room_name} ended successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error ending room: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to end room: {str(e)}")

@api_router.get("/livekit/config")
async def get_livekit_config():
    """Get LiveKit configuration for frontend"""
    try:
        config = await livekit_service.get_livekit_config()
        return {"success": True, "config": config}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get config: {str(e)}")

# CRITICAL: Zebra Printer API Endpoints for Label Printing
@api_router.post("/zebra/print-label")
async def print_label(order_data: dict):
    """
    Druckt Etikett für Bestellung über Zebra GK420d Drucker
    """
    try:
        result = zebra_printer.print_order_label(order_data)
        return {"success": result["success"], "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Label printing failed: {str(e)}")

@api_router.get("/zebra/preview/{customer_number}")
async def get_label_preview(customer_number: str, price: str = "0.00"):
    """
    Generiert Etikett-Vorschau als ZPL-Code für Admin-Ansicht
    """
    try:
        from datetime import datetime
        zpl_code = zebra_printer.generate_zpl_label(customer_number, price, datetime.now())
        
        return {
            "success": True,
            "zpl_code": zpl_code,
            "customer_number": customer_number,
            "price": price,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview generation failed: {str(e)}")

@api_router.get("/zebra/status")
async def get_printer_status():
    """
    Überprüft Status des Zebra-Druckers
    """
    try:
        status = zebra_printer.get_printer_status()
        return {"success": True, "printer_status": status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

@api_router.post("/zebra/test-print")
async def test_print():
    """
    Druckt Test-Etikett zum Testen der Zebra-Drucker-Verbindung
    """
    try:
        test_data = {
            "customer_number": "TEST123",
            "price": "€19,99",
            "id": "test-label"
        }
        result = zebra_printer.print_order_label(test_data)
        return {"success": result["success"], "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test print failed: {str(e)}")

@api_router.get("/zebra/download/{customer_number}")
async def download_zpl_label(customer_number: str, price: str = "0.00"):
    """
    Generiert und downloadet ZPL-Datei für manuellen Druck
    """
    try:
        from datetime import datetime
        from fastapi.responses import Response
        
        zpl_code = zebra_printer.generate_zpl_label(customer_number, price, datetime.now())
        
        # Return ZPL file as download
        return Response(
            content=zpl_code,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename=label_{customer_number}_{int(datetime.now().timestamp())}.zpl"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

@api_router.get("/zebra/pdf-preview/{customer_number}")
async def get_pdf_preview(customer_number: str, price: str = "0.00"):
    """
    CRITICAL: Generiert PDF-Vorschau des Etiketts für Admin-Ansicht
    """
    try:
        from datetime import datetime
        from fastapi.responses import StreamingResponse
        
        # Generate PDF preview
        pdf_buffer = zebra_printer.generate_label_pdf(customer_number, price, datetime.now())
        
        # Return PDF as streaming response
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename=label_preview_{customer_number}.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF preview failed: {str(e)}")

@api_router.get("/zebra/image-preview/{customer_number}")
async def get_image_preview(customer_number: str, price: str = "0.00"):
    """
    Generiert Bild-Vorschau des Etiketts als PNG
    """
    try:
        from datetime import datetime
        from fastapi.responses import Response
        from PIL import Image, ImageDraw, ImageFont
        import io
        
        # Generate image preview (40x25mm at 300 DPI = 472x295 pixels)
        width, height = 472, 295
        img = Image.new('RGB', (width, height), 'white')
        draw = ImageDraw.Draw(img)
        
        # Add border
        draw.rectangle([2, 2, width-2, height-2], outline='black', width=2)
        
        # Format timestamp
        formatted_time = datetime.now().strftime("%d.%m.%y %H:%M:%S")
        
        try:
            # Try to use a system font
            font_small = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 18)
            font_large = ImageFont.truetype("/System/Library/Fonts/Arial Bold.ttf", 60)
            font_medium = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 24)
        except:
            # Fallback to default font
            font_small = ImageFont.load_default()
            font_large = ImageFont.load_default()
            font_medium = ImageFont.load_default()
        
        # Draw timestamp (top)
        draw.text((10, 10), formatted_time, fill='black', font=font_small)
        
        # Draw customer number (center, large)
        customer_main = customer_number[-3:] if len(customer_number) >= 3 else customer_number
        bbox = draw.textbbox((0, 0), customer_main, font=font_large)
        text_width = bbox[2] - bbox[0]
        text_x = (width - text_width) // 2
        draw.text((text_x, height//2 - 30), customer_main, fill='black', font=font_large)
        
        # Draw prefix (bottom left)
        customer_prefix = customer_number[:-3] if len(customer_number) > 3 else ""
        if customer_prefix:
            draw.text((10, height - 35), customer_prefix, fill='black', font=font_medium)
        
        # Draw price (bottom right)
        price_display = price.replace("€", "").replace(",", "").replace(".", "")
        bbox = draw.textbbox((0, 0), price_display, font=font_medium)
        price_width = bbox[2] - bbox[0]
        draw.text((width - price_width - 10, height - 35), price_display, fill='black', font=font_medium)
        
        # Convert to PNG
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='PNG', dpi=(300, 300))
        img_buffer.seek(0)
        
        return Response(
            content=img_buffer.getvalue(),
            media_type="image/png",
            headers={
                "Content-Disposition": f"inline; filename=label_preview_{customer_number}.png"
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image preview failed: {str(e)}")

@api_router.get("/zebra/html-preview/{customer_number}")
async def get_html_preview(customer_number: str, price: str = "0.00"):
    """
    PRAKTISCHE LÖSUNG: Generiert druckfreundliche HTML-Vorschau des Etiketts
    Kann direkt aus dem Browser gedruckt werden (wie Microsoft Word)
    """
    try:
        from datetime import datetime
        from fastapi.responses import HTMLResponse
        
        # Format timestamp
        formatted_time = datetime.now().strftime("%d.%m.%y %H:%M:%S")
        
        # Process customer number like ZPL (split for layout)
        customer_main = customer_number[-3:] if len(customer_number) >= 3 else customer_number
        customer_prefix = customer_number[:-3] if len(customer_number) > 3 else ""
        
        # Process price
        price_display = price.replace("€", "").replace(",", "").replace(".", "")
        
        # Create HTML that mimics a 40x25mm label
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Zebra Label - Kunde {customer_number}</title>
            <style>
                @page {{
                    size: 40mm 25mm;
                    margin: 2mm;
                }}
                
                @media print {{
                    body {{ margin: 0; padding: 0; }}
                    .no-print {{ display: none; }}
                }}
                
                body {{
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 5px;
                    width: 36mm;
                    height: 21mm;
                    border: 1px solid #000;
                    position: relative;
                    background: white;
                }}
                
                .timestamp {{
                    font-size: 6pt;
                    position: absolute;
                    top: 2mm;
                    left: 2mm;
                }}
                
                .customer-main {{
                    font-size: 18pt;
                    font-weight: bold;
                    position: absolute;
                    top: 8mm;
                    left: 50%;
                    transform: translateX(-50%);
                    text-align: center;
                }}
                
                .customer-prefix {{
                    font-size: 8pt;
                    position: absolute;
                    bottom: 2mm;
                    left: 2mm;
                }}
                
                .price {{
                    font-size: 8pt;
                    position: absolute;
                    bottom: 2mm;
                    right: 2mm;
                }}
                
                .instructions {{
                    margin-top: 30mm;
                    padding: 10px;
                    background: #f0f0f0;
                    border: 1px solid #ccc;
                }}
                
                .print-button {{
                    background: #4CAF50;
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 16px;
                    margin: 10px 0;
                }}
            </style>
        </head>
        <body>
            <!-- Das eigentliche 40x25mm Etikett -->
            <div class="label">
                <div class="timestamp">{formatted_time}</div>
                <div class="customer-main">{customer_main}</div>
                {f'<div class="customer-prefix">{customer_prefix}</div>' if customer_prefix else ''}
                <div class="price">{price_display}</div>
            </div>
            
            <!-- Anweisungen (werden nicht gedruckt) -->
            <div class="instructions no-print">
                <h3>🖨️ DRUCKEN WIE IN MICROSOFT WORD:</h3>
                <button class="print-button" onclick="window.print()">📄 ETIKETT DRUCKEN</button>
                <p><strong>Schritte:</strong></p>
                <ol>
                    <li>Klicken Sie auf "ETIKETT DRUCKEN" oder drücken Sie <kbd>Ctrl+P</kbd></li>
                    <li>Wählen Sie Ihren Zebra-Drucker aus</li>
                    <li>Stellen Sie Papierformat auf "Benutzerdefiniert: 40mm x 25mm" ein</li>
                    <li>Drucken Sie wie ein normales Dokument</li>
                </ol>
                <p><strong>Kunde:</strong> {customer_number} | <strong>Preis:</strong> {price} | <strong>Zeit:</strong> {formatted_time}</p>
            </div>
        </body>
        </html>
        """
        
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"HTML preview failed: {str(e)}")

@api_router.get("/zebra/download-latest-zpl")
async def download_latest_zpl():
    """
    EINFACHE LÖSUNG: Lädt die neueste ZPL-Datei herunter
    Nach jeder Bestellung können Sie diese Datei herunterladen und drucken
    """
    try:
        import glob
        import os
        from fastapi.responses import FileResponse
        
        # Finde neueste ZPL-Datei
        zpl_files = glob.glob("/tmp/zebra_auto_*.zpl")
        
        if not zpl_files:
            raise HTTPException(status_code=404, detail="Keine ZPL-Dateien gefunden")
        
        # Neueste Datei nach Erstellungszeit
        latest_file = max(zpl_files, key=os.path.getctime)
        
        return FileResponse(
            latest_file, 
            media_type="text/plain",
            filename=f"zebra_label_{int(time.time())}.zpl",
            headers={
                "Content-Disposition": "attachment; filename=zebra_label.zpl"
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

@api_router.get("/zebra/latest-zpl-content")
async def get_latest_zpl_content():
    """
    Zeigt den Inhalt der neuesten ZPL-Datei zur direkten Kopie
    """
    try:
        import glob
        import os
        
        # Finde neueste ZPL-Datei
        zpl_files = glob.glob("/tmp/zebra_auto_*.zpl")
        
        if not zpl_files:
            return {"success": False, "message": "Keine ZPL-Dateien gefunden"}
        
        # Neueste Datei nach Erstellungszeit
        latest_file = max(zpl_files, key=os.path.getctime)
        
        with open(latest_file, 'r') as f:
            zpl_content = f.read()
            
        # Erstelle auch Mac-Druckbefehle
        mac_commands = [
            f"# DIREKTE DRUCKBEFEHLE FÜR MAC TERMINAL:",
            f"",
            f"# 1. ZPL-Datei erstellen:",
            f"cat > ~/Desktop/zebra_print.zpl << 'EOF'",
            zpl_content,
            f"EOF",
            f"",
            f"# 2. Drucken (verschiedene Druckernamen versuchen):",
            f'lpr -P "ZTC GK420d" -o raw ~/Desktop/zebra_print.zpl',
            f'lpr -P "Zebra Technologies ZTC GK420d" -o raw ~/Desktop/zebra_print.zpl',
            f'lpr -P "ZTC_GK420d" -o raw ~/Desktop/zebra_print.zpl',
            f"",
            f"# 3. Verfügbare Drucker anzeigen:",
            f"lpstat -p"
        ]
        
        return {
            "success": True,
            "zpl_file": latest_file,
            "zpl_content": zpl_content,
            "mac_commands": mac_commands,
            "message": "✅ Neueste ZPL-Datei gefunden - bereit zum Drucken"
        }
        
    except Exception as e:
        return {"success": False, "message": f"Fehler: {str(e)}"}

@api_router.post("/livekit/room/{room_name}/participant/{participant_identity}/remove")
async def remove_participant_from_room(
    room_name: str, 
    participant_identity: str, 
    current_user_id: str = "admin"
):
    """
    Remove a participant from a LiveKit room (Admin only)
    """
    try:
        # TODO: Add proper admin authentication check
        
        success = await livekit_service.remove_participant(room_name, participant_identity)
        if not success:
            raise HTTPException(status_code=404, detail="Participant not found or could not be removed")
        
        return {"message": f"Participant {participant_identity} removed from room {room_name}"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error removing participant: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to remove participant: {str(e)}")

# End of endpoints

# WebRTC Streaming Endpoints
@api_router.post("/stream/start")
async def start_streaming(stream_data: StreamSessionCreate, current_user_id: str = "admin"):
    """Start a new WebRTC streaming session (admin only)"""
    try:
        # TODO: Add proper authentication check for admin role
        
        stream = await stream_manager.create_stream(current_user_id, stream_data)
        
        return {
            "stream_id": stream.id,
            "stream_title": stream.stream_title,
            "status": stream.status,
            "max_viewers": stream.max_viewers,
            "created_at": stream.created_at,
            "signaling_endpoint": f"/ws/stream/{stream.id}/signaling"
        }
        
    except Exception as e:
        logging.error(f"Error starting stream: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to start streaming session")

@api_router.get("/stream/{stream_id}/join")
async def join_streaming_session(stream_id: str, current_user_id: str = "viewer"):
    """Join an existing streaming session as viewer"""
    try:
        if stream_id not in stream_manager.active_streams:
            raise HTTPException(status_code=404, detail="Stream not found")
            
        stream = stream_manager.active_streams[stream_id]
        
        if len(stream_manager.stream_connections.get(stream_id, [])) >= stream.max_viewers:
            raise HTTPException(status_code=400, detail="Stream is at maximum capacity")
        
        return {
            "stream_id": stream_id,
            "stream_title": stream.stream_title,
            "viewer_count": stream.viewer_count,
            "max_viewers": stream.max_viewers,
            "signaling_endpoint": f"/ws/stream/{stream_id}/viewer",
            "status": "ready_to_join"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error joining stream: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to join streaming session")

@api_router.delete("/stream/{stream_id}")
async def end_streaming_session(stream_id: str, current_user_id: str = "admin"):
    """End streaming session (admin/streamer only)"""
    try:
        success = await stream_manager.end_stream(stream_id, current_user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Stream not found or unauthorized")
        
        return {"message": "Streaming session ended successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error ending stream: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to end streaming session")

@api_router.get("/streams/active")
async def get_active_streams():
    """Get list of active streaming sessions"""
    try:
        active_streams = []
        
        for stream_id, stream in stream_manager.active_streams.items():
            active_streams.append({
                "stream_id": stream_id,
                "stream_title": stream.stream_title,
                "viewer_count": stream.viewer_count,
                "max_viewers": stream.max_viewers,
                "created_at": stream.created_at,
                "status": stream.status
            })
        
        return {"streams": active_streams}
        
    except Exception as e:
        logging.error(f"Error getting active streams: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get active streams")

@api_router.get("/webrtc/config")
async def get_webrtc_config():
    """Get WebRTC configuration including STUN/TURN servers"""
    return {
        "rtcConfiguration": {
            "iceServers": [
                {"urls": ["stun:stun.l.google.com:19302"]},
                {"urls": ["stun:stun1.l.google.com:3478"]},
                {"urls": ["stun:stun2.l.google.com:19302"]},
                {
                    "urls": [
                        "turn:openrelay.metered.ca:80",
                        "turn:openrelay.metered.ca:443",
                        "turn:openrelay.metered.ca:443?transport=tcp"
                    ],
                    "username": "openrelayproject",
                    "credential": "openrelayproject"
                }
            ],
            "iceCandidatePoolSize": 10,
            "iceTransportPolicy": "all"
        },
        "mediaConstraints": {
            "video": {
                "width": {"ideal": 1280},
                "height": {"ideal": 720},
                "frameRate": {"ideal": 30},
                "facingMode": "user"
            },
            "audio": {
                "echoCancellation": True,
                "noiseSuppression": True,
                "autoGainControl": True
            }
        }
    }

# WebRTC Signaling WebSocket Endpoints
@app.websocket("/ws/stream/{stream_id}/signaling")
async def webrtc_signaling_streamer(websocket: WebSocket, stream_id: str):
    """WebSocket for WebRTC signaling (streamer)"""
    await websocket.accept()
    
    # Register streamer connection
    if stream_id in stream_manager.active_streams:
        stream_manager.streamer_connections[stream_id] = websocket
    else:
        await websocket.close(code=1008, reason="Stream not found")
        return
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Broadcast signaling messages to all viewers
            await stream_manager.broadcast_to_stream(stream_id, {
                "type": "signaling",
                "from": "streamer",
                "data": message
            })
            
    except WebSocketDisconnect:
        # Clean up streamer connection
        if stream_id in stream_manager.streamer_connections:
            del stream_manager.streamer_connections[stream_id]
        
        # End the stream when streamer disconnects
        if stream_id in stream_manager.active_streams:
            await stream_manager.end_stream(stream_id, stream_manager.active_streams[stream_id].streamer_id)

@app.websocket("/ws/stream/{stream_id}/viewer")
async def webrtc_signaling_viewer(websocket: WebSocket, stream_id: str):
    """WebSocket for WebRTC signaling (viewer)"""
    await websocket.accept()
    
    # Join stream as viewer
    success = await stream_manager.join_stream(stream_id, websocket)
    if not success:
        await websocket.close(code=1008, reason="Cannot join stream")
        return
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Send signaling message to streamer
            if stream_id in stream_manager.streamer_connections:
                streamer_ws = stream_manager.streamer_connections[stream_id]
                if streamer_ws.client_state == WebSocketState.CONNECTED:
                    await streamer_ws.send_text(json.dumps({
                        "type": "signaling",
                        "from": "viewer",
                        "data": message
                    }))
            
    except WebSocketDisconnect:
        # Remove viewer from stream
        await stream_manager.leave_stream(stream_id, websocket)

# Customer Reminder Models
class CustomerReminder(BaseModel):
    customer_number: str
    event_id: str

# Customer Reminder Endpoints
@api_router.post("/customer/reminder")
async def set_customer_reminder(reminder: CustomerReminder):
    """Set a reminder for a customer for a specific event"""
    try:
        # Check if reminder already exists
        existing = await db.customer_reminders.find_one({
            "customer_number": reminder.customer_number,
            "event_id": reminder.event_id
        })
        
        if existing:
            return {"success": True, "message": "Reminder already set"}
        
        # Create new reminder
        reminder_doc = {
            "id": str(uuid.uuid4()),
            "customer_number": reminder.customer_number,
            "event_id": reminder.event_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "active": True
        }
        
        await db.customer_reminders.insert_one(reminder_doc)
        return {"success": True, "message": "Reminder set successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/customer/reminder/{customer_number}/{event_id}")
async def remove_customer_reminder(customer_number: str, event_id: str):
    """Remove a customer's reminder for a specific event"""
    try:
        result = await db.customer_reminders.delete_one({
            "customer_number": customer_number,
            "event_id": event_id
        })
        
        if result.deleted_count > 0:
            return {"success": True, "message": "Reminder removed successfully"}
        else:
            return {"success": False, "message": "Reminder not found"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/customer/reminders/{customer_number}")
async def get_customer_reminders(customer_number: str):
    """Get all active reminders for a customer"""
    try:
        reminders = await db.customer_reminders.find({
            "customer_number": customer_number,
            "active": True
        }).to_list(length=None)
        
        # Extract event IDs
        reminder_event_ids = [reminder["event_id"] for reminder in reminders]
        
        return {"success": True, "reminders": reminder_event_ids}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Background task to send notifications (simplified version)
@api_router.post("/admin/send-reminder-notifications")
async def send_reminder_notifications():
    """Check for upcoming events and send notifications to customers with reminders"""
    try:
        # Get all events happening in the next 30 minutes
        now = datetime.now(timezone.utc)
        thirty_minutes_later = now + timedelta(minutes=30)
        
        # Get events from database
        events = await db.events.find().to_list(length=None)
        upcoming_events = []
        
        for event in events:
            try:
                event_datetime = datetime.fromisoformat(event['date'] + 'T' + event['time'])
                if now <= event_datetime <= thirty_minutes_later:
                    upcoming_events.append(event)
            except:
                continue
        
        notifications_sent = 0
        
        # For each upcoming event, find customers with reminders
        for event in upcoming_events:
            reminders = await db.customer_reminders.find({
                "event_id": event["id"],
                "active": True
            }).to_list(length=None)
            
            for reminder in reminders:
                # Here you would implement the actual push notification
                # For now, we'll just log it
                logger.info(f"Sending notification to customer {reminder['customer_number']} for event {event['title']}")
                notifications_sent += 1
        
        return {
            "success": True,
            "message": f"Processed {len(upcoming_events)} upcoming events",
            "notifications_sent": notifications_sent
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming WebSocket messages if needed
            pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast_viewer_count()

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()