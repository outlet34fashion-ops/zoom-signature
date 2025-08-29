from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException, File, UploadFile
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

# Customer Management Models
class Customer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_number: str
    email: str
    name: str
    profile_image: Optional[str] = None  # URL to profile image
    activation_status: str = "pending"  # pending, active, blocked
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerCreate(BaseModel):
    customer_number: str
    email: str
    name: str
    profile_image: Optional[str] = None

class CustomerUpdate(BaseModel):
    activation_status: str  # active, blocked
    profile_image: Optional[str] = None

# In-memory counter and settings for demo
order_counter = 0
ticker_settings = {
    "text": "Nur für Händler | Ab 10 € - Heute 18:00 - Frische Ware | Young Fashion & Plus Size",
    "enabled": True
}

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
            "sizes": ["OneSize", "A460", "A465", "A470", "A475", "Oversize"],
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
                "formatted_time": last_order["timestamp"].strftime("%d.%m.%Y %H:%M:%S")
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

# End of endpoints

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