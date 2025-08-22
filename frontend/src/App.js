import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import axios from 'axios';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Heart, Bell, ShoppingCart, Send, Users, Clock, MessageCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace(/^https?:\/\//, 'wss://');

function App() {
  const [language, setLanguage] = useState('de');
  const [isLive, setIsLive] = useState(true);
  const [viewerCount, setViewerCount] = useState(34);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [customerId] = useState(() => `customer_${Math.random().toString(36).substr(2, 9)}`);
  const [isAdminView, setIsAdminView] = useState(false);
  const [adminStats, setAdminStats] = useState({ total_orders: 0, session_orders: 0, active_viewers: 0 });
  
  const chatRef = useRef(null);
  const wsRef = useRef(null);

  const translations = {
    de: {
      customerLoggedIn: 'Kunde angemeldet',
      adminView: 'Adminansicht',
      customerView: 'Kundenansicht',
      logout: 'Abmelden',
      live: 'LIVE',
      runtime: 'Laufzeit:',
      endTime: 'Uhrzeit:',
      viewers: 'Zuschauer',
      streamTitle: 'Nur für Händler | Ab 10 € - Heute 18:00 - Frische Ware | Young Fashion & Plus Size',
      welcomeMessage: 'Willkommen bei OUTLET34 Live!',
      demoMessage: 'Zoom Live-Stream (Demo)',
      demoDescription: 'Dies ist eine Vorschau. Klicke auf "Meeting starten" um den Demo-Join zu simulieren.',
      startMeeting: 'Meeting starten',
      chatPlaceholder: 'Nachricht eingeben',
      send: 'Senden',
      reset: 'Reset',
      size: 'Größe (aktuell):',
      price: 'Preis (aktuell):',
      quantity: 'Menge',
      order: 'Bestellen',
      nextArticle: 'Nächster Artikel',
      sendPriceSize: 'Preis & Größe senden',
      keepPrice: 'Preis behalten',
      enterUsername: 'Username eingeben...',
      mobile: 'Handy',
      tablet: 'Tablet',
      desktop: 'Desktop',
      specialOffer: 'Sonderpreis',
      freeShipping: 'Freitekt eingehen und Er',
      topseller: 'Topseller',
      newIn: 'New In',
      sale: 'Abverkauf',
      adminDashboard: 'Admin Dashboard',
      totalOrders: 'Gesamtbestellungen',
      sessionOrders: 'Session Bestellungen',
      activeViewers: 'Aktive Zuschauer',
      resetCounter: 'Counter Reset',
      selectPrice: 'Preis auswählen'
    },
    en: {
      customerLoggedIn: 'Customer logged in',
      adminView: 'Admin View',
      customerView: 'Customer View',
      logout: 'Logout',
      live: 'LIVE',
      runtime: 'Runtime:',
      endTime: 'End time:',
      viewers: 'Viewers',
      streamTitle: 'For Dealers Only | From €10 - Today 18:00 - Fresh Goods | Young Fashion & Plus Size',
      welcomeMessage: 'Welcome to OUTLET34 Live!',
      demoMessage: 'Zoom Live-Stream (Demo)',
      demoDescription: 'This is a preview. Click "Start Meeting" to simulate the demo join.',
      startMeeting: 'Start Meeting',
      chatPlaceholder: 'Enter message',
      send: 'Send',
      reset: 'Reset',
      size: 'Size (current):',
      price: 'Price (current):',
      quantity: 'Quantity',
      order: 'Order',
      nextArticle: 'Next Article',
      sendPriceSize: 'Send Price & Size',
      keepPrice: 'Keep Price',
      enterUsername: 'Enter username...',
      mobile: 'Mobile',
      tablet: 'Tablet',
      desktop: 'Desktop',
      specialOffer: 'Special Offer',
      freeShipping: 'Free Shipping',
      topseller: 'Topseller',
      newIn: 'New In',
      sale: 'Sale',
      adminDashboard: 'Admin Dashboard',
      totalOrders: 'Total Orders',
      sessionOrders: 'Session Orders',
      activeViewers: 'Active Viewers',
      resetCounter: 'Reset Counter',
      selectPrice: 'Select Price'
    }
  };

  const t = translations[language];

  useEffect(() => {
    // Initialize WebSocket connection
    const connectWebSocket = () => {
      const ws = new WebSocket(`${WS_URL}/ws`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'chat_message') {
          setChatMessages(prev => [...prev, data.data]);
        } else if (data.type === 'viewer_count') {
          setViewerCount(data.count);
        } else if (data.type === 'new_order') {
          // Add order notification to chat
          const orderMsg = {
            id: `order_${Date.now()}`,
            username: 'System',
            message: `Bestellung | ${data.data.customer_id} | ${data.data.quantity} | ${data.data.price} | ${data.data.size}`,
            timestamp: new Date(),
            emoji: ''
          };
          setChatMessages(prev => [...prev, orderMsg]);
        } else if (data.type === 'order_counter_update') {
          setAdminStats(prev => ({
            ...prev,
            session_orders: data.data.session_orders,
            total_orders: data.data.total_orders
          }));
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected, retrying...');
        setTimeout(connectWebSocket, 3000);
      };
      
      wsRef.current = ws;
    };

    connectWebSocket();
    loadInitialData();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const loadInitialData = async () => {
    try {
      // Load chat messages
      const chatResponse = await axios.get(`${API}/chat`);
      setChatMessages(chatResponse.data);

      // Load products
      const productsResponse = await axios.get(`${API}/products`);
      setProducts(productsResponse.data);
      if (productsResponse.data.length > 0) {
        setSelectedProduct(productsResponse.data[0]);
        setSelectedSize(productsResponse.data[0].sizes[0]);
        setSelectedPrice(productsResponse.data[0].price);
      }

      // Load admin stats if in admin view
      if (isAdminView) {
        const statsResponse = await axios.get(`${API}/admin/stats`);
        setAdminStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !username.trim()) return;

    try {
      await axios.post(`${API}/chat`, {
        username: username,
        message: newMessage,
        emoji: ''
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const sendEmoji = async (emoji) => {
    if (!username.trim()) return;

    try {
      await axios.post(`${API}/chat`, {
        username: username,
        message: '',
        emoji: emoji
      });
    } catch (error) {
      console.error('Error sending emoji:', error);
    }
  };

  const placeOrder = async () => {
    if (!selectedProduct || !selectedSize) return;

    try {
      await axios.post(`${API}/orders`, {
        customer_id: customerId,
        product_id: selectedProduct.id,
        size: selectedSize,
        quantity: quantity
      });
    } catch (error) {
      console.error('Error placing order:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-pink-500 text-white">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <span className="font-semibold">
                {t.customerLoggedIn} 10299
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-pink-600"
                onClick={() => setLanguage(language === 'de' ? 'en' : 'de')}
              >
                {language === 'de' ? 'EN' : 'DE'}
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button variant="secondary" size="sm">
                {t.customerView}
              </Button>
              <Button variant="secondary" size="sm">
                {t.adminView}
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-pink-600">
                {t.logout}
              </Button>
            </div>
          </div>
        </div>

        {/* Device Selector */}
        <div className="bg-gray-200 text-gray-800">
          <div className="container mx-auto px-4">
            <div className="flex">
              <Button variant="ghost" className="px-8 py-3 text-gray-600">
                {t.mobile}
              </Button>
              <Button variant="ghost" className="px-8 py-3 bg-pink-500 text-white">
                {t.tablet}
              </Button>
              <Button variant="ghost" className="px-8 py-3 text-gray-600">
                {t.desktop}
              </Button>
            </div>
          </div>
        </div>

        {/* Live Status Bar */}
        <div className="bg-black text-white py-2">
          <div className="container mx-auto px-4">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Badge className="bg-red-600 text-white">
                  {t.live}
                </Badge>
                <span className="text-sm">{t.runtime} 01:43</span>
                <span className="text-sm">{t.endTime} 15:45:11</span>
                <div className="flex items-center space-x-1">
                  <Users size={16} />
                  <span className="text-sm">{t.viewers} {viewerCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stream Title */}
        <div className="bg-pink-500 py-3">
          <div className="container mx-auto px-4 text-center">
            <p className="text-white font-medium">{t.streamTitle}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Video Stream Area */}
          <div className="lg:col-span-2">
            <Card className="bg-black text-white rounded-lg overflow-hidden">
              <CardContent className="p-6 min-h-[400px] flex flex-col justify-center items-start">
                <h3 className="text-xl mb-4 text-gray-300">{t.demoMessage}</h3>
                <div className="text-gray-400 mb-6">
                  <p>{t.demoDescription}</p>
                </div>
                <Button className="bg-pink-500 hover:bg-pink-600 text-white">
                  {t.startMeeting}
                </Button>
                <div className="absolute top-4 left-4 text-gray-500 text-sm">
                  - | - €
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center">
                    <MessageCircle className="mr-2" size={20} />
                    {t.welcomeMessage}
                  </h3>
                </div>

                {/* Chat Messages */}
                <div 
                  ref={chatRef}
                  className="h-64 overflow-y-auto bg-gray-50 rounded p-3 mb-4 space-y-2"
                >
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="text-sm">
                      {msg.username === 'System' ? (
                        <div className="text-gray-600 font-medium">
                          {msg.message}
                        </div>
                      ) : (
                        <div>
                          <span className="font-medium text-gray-800">
                            {msg.username} {msg.emoji && <span className="ml-1">{msg.emoji}</span>}
                          </span>
                          {msg.message && (
                            <span className="ml-2 text-gray-600">{msg.message}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Chat Input */}
                <div className="space-y-3">
                  <Input
                    placeholder={t.enterUsername}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="text-sm"
                  />
                  <div className="flex space-x-2">
                    <Input
                      placeholder={t.chatPlaceholder}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button 
                      onClick={sendMessage}
                      className="bg-pink-500 hover:bg-pink-600"
                      size="sm"
                    >
                      {t.send}
                    </Button>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      size="sm" 
                      className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
                      onClick={() => sendEmoji('🔥')}
                    >
                      🔥 {t.topseller}
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-purple-500 hover:bg-purple-600 text-white text-xs"
                      onClick={() => sendEmoji('🆕')}
                    >
                      🆕 {t.newIn}
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-teal-500 hover:bg-teal-600 text-white text-xs"
                      onClick={() => sendEmoji('💸')}
                    >
                      💸 {t.sale}
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-red-500 hover:bg-red-600 text-white text-xs"
                      onClick={() => sendEmoji('💖')}
                    >
                      💖 {t.specialOffer}
                    </Button>
                  </div>

                  {/* Emoji Reactions */}
                  <div className="flex space-x-2 justify-center">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => sendEmoji('❤️')}
                    >
                      ❤️
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => sendEmoji('🔥')}
                    >
                      🔥
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => sendEmoji('👍')}
                    >
                      👍
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Product Selection Area */}
        {selectedProduct && (
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Size Selection */}
                <div>
                  <h4 className="font-semibold mb-3">{t.size}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedProduct.sizes.map((size) => (
                      <Button
                        key={size}
                        variant={selectedSize === size ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedSize(size)}
                        className={selectedSize === size ? "bg-gray-800 text-white" : ""}
                      >
                        {size}
                      </Button>
                    ))}
                  </div>
                  <Input 
                    placeholder="Manuell" 
                    className="mt-2" 
                  />
                </div>

                {/* Price Selection */}
                <div>
                  <h4 className="font-semibold mb-3">{t.price}</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {['5,00 €', '6,90 €', '7,50 €', '8,50 €', '9,00 €', '9,90 €', '11,50 €'].map((price) => (
                      <Button
                        key={price}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        {price}
                      </Button>
                    ))}
                  </div>
                  <Input 
                    placeholder="Manuell" 
                    className="mt-2" 
                  />
                  <Button 
                    className="w-full mt-2 text-sm"
                    variant="outline"
                  >
                    {t.keepPrice}
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4 mt-6">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  ➕ {t.nextArticle}
                </Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  ⚠️ {t.sendPriceSize}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Section */}
        {selectedProduct && (
          <Card className="mt-6 max-w-md mx-auto">
            <CardContent className="p-4">
              <div className="text-center space-y-4">
                <div>
                  <div className="text-sm text-gray-600">{t.size}</div>
                  <div className="font-semibold">{selectedSize}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Händlerpreis</div>
                  <div className="font-semibold text-pink-600 text-xl">
                    {selectedProduct.price.toFixed(2)} €
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-4">
                  <span>{t.quantity}</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    -
                  </Button>
                  <span className="font-semibold">{quantity}</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    +
                  </Button>
                </div>
                <Button 
                  onClick={placeOrder}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white"
                >
                  🛒 {t.order}
                </Button>
                <p className="text-xs text-gray-500">
                  Alle Preise netto, zzgl. Versand*
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default App;