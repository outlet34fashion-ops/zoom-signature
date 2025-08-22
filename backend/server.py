from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.websockets import WebSocketState
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import uuid
from datetime import datetime, timezone
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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

# In-memory counter for demo (in production, use database)
order_counter = 0

# Routes
@api_router.get("/")
async def root():
    return {"message": "Live Shopping App API"}

@api_router.get("/admin/stats")
async def get_admin_stats():
    global order_counter
    total_orders = await db.orders.count_documents({})
    return {
        "total_orders": total_orders,
        "session_orders": order_counter,
        "active_viewers": manager.viewer_count
    }

@api_router.post("/admin/reset-counter")
async def reset_order_counter():
    global order_counter
    order_counter = 0
    return {"message": "Order counter reset", "new_count": order_counter}

@api_router.get("/stream/status")
async def get_stream_status():
    return {
        "is_live": True,
        "viewer_count": manager.viewer_count,
        "stream_title": "Live Shopping Demo",
        "stream_description": "Nur für Händler | Ab 10 € - Heute 18:00 - Frische Ware | Young Fashion & Plus Size"
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
    
    order_obj = Order(
        **order.dict(),
        price=product['price'] * order.quantity
    )
    
    # Store in database
    await db.orders.insert_one(order_obj.dict())
    
    # Increment counter
    order_counter += 1
    
    # Broadcast order to chat
    broadcast_data = {
        "type": "new_order",
        "data": {
            "customer_id": order.customer_id,
            "product_name": product['name'],
            "size": order.size,
            "quantity": order.quantity,
            "price": order_obj.price
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