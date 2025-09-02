import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import './i18n';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Heart, Bell, ShoppingCart, Send, Users, Clock, MessageCircle } from 'lucide-react';
import ZoomLiveStream from './components/ZoomLiveStream';
import SimpleLiveStream from './components/SimpleLiveStream';
import StreamingInterface from './components/streaming/StreamingInterface';
import StreamsList from './components/streaming/StreamsList';
import LiveKitRoomManager from './components/streaming/LiveKitRoomManager';
import SimpleVideoStreaming from './components/streaming/SimpleVideoStreaming';
import livekitService from './services/livekitService';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace(/^https?:\/\//, BACKEND_URL.startsWith('https://') ? 'wss://' : 'ws://');

function App() {
  const { t, i18n } = useTranslation();
  const [isLive, setIsLive] = useState(true);
  const [viewerCount, setViewerCount] = useState(34);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username] = useState('Kunde');
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [customerId] = useState(() => `customer_${Math.random().toString(36).substr(2, 9)}`);
  const [isAdminView, setIsAdminView] = useState(false);
  const [adminStats, setAdminStats] = useState({ 
    total_orders: 0, 
    session_orders: 0, 
    total_revenue: 0, 
    session_revenue: 0, 
    total_items: 0 
  });
  const [pinnedMessages, setPinnedMessages] = useState([]); // Für Chat-Pinnung
  const [showCustomerLogin, setShowCustomerLogin] = useState(false);
  const [customerLoginData, setCustomerLoginData] = useState({ customer_number: '' });
  const [customerLoginError, setCustomerLoginError] = useState('');
  const [activeView, setActiveView] = useState('orders'); // 'chat' or 'orders' - Standard auf Bestellungen
  const [allOrders, setAllOrders] = useState([]); // Alle Bestellungen von allen Kunden
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showTopBuyers, setShowTopBuyers] = useState(true); // Top 3 Käufer auf/zuklappbar
  const [showLastOrder, setShowLastOrder] = useState(true); // Letzte Bestellung auf/zuklappbar
  const [tickerSettings, setTickerSettings] = useState({ 
    text: "Nur für Händler | Ab 10 € - Heute 18:00 - Frische Ware | Young Fashion & Plus Size", 
    enabled: true 
  });
  const [newTickerText, setNewTickerText] = useState('');
  
  // Customer Management States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [customerStatus, setCustomerStatus] = useState(null); // null, pending, active, blocked
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    customer_number: '',
    email: '',
    name: ''
  });
  const [registrationError, setRegistrationError] = useState('');
  const [customers, setCustomers] = useState([]);
  
  // Admin Authentication States
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  
  // Customer Management Filter States
  const [customerFilter, setCustomerFilter] = useState('all'); // 'all', 'pending', 'blocked'
  const [customerSearch, setCustomerSearch] = useState(''); // Search by customer number
  
  // Admin Dashboard Collapsible Sections
  const [showStatistics, setShowStatistics] = useState(true);
  const [showCustomerManagement, setShowCustomerManagement] = useState(true);
  const [showStreamingControls, setShowStreamingControls] = useState(false);
  const [showTickerSettings, setShowTickerSettings] = useState(false);
  const [showCalendarManagement, setShowCalendarManagement] = useState(false);
  const [showLiveStreamManagement, setShowLiveStreamManagement] = useState(false);
  
  // Manual Customer Creation States
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    customer_number: '',
    email: '',
    name: ''
  });
  const [createCustomerError, setCreateCustomerError] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  
  // Profile Image States
  const [showProfileImageUpload, setShowProfileImageUpload] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Last Order States
  const [customerLastOrder, setCustomerLastOrder] = useState(null);
  const [loadingLastOrder, setLoadingLastOrder] = useState(false);

  // Live Shopping Calendar States
  const [events, setEvents] = useState([]);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [newEventData, setNewEventData] = useState({
    date: '',
    time: '',
    title: '',
    description: ''
  });
  const [eventError, setEventError] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Push Notification Functions
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Ihr Browser unterstützt keine Push-Benachrichtigungen.');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      localStorage.setItem('notificationsEnabled', 'true');
      return true;
    } else {
      alert('Benachrichtigungen wurden abgelehnt. Sie können sie in den Browser-Einstellungen aktivieren.');
      return false;
    }
  };

  // WebRTC Streaming States (Legacy - keeping for backward compatibility)
  const [showStreaming, setShowStreaming] = useState(false);
  const [currentStreamId, setCurrentStreamId] = useState(null);
  const [activeStreams, setActiveStreams] = useState([]);
  const [streamingMode, setStreamingMode] = useState(null); // 'streamer' or 'viewer'
  
  // Simple Video Streaming States (New Stable Solution)
  const [showSimpleStream, setShowSimpleStream] = useState(false);

  const scheduleEventNotification = (event) => {
    if (!notificationsEnabled || !('Notification' in window)) return;
    
    const eventDateTime = new Date(event.date + 'T' + event.time);
    const now = new Date();
    const timeUntilEvent = eventDateTime.getTime() - now.getTime();
    
    // Schedule notification 30 minutes before event
    const notificationTime = timeUntilEvent - (30 * 60 * 1000); // 30 minutes before
    
    if (notificationTime > 0) {
      setTimeout(() => {
        new Notification('🛍️ OUTLET34 Live Shopping', {
          body: `"${event.title}" startet in 30 Minuten! Nicht verpassen!`,
          icon: '/images/outlet34-logo.jpg',
          badge: '/images/outlet34-logo.jpg',
          tag: `event-${event.id}`,
          requireInteraction: true
        });
      }, notificationTime);
    }
  };

  // Check notification permission on load
  useEffect(() => {
    const savedNotification = localStorage.getItem('notificationsEnabled');
    if (savedNotification === 'true' && 'Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);
  
  // Profile Modal States
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  const chatRef = useRef(null);
  const wsRef = useRef(null);



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
        } else if (data.type === 'order_notification') {
          // Add order notification to chat in the new format
          const orderMsg = {
            id: `order_${Date.now()}`,
            username: 'System',
            message: data.data.message, // Already formatted: "Bestellung 1234 | 1 | 12,90 | OneSize"
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
        } else if (data.type === 'ticker_update') {
          setTickerSettings(data.data);
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
    
    // Check for admin session
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession === 'true') {
      setIsAdminAuthenticated(true);
      setIsAdminView(true);
      setIsAuthenticated(true);
    }
    
    // Check for admin access via URL parameter (fallback)
    const urlParams = new URLSearchParams(window.location.search);
    const isAdminParam = urlParams.get('admin') === 'true';
    if (isAdminParam && !adminSession) {
      setIsAdminAuthenticated(true);
      setIsAdminView(true);
      setIsAuthenticated(true);
      localStorage.setItem('adminSession', 'true');
    }
    
    // Check for stored customer authentication (only if not admin)
    const storedCustomerNumber = localStorage.getItem('customerNumber');
    if (storedCustomerNumber && !adminSession && !isAdminParam) {
      checkCustomerStatus(storedCustomerNumber);
    }

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

  useEffect(() => {
    if (isAdminView) {
      loadAdminStats();
      loadCustomers();
      loadAllOrders(); // Lade alle Bestellungen
    }
  }, [isAdminView]);

  useEffect(() => {
    // Load customer's last order when customer changes
    if (currentCustomer?.customer_number && isAuthenticated && !isAdminView) {
      loadCustomerLastOrder(currentCustomer.customer_number);
    }
  }, [currentCustomer?.customer_number, isAuthenticated, isAdminView]);

  useEffect(() => {
    // Load events on component mount
    loadEvents();
  }, []);
  // Lade Bestellungen auch bei View-Wechsel neu (für Timezone-Fix)
  useEffect(() => {
    if (activeView === 'orders') {
      console.log('Orders tab activated - refreshing data for timezone fix');
      loadAllOrders();
    }
  }, [activeView]);

  // Update live statistics when chat messages change
  useEffect(() => {
    if (isAdminAuthenticated && chatMessages.length > 0) {
      const liveStats = calculateLiveStats();
      setAdminStats(prev => ({
        ...prev,
        ...liveStats
      }));
    }
  }, [chatMessages, isAdminAuthenticated]);

  // Schedule notifications for all future events when events load
  useEffect(() => {
    if (notificationsEnabled && events.length > 0) {
      events.forEach(event => {
        scheduleEventNotification(event);
      });
    }
  }, [events, notificationsEnabled]);

  const loadAdminStats = async () => {
    try {
      const statsResponse = await axios.get(`${API}/admin/stats`);
      setAdminStats(statsResponse.data);
      
      const tickerResponse = await axios.get(`${API}/admin/ticker`);
      setTickerSettings(tickerResponse.data);
      setNewTickerText(tickerResponse.data.text);
    } catch (error) {
      console.error('Error loading admin stats:', error);
    }
  };

  // Helper function for automatic customer number detection
  const getCustomerNumber = () => {
    // Automatic detection with multiple fallbacks
    if (currentCustomer?.customer_number) {
      return currentCustomer.customer_number;
    }
    
    const storedNumber = localStorage.getItem('customerNumber');
    if (storedNumber) {
      return storedNumber;
    }
    
    return '10299'; // fallback
  };

  // Helper function to format bold text in messages
  const formatMessage = (message) => {
    // Convert **text** to <strong>text</strong>
    if (message.includes('**')) {
      const parts = message.split('**');
      return parts.map((part, index) => 
        index % 2 === 1 ? <strong key={index}>{part}</strong> : part
      );
    }
    return message;
  };

  // Language helper functions
  const updateCustomerLanguage = async (customerNumber, language) => {
    try {
      await axios.put(`${API}/customers/${customerNumber}/language`, {
        language: language
      });
      return true;
    } catch (error) {
      console.error('Error updating customer language:', error);
      return false;
    }
  };

  const changeLanguage = async (languageCode) => {
    // Update i18n language
    i18n.changeLanguage(languageCode);
    
    // Update customer language preference in backend if logged in
    if (currentCustomer?.customer_number && !isAdminView) {
      await updateCustomerLanguage(currentCustomer.customer_number, languageCode);
    }
  };

  // Get next upcoming event for countdown
  const getNextEvent = () => {
    if (events.length === 0) return null;
    
    const now = new Date();
    const upcomingEvents = events.filter(event => {
      const eventDateTime = new Date(event.date + 'T' + event.time);
      return eventDateTime > now;
    });
    
    if (upcomingEvents.length === 0) return null;
    
    // Sort by date/time and return the next one
    upcomingEvents.sort((a, b) => {
      const dateTimeA = new Date(a.date + 'T' + a.time);
      const dateTimeB = new Date(b.date + 'T' + b.time);
      return dateTimeA - dateTimeB;
    });
    
    return upcomingEvents[0];
  };

  // Hilfsfunktion für korrekte deutsche Zeitanzeige
  const formatGermanDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      // If already formatted as German datetime string (DD.MM.YYYY HH:MM:SS), return as is
      if (typeof timestamp === 'string' && /^\d{2}\.\d{2}\.\d{4}/.test(timestamp)) {
        return timestamp; // Already formatted in German format
      }
      
      // Handle ISO timestamp string (2025-09-02T12:13:25.446000)
      let date;
      if (typeof timestamp === 'string') {
        // Parse ISO timestamp correctly - browser will handle timezone
        if (timestamp.includes('T')) {
          // ISO format - parse as UTC if no timezone info
          date = new Date(timestamp + (timestamp.includes('Z') || timestamp.includes('+') ? '' : 'Z'));
        } else {
          date = new Date(timestamp);
        }
      } else {
        date = new Date(timestamp);
      }
      
      // Let browser handle timezone conversion automatically to Europe/Berlin
      return date.toLocaleString('de-DE', {
        timeZone: 'Europe/Berlin',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.error('formatGermanDateTime error:', error, 'with timestamp:', timestamp);
      return timestamp || 'Invalid Date'; // Return original timestamp if parsing fails
    }
  };

  const formatGermanTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString('de-DE', {
      timeZone: 'Europe/Berlin',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatGermanDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp);
    return date.toLocaleDateString('de-DE', {
      timeZone: 'Europe/Berlin',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Berechne Top 3 Käufer für Gamification - basierend auf echten Bestelldaten
  const getTop3Buyers = () => {
    const buyerStats = {};

    allOrders.forEach(order => {
      const customerNumber = order.customer_id;
      const quantity = parseInt(order.quantity) || 1;
      const price = parseFloat(order.price) || 0;
      const revenue = price; // price ist bereits der Gesamtpreis für diese Bestellung

      if (customerNumber && !customerNumber.startsWith('N/A')) {
        if (!buyerStats[customerNumber]) {
          buyerStats[customerNumber] = {
            customerNumber,
            totalOrders: 0,
            totalItems: 0,
            totalRevenue: 0
          };
        }

        buyerStats[customerNumber].totalOrders++;
        buyerStats[customerNumber].totalItems += quantity;
        buyerStats[customerNumber].totalRevenue += revenue;
      }
    });

    // Sort by total revenue and get top 3
    return Object.values(buyerStats)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 3);
  };

  // Chat-Pinnung Funktionen
  const pinMessage = (messageId) => {
    const message = chatMessages.find(msg => msg.id === messageId);
    if (message && !pinnedMessages.find(pin => pin.id === messageId)) {
      setPinnedMessages(prev => [...prev, { ...message, pinnedAt: new Date() }]);
    }
  };

  const unpinMessage = (messageId) => {
    setPinnedMessages(prev => prev.filter(pin => pin.id !== messageId));
  };

  const isPinned = (messageId) => {
    return pinnedMessages.some(pin => pin.id === messageId);
  };

  // Customer Authentication Functions
  const customerLogin = async () => {
    try {
      setCustomerLoginError('');
      
      if (!customerLoginData.customer_number.trim()) {
        setCustomerLoginError('Bitte geben Sie Ihre Kundennummer ein.');
        return;
      }
      
      const customerData = await checkCustomerStatus(customerLoginData.customer_number);
      
      if (!customerData) {
        setCustomerLoginError('Kundennummer nicht gefunden. Bitte registrieren Sie sich zuerst.');
        return;
      }
      
      if (customerData.activation_status === 'pending') {
        setCustomerStatus('pending');
        setCurrentCustomer(customerData);
        localStorage.setItem('customerNumber', customerData.customer_number);
        setCustomerLoginError('');
        return;
      }
      
      if (customerData.activation_status === 'blocked') {
        setCustomerStatus('blocked');
        setCurrentCustomer(customerData);
        localStorage.setItem('customerNumber', customerData.customer_number);
        setCustomerLoginError('');
        return;
      }
      
      if (customerData.activation_status === 'active') {
        // Successful login
        setIsAuthenticated(true);
        setCurrentCustomer(customerData);
        setCustomerStatus('active');
        localStorage.setItem('customerNumber', customerData.customer_number);
        setShowCustomerLogin(false);
        setCustomerLoginData({ customer_number: '' });
        
        // Set user's preferred language
        if (customerData.preferred_language) {
          i18n.changeLanguage(customerData.preferred_language);
        }
        
        // Send login message to chat
        await sendLoginMessage(customerData.customer_number);
        
        return;
      }
      
      setCustomerLoginError('Unbekannter Kundenstatus. Bitte kontaktieren Sie den Support.');
      
    } catch (error) {
      console.error('Error during customer login:', error);
      setCustomerLoginError('Anmeldefehler. Bitte versuchen Sie es erneut.');
    }
  };

  // Customer Management Functions
  const checkCustomerStatus = async (customerNumber) => {
    try {
      const response = await axios.get(`${API}/customers/check/${customerNumber}`);
      const data = response.data;
      
      if (data.exists) {
        setCurrentCustomer(data);
        setCustomerStatus(data.activation_status);
        const wasAuthenticated = isAuthenticated;
        setIsAuthenticated(data.activation_status === 'active');
        
        // Set user's preferred language
        if (data.preferred_language && data.activation_status === 'active') {
          i18n.changeLanguage(data.preferred_language);
        }
        
        // Send login message if customer just became authenticated
        if (!wasAuthenticated && data.activation_status === 'active') {
          await sendLoginMessage(data.customer_number);
        }
        
        return data;
      } else {
        setIsAuthenticated(false);
        setCustomerStatus(null);
        return null;
      }
    } catch (error) {
      console.error('Error checking customer status:', error);
      setIsAuthenticated(false);
      setCustomerStatus(null);
      return null;
    }
  };

  // Admin Authentication Functions
  const adminLogin = () => {
    if (adminPin === '1924') {
      setIsAdminAuthenticated(true);
      setIsAdminView(true);
      setIsAuthenticated(true);
      setShowAdminLogin(false);
      setAdminPin('');
      setAdminLoginError('');
      localStorage.setItem('adminSession', 'true');
    } else {
      setAdminLoginError('Ungültige PIN. Bitte versuchen Sie es erneut.');
    }
  };

  const adminLogout = () => {
    setIsAdminAuthenticated(false);
    setIsAdminView(false);
    setIsAuthenticated(false);
    localStorage.removeItem('adminSession');
    localStorage.removeItem('customerNumber');
    setCurrentCustomer(null);
    setCustomerStatus(null);
  };

  const customerLogout = async () => {
    // Send logout message to chat
    if (currentCustomer?.customer_number) {
      try {
        await axios.post(`${API}/chat`, {
          username: 'System',
          message: `${currentCustomer.customer_number} hat sich abgemeldet`,
          emoji: ''
        });
      } catch (error) {
        console.error('Error sending logout message:', error);
      }
    }
    
    localStorage.removeItem('customerNumber');
    setIsAuthenticated(false);
    setCurrentCustomer(null);
    setCustomerStatus(null);
    setIsAdminView(false);
  };

  const sendAdminNotification = async (message) => {
    try {
      await axios.post(`${API}/chat`, {
        username: 'System',
        message: `🔔 ADMIN: ${message}`,
        emoji: ''
      });
    } catch (error) {
      console.error('Error sending admin notification:', error);
    }
  };

  // Helper function to extract customer number from username or message
  const extractCustomerNumber = (username) => {
    // If username is 'Kunde', return current customer number
    if (username === 'Kunde' && currentCustomer?.customer_number) {
      return currentCustomer.customer_number;
    }
    // If username is already a customer number pattern
    if (username && /^\d+$/.test(username)) {
      return username;
    }
    // Extract number from formatted messages like "Chat 10299 I ..."
    const match = username.match(/\d+/);
    return match ? match[0] : username;
  };

  const sendLoginMessage = async (customerNumber) => {
    try {
      await axios.post(`${API}/chat`, {
        username: 'System',
        message: `${customerNumber} hat sich angemeldet`,
        emoji: ''
      });
    } catch (error) {
      console.error('Error sending login message:', error);
    }
  };

  const registerCustomer = async () => {
    try {
      setRegistrationError('');
      
      // First check if customer already exists and what their status is
      const existingCustomer = await checkCustomerStatus(registrationData.customer_number);
      
      if (existingCustomer) {
        if (existingCustomer.activation_status === 'active') {
          // Customer is already registered and active - log them in
          setIsAuthenticated(true);
          setCurrentCustomer(existingCustomer);
          setCustomerStatus('active');
          localStorage.setItem('customerNumber', existingCustomer.customer_number || registrationData.customer_number);
          setShowRegistration(false);
          setRegistrationData({ customer_number: '', email: '', name: '' });
          
          // Send login message to chat
          await sendLoginMessage(existingCustomer.customer_number || registrationData.customer_number);
          
          return true;
        } else if (existingCustomer.activation_status === 'pending') {
          // Customer exists but is pending
          setCurrentCustomer(existingCustomer);
          setCustomerStatus('pending');
          setShowRegistration(false);
          setRegistrationData({ customer_number: '', email: '', name: '' });
          return true;
        } else if (existingCustomer.activation_status === 'blocked') {
          // Customer exists but is blocked
          setCurrentCustomer(existingCustomer);
          setCustomerStatus('blocked');
          setShowRegistration(false);
          setRegistrationData({ customer_number: '', email: '', name: '' });
          return true;
        }
      }
      
      // Customer doesn't exist - try to register new
      const response = await axios.post(`${API}/customers/register`, registrationData);
      
      if (response.status === 200) {
        const customerData = response.data;
        setCurrentCustomer(customerData);
        setCustomerStatus('pending');
        setShowRegistration(false);
        setRegistrationData({ customer_number: '', email: '', name: '' });
        
        // Store customer number in localStorage for future sessions
        localStorage.setItem('customerNumber', customerData.customer_number);
        
        // Send admin notification for new registration
        await sendAdminNotification(`Neue Registrierung: ${customerData.name} (${customerData.customer_number}) wartet auf Freischaltung`);
        
        return true;
      }
    } catch (error) {
      console.error('Registration error:', error);
      if (error.response && error.response.data && error.response.data.detail) {
        setRegistrationError(error.response.data.detail);
      } else {
        setRegistrationError('Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.');
      }
      return false;
    }
  };

  const loadCustomers = async () => {
    if (isAdminView || isAdminAuthenticated) {
      try {
        const response = await axios.get(`${API}/admin/customers`);
        // Sort customers by customer_number (ascending - klein nach groß)
        const sortedCustomers = response.data.sort((a, b) => {
          // Convert customer numbers to integers for proper numeric sorting
          const numA = parseInt(a.customer_number) || 0;
          const numB = parseInt(b.customer_number) || 0;
          return numA - numB;
        });
        setCustomers(sortedCustomers);
      } catch (error) {
        console.error('Error loading customers:', error);
      }
    }
  };

  const activateCustomer = async (customerId) => {
    try {
      await axios.post(`${API}/admin/customers/${customerId}/activate`);
      loadCustomers(); // Refresh the list
    } catch (error) {
      console.error('Error activating customer:', error);
    }
  };

  const blockCustomer = async (customerId) => {
    try {
      await axios.post(`${API}/admin/customers/${customerId}/block`);
      loadCustomers(); // Refresh the list
    } catch (error) {
      console.error('Error blocking customer:', error);
    }
  };

  const deleteCustomer = async (customerId) => {
    try {
      await axios.delete(`${API}/admin/customers/${customerId}`);
      loadCustomers(); // Refresh the list
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  const createCustomerManually = async () => {
    try {
      setCreateCustomerError('');
      setCreatingCustomer(true);
      
      // Validation
      if (!newCustomerData.customer_number.trim()) {
        setCreateCustomerError('Kundennummer ist erforderlich.');
        return;
      }
      if (!newCustomerData.email.trim()) {
        setCreateCustomerError('E-Mail ist erforderlich.');
        return;
      }
      if (!newCustomerData.name.trim()) {
        setCreateCustomerError('Name ist erforderlich.');
        return;
      }
      
      // Create customer via admin API
      const response = await axios.post(`${API}/admin/customers/create`, newCustomerData);
      
      // Store customer info for notification before reset
      const customerName = newCustomerData.name;
      const customerNumber = newCustomerData.customer_number;
      
      // Reset form and close modal
      setNewCustomerData({ customer_number: '', email: '', name: '' });
      setShowCreateCustomer(false);
      setCreateCustomerError('');
      
      // Refresh customer list
      await loadCustomers();
      
      // Send admin notification
      try {
        await sendAdminNotification(`Neuer Kunde manuell erstellt: ${customerName} (${customerNumber}) - Status: Aktiv`);
      } catch (notifError) {
        console.error('Notification error (non-critical):', notifError);
      }
      
    } catch (error) {
      console.error('Manual customer creation error:', error);
      if (error.response && error.response.data && error.response.data.detail) {
        setCreateCustomerError(error.response.data.detail);
      } else {
        setCreateCustomerError('Fehler beim Erstellen des Kunden. Bitte versuchen Sie es erneut.');
      }
    } finally {
      setCreatingCustomer(false);
    }
  };

  const uploadProfileImage = async (customerNumber, file) => {
    try {
      if (!customerNumber || customerNumber === 'undefined') {
        console.error('Invalid customer number for upload:', customerNumber);
        return;
      }
      
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('Uploading image for customer number:', customerNumber);
      
      const response = await axios.post(`${API}/customers/${customerNumber}/upload-profile-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Update current customer data if it's the same customer
      if (currentCustomer && currentCustomer.customer_number === customerNumber) {
        setCurrentCustomer(prev => ({
          ...prev,
          profile_image: response.data.profile_image
        }));
      }
      
      // Reload customer status to get updated profile image
      await checkCustomerStatus(customerNumber);
      
      loadCustomers(); // Refresh admin list if needed
      return response.data;
    } catch (error) {
      console.error('Error uploading profile image:', error);
      alert('Fehler beim Hochladen des Profilbildes. Bitte versuchen Sie es erneut.');
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const loadCustomerLastOrder = async (customerNumber) => {
    if (!customerNumber || customerNumber === 'undefined') {
      console.log('Skipping last order load for invalid customer number:', customerNumber);
      return; // Skip for invalid customer numbers
    }
    
    try {
      setLoadingLastOrder(true);
      console.log('Loading last order for customer:', customerNumber);
      
      const response = await axios.get(`${API}/customers/${customerNumber}/last-order`);
      console.log('Last order response:', response.data);
      
      if (response.data.has_order) {
        setCustomerLastOrder(response.data.order);
        console.log('Last order updated:', response.data.order);
      } else {
        setCustomerLastOrder(null);
        console.log('No orders found for customer');
      }
    } catch (error) {
      console.error('Error loading customer last order:', error);
      setCustomerLastOrder(null);
    } finally {
      setLoadingLastOrder(false);
    }
  };

  const deleteProfileImage = async (customerNumber) => {
    try {
      if (!customerNumber || customerNumber === 'undefined') {
        console.error('Invalid customer number for delete:', customerNumber);
        return;
      }
      
      console.log('Deleting image for customer number:', customerNumber);
      
      await axios.delete(`${API}/customers/${customerNumber}/profile-image`);
      
      // Update current customer data if it's the same customer
      if (currentCustomer && currentCustomer.customer_number === customerNumber) {
        setCurrentCustomer(prev => ({
          ...prev,
          profile_image: null
        }));
      }
      
      // Reload customer status to get updated profile
      await checkCustomerStatus(customerNumber);
      
      loadCustomers(); // Refresh admin list if needed
    } catch (error) {
      console.error('Error deleting profile image:', error);
      alert('Fehler beim Löschen des Profilbildes. Bitte versuchen Sie es erneut.');
    }
  };

  const updateTicker = async () => {
    try {
      const updatedSettings = {
        text: newTickerText,
        enabled: tickerSettings.enabled
      };
      await axios.post(`${API}/admin/ticker`, updatedSettings);
      setTickerSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating ticker:', error);
    }
  };

  const toggleTicker = async () => {
    try {
      const updatedSettings = {
        ...tickerSettings,
        enabled: !tickerSettings.enabled
      };
      await axios.post(`${API}/admin/ticker`, updatedSettings);
      setTickerSettings(updatedSettings);
    } catch (error) {
      console.error('Error toggling ticker:', error);
    }
  };

  // Live Shopping Calendar Functions
  const loadEvents = async () => {
    try {
      setLoadingEvents(true);
      const response = await axios.get(`${API}/events`);
      
      // Filter events: only show future events (from today onwards)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of today
      
      const futureEvents = response.data.filter(event => {
        const eventDate = new Date(event.date + 'T00:00:00');
        return eventDate >= today;
      });
      
      // Sort by date and time
      futureEvents.sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.time);
        const dateB = new Date(b.date + 'T' + b.time);
        return dateA - dateB;
      });
      
      setEvents(futureEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const createEvent = async () => {
    try {
      setEventError('');
      
      if (!newEventData.date || !newEventData.time || !newEventData.title) {
        setEventError('Datum, Zeit und Titel sind erforderlich.');
        return;
      }

      await axios.post(`${API}/admin/events`, newEventData);
      setShowCreateEvent(false);
      setNewEventData({ date: '', time: '', title: '', description: '' });
      loadEvents(); // Refresh events list
    } catch (error) {
      console.error('Error creating event:', error);
      setEventError('Fehler beim Erstellen des Events. Bitte versuchen Sie es erneut.');
    }
  };

  const updateEvent = async () => {
    try {
      setEventError('');
      
      if (!currentEvent) return;

      await axios.put(`${API}/admin/events/${currentEvent.id}`, newEventData);
      setShowEditEvent(false);
      setCurrentEvent(null);
      setNewEventData({ date: '', time: '', title: '', description: '' });
      loadEvents(); // Refresh events list
    } catch (error) {
      console.error('Error updating event:', error);
      setEventError('Fehler beim Aktualisieren des Events. Bitte versuchen Sie es erneut.');
    }
  };

  const deleteEvent = async (eventId) => {
    try {
      if (window.confirm('Möchten Sie dieses Event wirklich löschen?')) {
        await axios.delete(`${API}/admin/events/${eventId}`);
        loadEvents(); // Refresh events list
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Fehler beim Löschen des Events. Bitte versuchen Sie es erneut.');
    }
  };

  const openEditEvent = (event) => {
    setCurrentEvent(event);
    setNewEventData({
      date: event.date,
      time: event.time,
      title: event.title,
      description: event.description || ''
    });
    setEventError('');
    setShowEditEvent(true);
  };

  const formatEventDate = (dateStr) => {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      return date.toLocaleDateString('de-DE', options);
    } catch (error) {
      return dateStr;
    }
  };

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
        
        // Load ticker settings
        const tickerResponse = await axios.get(`${API}/admin/ticker`);
        setTickerSettings(tickerResponse.data);
        setNewTickerText(tickerResponse.data.text);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      // Format chat message: Admin messages show as "Admin", customer messages show customer number
      const displayName = isAdminAuthenticated ? 'Admin' : username;
      const customerDisplayNumber = getCustomerNumber();
      const formattedMessage = isAdminAuthenticated ? 
        `${newMessage}` : 
        `Chat ${customerDisplayNumber} I ${newMessage}`;
      
      await axios.post(`${API}/chat`, {
        username: displayName,
        message: formattedMessage,
        emoji: ''
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const sendEmoji = async (emoji) => {
    try {
      // Format emoji message like regular chat messages for customers
      const displayName = isAdminAuthenticated ? 'Admin' : username;
      const customerDisplayNumber = getCustomerNumber();
      const formattedMessage = isAdminAuthenticated ? 
        '' : // Admin emojis have no text message
        `Chat ${customerDisplayNumber} I`; // Customer emojis show customer number format
      
      await axios.post(`${API}/chat`, {
        username: displayName,
        message: formattedMessage,
        emoji: emoji
      });
    } catch (error) {
      console.error('Error sending emoji:', error);
    }
  };

  const placeOrder = async () => {
    if (!selectedProduct || !selectedSize) return;

    try {
      // Get customer ID for the order API
      const actualCustomerId = currentCustomer?.customer_number || localStorage.getItem('customerNumber') || customerId;
      
      console.log('Placing order for customer:', actualCustomerId);
      
      // Place the order first - Backend will automatically send WebSocket notification
      const orderResponse = await axios.post(`${API}/orders`, {
        customer_id: actualCustomerId,
        product_id: selectedProduct.id,
        size: selectedSize,
        quantity: quantity,
        price: selectedPrice
      });
      
      console.log('Order placed successfully:', orderResponse.data);

      // Reload customer's last order to update the display
      console.log('Reloading last order for customer:', actualCustomerId);
      await loadCustomerLastOrder(actualCustomerId);

      // Reload all orders to update the orders list immediately
      await loadAllOrders();

    } catch (error) {
      console.error('Error placing order:', error);
      alert('Fehler beim Bestellen. Bitte versuchen Sie es erneut.');
    }
  };

  const resetOrderCounter = async () => {
    if (window.confirm('Session-Bestellungen auf 0 zurücksetzen?')) {
      try {
        await axios.post(`${API}/admin/reset-counter`);
        setAdminStats(prev => ({ 
          ...prev, 
          session_orders: 0,
          session_revenue: 0 
        }));
      } catch (error) {
        console.error('Error resetting counter:', error);
      }
    }
  };

  // Funktion zum Laden aller Bestellungen von allen Kunden
  const loadAllOrders = async () => {
    setLoadingOrders(true);
    try {
      const response = await axios.get(`${API}/orders`);
      setAllOrders(response.data);
    } catch (error) {
      console.error('Error loading all orders:', error);
      setAllOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Berechne Live-Statistiken aus Chat-Nachrichten
  const calculateLiveStats = () => {
    const orderMessages = chatMessages.filter(msg => msg.message.includes('Bestellung'));
    
    let totalRevenue = 0;
    let sessionRevenue = 0;
    let totalItems = 0;
    const sessionStartTime = new Date().setHours(0, 0, 0, 0); // Today's start
    
    orderMessages.forEach(msg => {
      // Parse order message: "**Bestellung** [CustomerNumber] I [Quantity]x I [Price] I [Size]"
      const match = msg.message.match(/\*\*Bestellung\*\*.*?(\d+)x.*?([\d,]+).*€/);
      if (match) {
        const quantity = parseInt(match[1]) || 1;
        const price = parseFloat(match[2].replace(',', '.')) || 0;
        const revenue = quantity * price;
        
        totalRevenue += revenue;
        totalItems += quantity;
        
        // Check if message is from current session (today)
        const msgTime = new Date(msg.timestamp || Date.now());
        if (msgTime >= sessionStartTime) {
          sessionRevenue += revenue;
        }
      }
    });
    
    return {
      total_orders: orderMessages.length,
      session_orders: orderMessages.filter(msg => {
        const msgTime = new Date(msg.timestamp || Date.now());
        return msgTime >= sessionStartTime;
      }).length,
      total_revenue: totalRevenue,
      session_revenue: sessionRevenue,
      total_items: totalItems
    };
  };

  // WebRTC Streaming Functions (Legacy - keeping for backward compatibility)
  const startWebRTCStream = () => {
    if (!isAdminAuthenticated) {
      alert('Sie müssen als Administrator angemeldet sein, um zu streamen.');
      return;
    }
    
    setStreamingMode('streamer');
    setShowStreaming(true);
  };

  const joinWebRTCStream = (streamId) => {
    setCurrentStreamId(streamId);
    setStreamingMode('viewer');
    setShowStreaming(true);
  };

  const handleStreamEnd = () => {
    setShowStreaming(false);
    setCurrentStreamId(null);
    setStreamingMode(null);
    // Refresh active streams list
    loadActiveStreams();
  };

  const loadActiveStreams = async () => {
    try {
      const response = await axios.get(`${API}/streams/active`);
      setActiveStreams(response.data.streams || []);
    } catch (error) {
      console.error('Error loading active streams:', error);
      setActiveStreams([]);
    }
  };

  // LiveKit Streaming Functions (New Implementation)
  const startSimpleStream = () => {
    if (!isAdminAuthenticated) {
      alert(t('admin_required_for_streaming'));
      return;
    }
    
    setShowSimpleStream(true);
  };

  const joinSimpleStream = () => {
    if (!isAuthenticated) {
      alert(t('registration_required_for_viewing'));
      return;
    }
    
    setShowSimpleStream(true);
  };

  const handleSimpleStreamClose = () => {
    setShowSimpleStream(false);
  };

  const priceOptions = ['5,00 €', '6,90 €', '7,50 €', '8,50 €', '9,00 €', '9,90 €', '11,50 €', '12,90 €', '15,90 €', '18,90 €'];

  const handlePriceSelect = (priceStr) => {
    const price = parseFloat(priceStr.replace(',', '.').replace(' €', ''));
    setSelectedPrice(price);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Guest Landing Screen */}
      {!isAuthenticated && !isAdminView && (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-pink-500/10 via-purple-600/5 to-indigo-600/10"></div>
            <div className="absolute top-20 left-20 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-20 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
          </div>
          
          <div className="relative z-10 min-h-screen flex flex-col">
            {/* Top Header */}
            <div className="flex justify-between items-center p-6">
              {/* Language Selector - Flags Only */}
              <div className="flex space-x-2 bg-white/10 backdrop-blur-md rounded-full p-2">
                <button
                  onClick={() => changeLanguage('de')}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center ${
                    i18n.language === 'de' 
                      ? 'bg-white text-gray-900 shadow-lg scale-110' 
                      : 'text-white/70 hover:text-white hover:bg-white/10 hover:scale-105'
                  }`}
                  title="Deutsch"
                >
                  🇩🇪
                </button>
                <button
                  onClick={() => changeLanguage('en')}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center ${
                    i18n.language === 'en' 
                      ? 'bg-white text-gray-900 shadow-lg scale-110' 
                      : 'text-white/70 hover:text-white hover:bg-white/10 hover:scale-105'
                  }`}
                  title="English"
                >
                  🇺🇸
                </button>
                <button
                  onClick={() => changeLanguage('tr')}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center ${
                    i18n.language === 'tr' 
                      ? 'bg-white text-gray-900 shadow-lg scale-110' 
                      : 'text-white/70 hover:text-white hover:bg-white/10 hover:scale-105'
                  }`}
                  title="Türkçe"
                >
                  🇹🇷
                </button>
                <button
                  onClick={() => changeLanguage('fr')}
                  className={`px-3 py-2 rounded-full text-xs font-medium transition-all duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center ${
                    i18n.language === 'fr' 
                      ? 'bg-white text-gray-900 shadow-lg scale-110' 
                      : 'text-white/70 hover:text-white hover:bg-white/10 hover:scale-105'
                  }`}
                  title="Français"
                >
                  🇫🇷
                </button>
              </div>
              
              {/* Status Indicator */}
              <div className="flex items-center space-x-2 bg-green-500/20 backdrop-blur-md rounded-full px-4 py-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-200 text-xs font-medium">LIVE</span>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center px-6">
              <div className="w-full max-w-md space-y-8">
                {/* Logo Section */}
                <div className="text-center space-y-4">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                    <img 
                      src="/images/outlet34-logo.jpg" 
                      alt="OUTLET34 Fashion Logo" 
                      className="relative w-32 h-32 rounded-full shadow-2xl border-4 border-white/20 mx-auto hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <h1 className="text-4xl font-bold text-white">
                      OUTLET<span className="text-pink-400">34</span>
                    </h1>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="h-px bg-gradient-to-r from-transparent via-pink-400 to-transparent flex-1"></div>
                      <p className="text-purple-200 text-sm font-medium px-4">Dein Modegroßhandel</p>
                      <div className="h-px bg-gradient-to-r from-transparent via-pink-400 to-transparent flex-1"></div>
                    </div>
                  </div>
                </div>
                
                {/* Main Cards Section */}
                <div className="space-y-6">
                  {customerStatus === 'pending' ? (
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl">
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto">
                          <span className="text-2xl">⏳</span>
                        </div>
                        <h2 className="text-xl font-bold text-white">
                          Anmeldung eingegangen ✓
                        </h2>
                        <p className="text-white/70 text-sm leading-relaxed">
                          Ihre Registrierung wird derzeit geprüft. Sie werden aktiviert, sobald die Prüfung abgeschlossen ist.
                        </p>
                        
                        {currentCustomer && (
                          <div className="bg-white/5 rounded-xl p-4 text-left space-y-2">
                            <div className="flex justify-between">
                              <span className="text-white/60 text-sm">Kundennummer:</span>
                              <span className="text-white font-medium">{currentCustomer.customer_number || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/60 text-sm">Name:</span>
                              <span className="text-white font-medium">{currentCustomer.name || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/60 text-sm">E-Mail:</span>
                              <span className="text-white font-medium text-xs">{currentCustomer.email || 'N/A'}</span>
                            </div>
                          </div>
                        )}
                        
                        <button 
                          onClick={() => {
                            localStorage.removeItem('customerNumber');
                            setCurrentCustomer(null);
                            setCustomerStatus(null);
                          }}
                          className="w-full bg-white/10 hover:bg-white/20 border border-white/30 text-white py-3 px-4 rounded-xl font-medium transition-all duration-300 hover:scale-105"
                        >
                          Andere Kundennummer verwenden
                        </button>
                      </div>
                    </div>
                  ) : customerStatus === 'blocked' ? (
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-red-500/30 shadow-2xl">
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto">
                          <span className="text-2xl">🚫</span>
                        </div>
                        <h2 className="text-xl font-bold text-white">
                          Konto gesperrt
                        </h2>
                        <p className="text-white/70 text-sm leading-relaxed">
                          Ihr Kundenkonto wurde gesperrt. Bitte kontaktieren Sie unseren Support.
                        </p>
                        
                        <button 
                          onClick={() => {
                            localStorage.removeItem('customerNumber');
                            setCurrentCustomer(null);
                            setCustomerStatus(null);
                          }}
                          className="w-full bg-white/10 hover:bg-white/20 border border-white/30 text-white py-3 px-4 rounded-xl font-medium transition-all duration-300 hover:scale-105"
                        >
                          Andere Kundennummer verwenden
                        </button>
                      </div>
                    </div>
                  ) : showCustomerLogin ? (
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl">
                      <div className="text-center space-y-6">
                        <div className="space-y-2">
                          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                            <span className="text-2xl">🔑</span>
                          </div>
                          <h2 className="text-xl font-bold text-white">Kundenanmeldung</h2>
                          <p className="text-white/70 text-sm">
                            Melden Sie sich mit Ihrer Kundennummer an
                          </p>
                        </div>
                        
                        {customerLoginError && (
                          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3">
                            <p className="text-red-200 text-sm">{customerLoginError}</p>
                          </div>
                        )}
                        
                        <div className="space-y-4">
                          <div className="text-left">
                            <label className="block text-white/80 text-sm font-medium mb-2">
                              Kundennummer
                            </label>
                            <input
                              type="text"
                              placeholder="Ihre Kundennummer"
                              value={customerLoginData.customer_number}
                              onChange={(e) => setCustomerLoginData(prev => ({
                                ...prev,
                                customer_number: e.target.value
                              }))}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  customerLogin();
                                }
                              }}
                              className="w-full bg-white/10 border border-white/30 text-white placeholder-white/50 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-300"
                            />
                          </div>
                        </div>
                        
                        <div className="flex space-x-3">
                          <button 
                            onClick={() => {
                              setShowCustomerLogin(false);
                              setCustomerLoginError('');
                            }}
                            className="flex-1 bg-white/10 hover:bg-white/20 border border-white/30 text-white py-3 px-4 rounded-xl font-medium transition-all duration-300"
                          >
                            Zurück
                          </button>
                          <button 
                            onClick={customerLogin}
                            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-3 px-4 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg"
                          >
                            Anmelden
                          </button>
                        </div>
                        
                        <div className="space-y-4 pt-4 border-t border-white/20">
                          <p className="text-white/60 text-xs">
                            Noch nicht registriert?
                          </p>
                          <button 
                            onClick={() => {
                              setShowCustomerLogin(false);
                              setShowRegistration(true);
                            }}
                            className="w-full bg-white/5 hover:bg-white/10 border border-white/30 text-white py-3 px-4 rounded-xl font-medium transition-all duration-300"
                          >
                            Jetzt registrieren
                          </button>
                          
                          {/* WhatsApp Service Contact */}
                          <div className="bg-white/5 rounded-xl p-3">
                            <a 
                              href="https://wa.me/4917621105848?text=Hallo%20OUTLET34%20Team,%20ich%20habe%20Probleme%20bei%20der%20Anmeldung..." 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center justify-center space-x-3 bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 hover:scale-105 w-full"
                            >
                              <img 
                                src="/images/whatsapp-logo-dark.png" 
                                alt="WhatsApp Logo" 
                                className="w-5 h-5"
                              />
                              <span className="font-semibold">{t('navigation.service')}</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : showAdminLogin ? (
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl">
                      <div className="text-center space-y-6">
                        <div className="space-y-2">
                          <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto">
                            <span className="text-2xl">🔐</span>
                          </div>
                          <h2 className="text-xl font-bold text-white">Admin-Zugang</h2>
                          <p className="text-white/70 text-sm">
                            Sicherer Bereich für Administratoren
                          </p>
                        </div>
                        
                        {adminLoginError && (
                          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3">
                            <p className="text-red-200 text-sm">{adminLoginError}</p>
                          </div>
                        )}
                        
                        <div className="space-y-4">
                          <div className="text-left">
                            <label className="block text-white/80 text-sm font-medium mb-2">
                              Admin PIN
                            </label>
                            <input
                              type="password"
                              placeholder="••••"
                              value={adminPin}
                              onChange={(e) => setAdminPin(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  adminLogin();
                                }
                              }}
                              className="w-full bg-white/10 border border-white/30 text-white placeholder-white/50 py-3 px-4 rounded-xl text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                              maxLength="4"
                            />
                          </div>
                        </div>
                        
                        <div className="flex space-x-3">
                          <button 
                            onClick={() => {
                              setShowAdminLogin(false);
                              setAdminLoginError('');
                              setAdminPin('');
                            }}
                            className="flex-1 bg-white/10 hover:bg-white/20 border border-white/30 text-white py-3 px-4 rounded-xl font-medium transition-all duration-300"
                          >
                            Zurück
                          </button>
                          <button 
                            onClick={adminLogin}
                            disabled={!adminPin}
                            className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-3 px-4 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                          >
                            Anmelden
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : showRegistration ? (
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl">
                      <div className="text-center space-y-6">
                        <div className="space-y-2">
                          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                            <span className="text-2xl">📝</span>
                          </div>
                          <h2 className="text-xl font-bold text-white">Registrierung</h2>
                          <p className="text-white/70 text-sm">
                            Erstellen Sie Ihr kostenloses Kundenkonto
                          </p>
                        </div>
                        
                        {registrationError && (
                          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3">
                            <p className="text-red-200 text-sm">{registrationError}</p>
                          </div>
                        )}
                        
                        <div className="space-y-4 text-left">
                          <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">
                              Kundennummer
                            </label>
                            <input
                              type="text"
                              placeholder="Ihre Kundennummer"
                              value={registrationData.customer_number}
                              onChange={(e) => setRegistrationData(prev => ({
                                ...prev,
                                customer_number: e.target.value
                              }))}
                              className="w-full bg-white/10 border border-white/30 text-white placeholder-white/50 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">
                              E-Mail
                            </label>
                            <input
                              type="email"
                              placeholder="ihre@email.de"
                              value={registrationData.email}
                              onChange={(e) => setRegistrationData(prev => ({
                                ...prev,
                                email: e.target.value
                              }))}
                              className="w-full bg-white/10 border border-white/30 text-white placeholder-white/50 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">
                              Name
                            </label>
                            <input
                              type="text"
                              placeholder="Ihr vollständiger Name"
                              value={registrationData.name}
                              onChange={(e) => setRegistrationData(prev => ({
                                ...prev,
                                name: e.target.value
                              }))}
                              className="w-full bg-white/10 border border-white/30 text-white placeholder-white/50 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                            />
                          </div>
                        </div>
                        
                        <div className="flex space-x-3">
                          <button 
                            onClick={() => {
                              setShowRegistration(false);
                              setRegistrationError('');
                            }}
                            className="flex-1 bg-white/10 hover:bg-white/20 border border-white/30 text-white py-3 px-4 rounded-xl font-medium transition-all duration-300"
                          >
                            Zurück
                          </button>
                          <button 
                            onClick={registerCustomer}
                            disabled={!registrationData.customer_number || !registrationData.email || !registrationData.name}
                            className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white py-3 px-4 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                          >
                            Registrieren
                          </button>
                        </div>
                        
                        <div className="pt-4 border-t border-white/20">
                          <p className="text-white/60 text-xs mb-3">
                            Bereits registriert?
                          </p>
                          <button 
                            onClick={() => {
                              setShowRegistration(false);
                              setShowCustomerLogin(true);
                            }}
                            className="w-full bg-white/5 hover:bg-white/10 border border-white/30 text-white py-3 px-4 rounded-xl font-medium transition-all duration-300"
                          >
                            Jetzt anmelden
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Registration Call-to-Action Section */}
                      <div className="text-center space-y-4">
                        {/* Registration Call-to-Action Button */}
                        <div className="space-y-3">
                          <a 
                            href="https://www.outlet34fashion.com/registrieren" 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full bg-gradient-to-r from-pink-500/20 to-purple-600/20 hover:from-pink-500/30 hover:to-purple-600/30 border border-pink-400/30 hover:border-pink-400/50 text-white py-4 px-6 rounded-xl font-medium transition-all duration-300 hover:scale-105 text-center backdrop-blur-sm"
                          >
                            <div className="space-y-1">
                              <div className="text-sm font-semibold">
                                Neu bei OUTLET34?
                              </div>
                              <div className="text-xs text-white/70">
                                Jetzt registrieren
                              </div>
                            </div>
                          </a>
                          <p className="text-white/60 text-xs text-center leading-relaxed">
                            Registrieren Sie sich kostenlos und erleben Sie Live Shopping mit exklusiven Angeboten
                          </p>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="space-y-4">
                        {/* Primary Actions */}
                        <div className="flex space-x-3">
                          <button 
                            onClick={() => setShowRegistration(true)}
                            className="flex-1 bg-white/10 hover:bg-white/20 border border-white/30 text-white py-4 px-4 rounded-xl font-medium transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2"
                          >
                            <span className="text-lg">📝</span>
                            <span>{t('auth.register')}</span>
                          </button>
                          <button 
                            onClick={() => setShowCustomerLogin(true)}
                            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-4 px-4 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
                          >
                            <span className="text-lg">🔑</span>
                            <span>{t('auth.login')}</span>
                          </button>
                        </div>
                        
                        {/* WhatsApp Support - Modern Style */}
                        <div className="bg-white/5 rounded-xl p-3">
                          <a 
                            href="https://wa.me/4917621105848?text=Hallo%20OUTLET34%20Team,%20ich%20habe%20eine%20Frage%20zum%20Live%20Shopping..." 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-center space-x-3 bg-gradient-to-r from-green-500/80 to-emerald-600/80 hover:from-green-500 hover:to-emerald-600 border border-green-400/30 hover:border-green-400/50 text-white font-medium py-4 px-4 rounded-xl transition-all duration-300 hover:scale-105 w-full backdrop-blur-sm"
                          >
                            <img 
                              src="/images/whatsapp-logo-dark.png" 
                              alt="WhatsApp Logo" 
                              className="w-6 h-6"
                            />
                            <span className="font-semibold">{t('navigation.service')}</span>
                          </a>
                        </div>
                        
                        {/* Admin Access */}
                        <button 
                          onClick={() => setShowAdminLogin(true)}
                          className="w-full bg-white/5 hover:bg-white/10 border border-white/20 text-white/60 hover:text-white py-3 px-4 rounded-xl font-medium transition-all duration-300 text-sm flex items-center justify-center space-x-2"
                        >
                          <span className="text-sm">🔐</span>
                          <span>{t('auth.adminLogin')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Bottom Gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none"></div>
          </div>
        </div>
      )}

      {/* Main App - Only shown when authenticated */}
      {(isAuthenticated || isAdminView) && (
      <>
      {/* Header */}
      <header className="bg-pink-500 text-white">
        <div className="container mx-auto px-4 py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              {/* WhatsApp Support Button links - größeres Logo für Kunden */}
              {isAuthenticated && !isAdminView && (
                <a 
                  href="https://wa.me/4917621105848?text=Hallo%20OUTLET34%20Team,%20ich%20brauche%20Hilfe%20beim%20Live%20Shopping..." 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center p-2 text-white hover:bg-pink-600 rounded transition-colors duration-200"
                  title="WhatsApp Support"
                >
                  <img 
                    src="/images/whatsapp-logo-dark.png" 
                    alt="WhatsApp" 
                    className="w-6 h-6"
                  />
                </a>
              )}
              
              {/* Kalender Button neben WhatsApp für Kunden */}
              {isAuthenticated && !isAdminView && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowCalendar(true)}
                  className="text-white hover:bg-pink-600"
                  title="Live Shopping Kalender"
                >
                  📅 {t('navigation.calendar')}
                </Button>
              )}
            </div>
            
            {/* Profile Button rechts für authentifizierte Kunden */}
            {isAuthenticated && !isAdminView && (
              <button 
                onClick={() => setShowProfileModal(true)}
                className="w-8 h-8 rounded-full border-2 border-white hover:border-pink-200 transition-all duration-200 flex items-center justify-center"
                title={t('navigation.profile')}
              >
                {currentCustomer?.profile_image ? (
                  <img
                    src={currentCustomer.profile_image}
                    alt="Profil"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {currentCustomer?.name ? currentCustomer.name.charAt(0).toUpperCase() : '👤'}
                    </span>
                  </div>
                )}
              </button>
            )}
              
            <div className="flex space-x-2">
              {/* Only show view switcher for authenticated admin */}
              {isAdminAuthenticated && (
                <>
                  <Button 
                    variant={!isAdminView ? "secondary" : "ghost"} 
                    size="sm"
                    onClick={() => setIsAdminView(false)}
                    className={!isAdminView ? "bg-white text-pink-600" : "text-white hover:bg-pink-600"}
                  >
                    {t('admin.customerView')}
                  </Button>
                  <Button 
                    variant={isAdminView ? "secondary" : "ghost"} 
                    size="sm"
                    onClick={() => setIsAdminView(true)}
                    className={isAdminView ? "bg-white text-pink-600" : "text-white hover:bg-pink-600"}
                  >
                    {t('admin.adminView')}
                  </Button>
                  {/* Admin Logout Button */}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={adminLogout}
                    className="text-white hover:bg-red-600 border border-white/30 hover:border-red-400 transition-all duration-300"
                    title="Als Admin abmelden"
                  >
                    🚪 Abmelden
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>



        {/* Live Status Bar - Only show for customers, not admins */}
        {!isAdminView && (
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
        )}

        {/* Stream Title - Only show for customers, not admins */}
        {tickerSettings.enabled && !isAdminView && (
          <div className="bg-pink-500 py-3">
            <div className="container mx-auto px-4 text-center">
              <p className="text-white font-medium">{tickerSettings.text}</p>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        
        {/* Admin Dashboard - Organized in Collapsible Blocks */}
        {isAdminAuthenticated && isAdminView && (
          <div className="space-y-6">
            {/* Main Dashboard Header */}
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">📊 {t.adminDashboard}</h1>
              <p className="text-gray-600">Verwaltung und Übersicht für Administratoren</p>
            </div>

            {/* Admin Blocks Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Block 1: Live-Statistiken */}
            <Card className="border-l-4 border-l-green-500 shadow-lg">
              <CardContent className="p-0">
                <button
                  onClick={() => setShowStatistics(!showStatistics)}
                  className="w-full p-6 text-left bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-150 transition-all duration-300 flex justify-between items-center"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-lg">💰</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Live-Statistiken</h2>
                      <p className="text-gray-600 text-sm">Umsatz, Bestellungen und Verkaufszahlen</p>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {showStatistics ? '▼' : '▶'}
                  </div>
                </button>
                
                {showStatistics && (
                  <div className="p-6 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Gesamtumsatz */}
                      <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl p-6 text-center text-white shadow-lg">
                        <div className="text-3xl font-bold mb-2">
                          {(adminStats.total_revenue || 0).toLocaleString('de-DE')} €
                        </div>
                        <div className="text-sm opacity-90 font-medium">💰 Gesamtumsatz</div>
                        <div className="text-xs opacity-70 mt-1">Live-Statistik</div>
                      </div>
                      
                      {/* Verkaufte Artikel */}
                      <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-6 text-center text-white shadow-lg">
                        <div className="text-3xl font-bold mb-2">
                          {adminStats.total_items || 0}
                        </div>
                        <div className="text-sm opacity-90 font-medium">📦 Verkaufte Artikel</div>
                        <div className="text-xs opacity-70 mt-1">Gesamt Stückzahl</div>
                      </div>
                      
                      {/* Session Umsatz */}
                      <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl p-6 text-center text-white shadow-lg">
                        <div className="text-3xl font-bold mb-2">
                          {(adminStats.session_revenue || 0).toLocaleString('de-DE')} €
                        </div>
                        <div className="text-sm opacity-90 font-medium">🔥 Session Umsatz</div>
                        <div className="text-xs opacity-70 mt-1">Aktuelle Session</div>
                      </div>
                      
                      {/* Bestellungen */}
                      <div className="bg-gradient-to-br from-pink-400 to-purple-500 rounded-xl p-6 text-center text-white shadow-lg">
                        <div className="text-3xl font-bold mb-2">
                          {adminStats.total_orders || 0}
                        </div>
                        <div className="text-sm opacity-90 font-medium">📋 Bestellungen</div>
                        <div className="text-xs opacity-70 mt-1">Gesamtanzahl</div>
                      </div>
                    </div>
                    
                    {/* Reset Counter */}
                    <div className="text-center mt-6">
                      <Button 
                        onClick={resetOrderCounter}
                        className="bg-red-500 hover:bg-red-600 text-white px-8 py-3"
                      >
                        🔄 {t.resetCounter}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Block 2: Kundenverwaltung */}
            <Card className="border-l-4 border-l-blue-500 shadow-lg">
              <CardContent className="p-0">
                <button
                  onClick={() => setShowCustomerManagement(!showCustomerManagement)}
                  className="w-full p-6 text-left bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-150 transition-all duration-300 flex justify-between items-center"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-lg">👥</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Kundenverwaltung</h2>
                      <p className="text-gray-600 text-sm">Kunden erstellen, verwalten und bearbeiten ({customers.filter(c => {
                        // Filter by status
                        let matchesFilter = true;
                        if (customerFilter === 'pending') matchesFilter = c.activation_status === 'pending';
                        if (customerFilter === 'blocked') matchesFilter = c.activation_status === 'blocked';
                        
                        // Filter by search (customer number)
                        let matchesSearch = true;
                        if (customerSearch.trim()) {
                          matchesSearch = c.customer_number.toLowerCase().includes(customerSearch.toLowerCase());
                        }
                        
                        return matchesFilter && matchesSearch;
                      }).length} Kunden)</p>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {showCustomerManagement ? '▼' : '▶'}
                  </div>
                </button>
                
                {showCustomerManagement && (
                  <div className="p-6 border-t border-gray-200">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">
                          👥 Kundenverwaltung ({customers.filter(c => {
                            // Filter by status
                            let matchesFilter = true;
                            if (customerFilter === 'pending') matchesFilter = c.activation_status === 'pending';
                            if (customerFilter === 'blocked') matchesFilter = c.activation_status === 'blocked';
                            
                            // Filter by search (customer number)
                            let matchesSearch = true;
                            if (customerSearch.trim()) {
                              matchesSearch = c.customer_number.toLowerCase().includes(customerSearch.toLowerCase());
                            }
                            
                            return matchesFilter && matchesSearch;
                          }).length})
                        </h3>
                      </div>
                      
                      {/* Search Field */}
                      <div className="mb-4">
                        <Input
                          placeholder="🔍 Suche nach Kundennummer..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      
                      {/* Filter Buttons */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Button 
                          onClick={() => setShowCreateCustomer(true)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                        >
                          ➕ Kunde erstellen
                        </Button>
                        <Button 
                          onClick={() => setCustomerFilter('pending')}
                          className={customerFilter === 'pending' ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}
                          size="sm"
                        >
                          ⏳ Freigabe ({customers.filter(c => c.activation_status === 'pending').length})
                        </Button>
                        <Button 
                          onClick={() => setCustomerFilter('blocked')}
                          className={customerFilter === 'blocked' ? "bg-red-500 hover:bg-red-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}
                          size="sm"
                        >
                          🚫 Gesperrt ({customers.filter(c => c.activation_status === 'blocked').length})
                        </Button>
                        <Button 
                          onClick={() => setCustomerFilter('all')}
                          className={customerFilter === 'all' ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}
                          size="sm"
                        >
                          📋 Alle
                        </Button>
                        <Button 
                          onClick={loadCustomers}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-800"
                          size="sm"
                        >
                          🔄 Aktualisieren
                        </Button>
                      </div>
                      
                      <div className="space-y-3 max-h-64 overflow-y-auto bg-white rounded-lg p-3">
                        {customers.filter(customer => {
                          // Filter by status
                          let matchesFilter = true;
                          if (customerFilter === 'pending') matchesFilter = customer.activation_status === 'pending';
                          if (customerFilter === 'blocked') matchesFilter = customer.activation_status === 'blocked';
                          
                          // Filter by search (customer number)
                          let matchesSearch = true;
                          if (customerSearch.trim()) {
                            matchesSearch = customer.customer_number.toLowerCase().includes(customerSearch.toLowerCase());
                          }
                          
                          return matchesFilter && matchesSearch;
                        }).length === 0 ? (
                          <p className="text-gray-600 text-center py-4">
                            {customerSearch.trim() ? `Keine Kunden mit Nummer "${customerSearch}" gefunden` :
                             customerFilter === 'pending' ? 'Keine ausstehenden Kunden' :
                             customerFilter === 'blocked' ? 'Keine gesperrten Kunden' :
                             'Keine Kunden verfügbar'}
                          </p>
                        ) : (
                          customers.filter(customer => {
                            // Filter by status
                            let matchesFilter = true;
                            if (customerFilter === 'pending') matchesFilter = customer.activation_status === 'pending';
                            if (customerFilter === 'blocked') matchesFilter = customer.activation_status === 'blocked';
                            
                            // Filter by search (customer number)
                            let matchesSearch = true;
                            if (customerSearch.trim()) {
                              matchesSearch = customer.customer_number.toLowerCase().includes(customerSearch.toLowerCase());
                            }
                            
                            return matchesFilter && matchesSearch;
                          }).map((customer) => (
                            <div key={customer.id} className="bg-gray-100 rounded-lg p-3 border">
                              <div className="flex justify-between items-start">
                                <div className="flex items-start space-x-3">
                                  {/* Profile Image */}
                                  <div className="flex-shrink-0">
                                    {customer.profile_image ? (
                                      <img
                                        src={customer.profile_image}
                                        alt={customer.name}
                                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-300"
                                      />
                                    ) : (
                                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center border-2 border-gray-300">
                                        <span className="text-white text-lg font-bold">
                                          {customer.name ? customer.name.charAt(0).toUpperCase() : '👤'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  {/* Customer Info */}
                                  <div className="flex-1 min-w-0">
                                    {/* Customer Number First */}
                                    <div className="text-lg font-bold text-gray-800">
                                      #{customer.customer_number}
                                    </div>
                                    {/* Name Second */}
                                    <div className="font-medium text-gray-700">
                                      {customer.name}
                                    </div>
                                    {/* Email and date smaller */}
                                    <div className="text-sm text-gray-600">
                                      📧 {customer.email}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      📅 Registriert: {formatGermanDate(customer.created_at)}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex flex-col items-end space-y-2">
                                  <Badge 
                                    className={
                                      customer.activation_status === 'active' 
                                        ? "bg-green-500 text-white" 
                                        : customer.activation_status === 'pending'
                                        ? "bg-yellow-500 text-white"
                                        : "bg-red-500 text-white"
                                    }
                                  >
                                    {customer.activation_status === 'active' ? '✓ Aktiv' : 
                                     customer.activation_status === 'pending' ? '⏳ Wartend' : 
                                     '🚫 Gesperrt'}
                                  </Badge>
                                  
                                  <div className="flex space-x-1">
                                    {customer.activation_status === 'pending' && (
                                      <Button 
                                        onClick={() => activateCustomer(customer.id)}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        size="sm"
                                      >
                                        ✓
                                      </Button>
                                    )}
                                    
                                    {customer.activation_status === 'active' && (
                                      <Button 
                                        onClick={() => blockCustomer(customer.id)}
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                        size="sm"
                                      >
                                        🚫
                                      </Button>
                                    )}
                                    
                                    {customer.activation_status === 'blocked' && (
                                      <Button 
                                        onClick={() => activateCustomer(customer.id)}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        size="sm"
                                      >
                                        ✓
                                      </Button>
                                    )}
                                    
                                    <Button 
                                      onClick={() => deleteCustomer(customer.id)}
                                      className="bg-red-800 hover:bg-red-900 text-white"
                                      size="sm"
                                    >
                                      🗑️
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

        {/* Create Customer Modal */}
        {showCreateCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 text-center">
                    ➕ Neuen Kunde erstellen
                  </h3>
                  
                  {createCustomerError && (
                    <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                      <p className="text-red-700 text-sm">{createCustomerError}</p>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kundennummer *
                      </label>
                      <Input
                        type="text"
                        placeholder="z.B. TEST001"
                        value={newCustomerData.customer_number}
                        onChange={(e) => setNewCustomerData(prev => ({
                          ...prev,
                          customer_number: e.target.value
                        }))}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name *
                      </label>
                      <Input
                        type="text"
                        placeholder="Vollständiger Name"
                        value={newCustomerData.name}
                        onChange={(e) => setNewCustomerData(prev => ({
                          ...prev,
                          name: e.target.value
                        }))}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        E-Mail *
                      </label>
                      <Input
                        type="email"
                        placeholder="kunde@example.com"
                        value={newCustomerData.email}
                        onChange={(e) => setNewCustomerData(prev => ({
                          ...prev,
                          email: e.target.value
                        }))}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                      <p className="text-green-700 text-sm text-center">
                        ✓ Status wird automatisch auf <strong>"Aktiv"</strong> gesetzt
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setShowCreateCustomer(false);
                        setNewCustomerData({ customer_number: '', email: '', name: '' });
                        setCreateCustomerError('');
                      }}
                      className="flex-1"
                      disabled={creatingCustomer}
                    >
                      Abbrechen
                    </Button>
                    <Button 
                      onClick={createCustomerManually}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      disabled={creatingCustomer}
                    >
                      {creatingCustomer ? 'Erstellen...' : 'Kunde erstellen'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Block 3: Live-Streaming Controls */}
            <Card className="border-l-4 border-l-red-500 shadow-lg">
              <CardContent className="p-0">
                <button
                  onClick={() => setShowStreamingControls(!showStreamingControls)}
                  className="w-full p-6 text-left bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-150 transition-all duration-300 flex justify-between items-center"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-lg">🎥</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Live-Streaming</h2>
                      <p className="text-gray-600 text-sm">HD-Video-Streaming starten und verwalten</p>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {showStreamingControls ? '▼' : '▶'}
                  </div>
                </button>
                
                {showStreamingControls && (
                  <div className="p-6 border-t border-gray-200">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 text-gray-800">🎥 HD-Video-Streaming</h3>
                      <div className="text-center space-y-3">
                        <Button 
                          onClick={startSimpleStream}
                          className="bg-red-600 hover:bg-red-700 text-white w-full py-3 text-lg"
                        >
                          📺 HD Live-Stream starten
                        </Button>
                        <div className="text-sm text-gray-600">
                          Einfach • Stabil • Sofort funktionsfähig
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Block 4: Ticker-Einstellungen */}
            <Card className="border-l-4 border-l-purple-500 shadow-lg">
              <CardContent className="p-0">
                <button
                  onClick={() => setShowTickerSettings(!showTickerSettings)}
                  className="w-full p-6 text-left bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-150 transition-all duration-300 flex justify-between items-center"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-lg">⚙️</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Ticker-Einstellungen</h2>
                      <p className="text-gray-600 text-sm">Laufband-Text konfigurieren und verwalten</p>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {showTickerSettings ? '▼' : '▶'}
                  </div>
                </button>
                
                {showTickerSettings && (
                  <div className="p-6 border-t border-gray-200">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 text-gray-800">⚙️ Ticker-Einstellungen</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Ticker Text</label>
                          <Input
                            value={newTickerText}
                            onChange={(e) => setNewTickerText(e.target.value)}
                            className="w-full"
                            placeholder="Ticker Text eingeben..."
                          />
                        </div>
                        <div className="flex space-x-3">
                          <Button 
                            onClick={updateTicker}
                            className="bg-green-500 hover:bg-green-600 text-white flex-1"
                          >
                            📝 Ticker aktualisieren
                          </Button>
                          <Button 
                            onClick={toggleTicker}
                            className={tickerSettings.enabled ? "bg-orange-500 hover:bg-orange-600 text-white flex-1" : "bg-gray-500 hover:bg-gray-600 text-white flex-1"}
                          >
                            {tickerSettings.enabled ? "⏸️ Ticker Stop" : "▶️ Ticker Start"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Live Shopping Calendar Management (Admin) */}
        {isAdminAuthenticated && isAdminView && (
          <Card className="border-l-4 border-l-pink-500 shadow-lg mb-6">
            <CardContent className="p-0">
              <button
                onClick={() => setShowCalendarManagement(!showCalendarManagement)}
                className="w-full p-6 text-left bg-gradient-to-r from-pink-50 to-pink-100 hover:from-pink-100 hover:to-pink-150 transition-all duration-300 flex justify-between items-center"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">📅</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Live Shopping Kalender</h2>
                    <p className="text-gray-600 text-sm">Events erstellen und verwalten</p>
                  </div>
                </div>
                <div className="text-gray-400">
                  {showCalendarManagement ? '▼' : '▶'}
                </div>
              </button>
              
              {showCalendarManagement && (
                <div className="p-6 border-t border-gray-200">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">📅 Live Shopping Kalender</h3>
                      <Button 
                        onClick={() => {
                          setNewEventData({ date: '', time: '', title: '', description: '' });
                          setEventError('');
                          setShowCreateEvent(true);
                        }}
                        className="bg-pink-500 hover:bg-pink-600 text-white"
                      >
                        ➕ Event erstellen
                      </Button>
                    </div>
              
              {loadingEvents ? (
                <div className="text-center py-4">
                  <p className="text-gray-600">Events werden geladen...</p>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">Noch keine Events geplant</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => (
                    <div key={event.id} className="bg-white rounded-lg p-4 border-l-4 border-l-pink-500 border shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-4">
                            <div className="text-sm text-gray-500">
                              {formatEventDate(event.date)}
                            </div>
                            <div className="font-medium text-pink-600">
                              {event.time}
                            </div>
                            <div className="font-semibold text-gray-800">
                              {event.title}
                            </div>
                          </div>
                          {event.description && (
                            <div className="text-sm text-gray-600 mt-1">
                              {event.description}
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            onClick={() => openEditEvent(event)}
                            variant="outline"
                            size="sm"
                          >
                            ✏️ Bearbeiten
                          </Button>
                          <Button 
                            onClick={() => deleteEvent(event.id)}
                            className="bg-red-500 hover:bg-red-600 text-white"
                            size="sm"
                          >
                            🗑️ Löschen
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Block 6: Live Stream Management mit Live Ticker */}
        {isAdminAuthenticated && isAdminView && (
          <Card className="border-l-4 border-l-orange-500 shadow-lg mb-6">
            <CardContent className="p-0">
              <button
                onClick={() => setShowLiveStreamManagement(!showLiveStreamManagement)}
                className="w-full p-6 text-left bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-150 transition-all duration-300 flex justify-between items-center"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">📺</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Live Stream Management</h2>
                    <p className="text-gray-600 text-sm">Live Ticker und Stream-Überwachung</p>
                  </div>
                </div>
                <div className="text-gray-400">
                  {showLiveStreamManagement ? '▼' : '▶'}
                </div>
              </button>
              
              {showLiveStreamManagement && (
                <div className="p-6 border-t border-gray-200">
                  <div className="bg-gray-50 rounded-lg p-4 space-y-6">
                    
                    {/* Live Stream Status */}
                    <div className="bg-white rounded-lg p-4 border-l-4 border-l-orange-500">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        🔴 Live Stream Status
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">AKTIV</div>
                          <div className="text-sm text-gray-600">Stream Status</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">0</div>
                          <div className="text-sm text-gray-600">Aktive Zuschauer</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">00:00:00</div>
                          <div className="text-sm text-gray-600">Stream Dauer</div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-3 mt-4">
                        <Button 
                          onClick={startSimpleStream}
                          className="bg-red-600 hover:bg-red-700 text-white flex-1"
                        >
                          🔴 Stream starten
                        </Button>
                        <Button 
                          onClick={() => alert('Stream beenden')}
                          className="bg-gray-600 hover:bg-gray-700 text-white flex-1"
                        >
                          ⏹️ Stream beenden
                        </Button>
                      </div>
                    </div>

                    {/* Live Ticker Management */}
                    <div className="bg-white rounded-lg p-4 border-l-4 border-l-orange-500">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        📰 Live Ticker Management
                      </h3>
                      
                      {/* Current Ticker Display */}
                      <div className="bg-gray-100 rounded-lg p-3 mb-4">
                        <div className="text-sm text-gray-600 mb-1">Aktueller Ticker:</div>
                        <div className="font-medium text-gray-800">
                          {tickerSettings.text || 'Kein Ticker Text gesetzt'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Status: {tickerSettings.enabled ? 
                            <span className="text-green-600 font-medium">🟢 Aktiv</span> : 
                            <span className="text-red-600 font-medium">🔴 Inaktiv</span>
                          }
                        </div>
                      </div>
                      
                      {/* Ticker Controls */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ticker Text bearbeiten:
                          </label>
                          <Input
                            value={newTickerText}
                            onChange={(e) => setNewTickerText(e.target.value)}
                            className="w-full"
                            placeholder="Neuen Ticker Text eingeben..."
                          />
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button 
                            onClick={updateTicker}
                            className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                          >
                            💾 Ticker aktualisieren
                          </Button>
                          <Button 
                            onClick={toggleTicker}
                            className={tickerSettings.enabled ? 
                              "bg-red-600 hover:bg-red-700 text-white flex-1" : 
                              "bg-green-600 hover:bg-green-700 text-white flex-1"
                            }
                          >
                            {tickerSettings.enabled ? "⏸️ Ticker stoppen" : "▶️ Ticker starten"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-lg p-4 border-l-4 border-l-orange-500">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        ⚡ Quick Actions
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Button 
                          onClick={() => {
                            setNewTickerText('🔥 LIVE SHOPPING JETZT! Exklusive Angebote nur heute!');
                            updateTicker();
                          }}
                          className="bg-pink-600 hover:bg-pink-700 text-white"
                        >
                          🔥 Standard Live Ticker
                        </Button>
                        <Button 
                          onClick={() => {
                            setNewTickerText('🎉 OUTLET34 - Ihr Modegroßhandel! Jetzt live dabei sein!');
                            updateTicker();
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          🎉 Willkommens Ticker
                        </Button>
                        <Button 
                          onClick={() => {
                            setNewTickerText('⏰ Nur noch wenige Minuten! Sichere dir die besten Deals!');
                            updateTicker();
                          }}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white"
                        >
                          ⏰ Countdown Ticker
                        </Button>
                        <Button 
                          onClick={() => {
                            setNewTickerText('');
                            updateTicker();
                          }}
                          className="bg-gray-600 hover:bg-gray-700 text-white"
                        >
                          🗑️ Ticker löschen
                        </Button>
                        <Button 
                          onClick={resetOrderCounter}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          🔄 Session Reset
                        </Button>
                        <Button 
                          onClick={() => {
                            loadAllOrders();
                            loadAdminStats();
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          🔃 Daten aktualisieren
                        </Button>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
            </div>
          </div>
        )}

        {/* Profile Modal */}
        {showProfileModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 text-center">
                    {t('customer.profile.title')}
                  </h3>
                  
                  {/* Profile Image */}
                  <div className="flex justify-center">
                    {currentCustomer?.profile_image ? (
                      <img
                        src={currentCustomer.profile_image}
                        alt="Profilbild"
                        className="w-24 h-24 rounded-full object-cover border-4 border-pink-200"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-pink-200">
                        <span className="text-gray-600 text-2xl font-bold">
                          MCD
                        </span>
                        <span className="text-yellow-500 text-sm absolute mt-8">60s</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Customer Information */}
                  <div className="text-center space-y-2">
                    <div className="text-xl font-bold text-pink-600">
                      {currentCustomer?.name || 'Kunde'} 
                    </div>
                    <div className="text-sm text-gray-600">
                      #{getCustomerNumber()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {currentCustomer?.email}
                    </div>
                  </div>
                  
                  {/* Profile Image Upload */}
                  <div className="flex justify-center space-x-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const customerNumber = currentCustomer?.customer_number || localStorage.getItem('customerNumber') || '10299';
                          console.log('Uploading for customer:', customerNumber);
                          uploadProfileImage(customerNumber, e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      id="profile-modal-upload"
                    />
                    <label
                      htmlFor="profile-modal-upload"
                      className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                    >
                      📷 {t('customer.profile.uploadImage')}
                    </label>
                    {currentCustomer?.profile_image && (
                      <button
                        onClick={() => {
                          const customerNumber = currentCustomer?.customer_number || localStorage.getItem('customerNumber') || '10299';
                          console.log('Deleting for customer:', customerNumber);
                          deleteProfileImage(customerNumber);
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                      >
                        🗑️ {t('customer.profile.deleteImage')}
                      </button>
                    )}
                  </div>
                  
                  {/* Language Selection */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3 text-center">
                      🌍 {t('customer.profile.language')}
                    </h4>
                    <div className="flex justify-center space-x-1">
                      <button
                        onClick={() => changeLanguage('de')}
                        className={`px-3 py-2 rounded text-sm ${
                          i18n.language === 'de' 
                            ? 'bg-pink-500 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="Deutsch"
                      >
                        🇩🇪
                      </button>
                      <button
                        onClick={() => changeLanguage('en')}
                        className={`px-3 py-2 rounded text-sm ${
                          i18n.language === 'en' 
                            ? 'bg-pink-500 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="English"
                      >
                        🇺🇸
                      </button>
                      <button
                        onClick={() => changeLanguage('tr')}
                        className={`px-3 py-2 rounded text-sm ${
                          i18n.language === 'tr' 
                            ? 'bg-pink-500 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="Türkçe"
                      >
                        🇹🇷
                      </button>
                      <button
                        onClick={() => changeLanguage('fr')}
                        className={`px-3 py-2 rounded text-sm ${
                          i18n.language === 'fr' 
                            ? 'bg-pink-500 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="Français"
                      >
                        🇫🇷
                      </button>
                    </div>
                  </div>
                  
                  {/* Logout and Close Buttons */}
                  <div className="grid grid-cols-1 gap-3 pt-4">
                    <Button 
                      onClick={() => {
                        if (isAdminAuthenticated) {
                          adminLogout();
                        } else {
                          customerLogout();
                        }
                        setShowProfileModal(false);
                      }}
                      className="w-full bg-red-500 hover:bg-red-600 text-white"
                    >
                      🚪 {t('auth.logout')}
                    </Button>
                    <Button 
                      onClick={() => setShowProfileModal(false)}
                      className="w-full bg-gray-500 hover:bg-gray-600 text-white"
                    >
                      {t('common.close')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Video Stream Area - Simple Live Stream Solution */}
          <div className="lg:col-span-2">
            <SimpleLiveStream 
              isHost={isAdminView}
              nextEvent={getNextEvent()}
            />
          </div>

          {/* Order Section - Only for Customers - MOVED UP */}
          {selectedProduct && !isAdminView && (
            <div className="space-y-4">
              {/* Order Form */}
              <Card className="max-w-sm mx-auto">
                <CardContent className="p-3">
                <div className="text-center space-y-3">
                  {/* Größe und Händlerpreis in einer Zeile */}
                  <div className="flex justify-between items-center">
                    <div className="text-left">
                      <div className="text-xs text-gray-600">{t('orders.size')}</div>
                      <div className="font-bold text-pink-600 text-lg">{selectedSize}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-600">Händlerpreis</div>
                      <div className="font-bold text-pink-600 text-lg">
                        {selectedPrice.toFixed(2)} €
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center space-x-3">
                    <span className="text-sm">{t('orders.quantity')}</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="h-7 w-7 p-0"
                    >
                      -
                    </Button>
                    <span className="font-medium text-sm w-8 text-center">{quantity}</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setQuantity(quantity + 1)}
                      className="h-7 w-7 p-0"
                    >
                      +
                    </Button>
                  </div>
                  <Button 
                    onClick={placeOrder}
                    className="w-full bg-pink-500 hover:bg-pink-600 text-white py-2 text-sm"
                  >
                    🛒 {t.order}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    Alle Preise netto, zzgl. Versand*
                  </p>
                </div>
              </CardContent>
              </Card>

              {/* Last Order Block + Top 3 Käufer - Combined */}
              <Card className="max-w-sm mx-auto">
                <CardContent className="p-3">
                  <div className="space-y-4">
                    {/* Deine letzte Bestellung - auf/zuklappbar */}
                    <div className="space-y-2">
                      <button
                        onClick={() => setShowLastOrder(!showLastOrder)}
                        className="w-full flex items-center justify-between p-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-lg border border-blue-200 transition-all duration-300"
                      >
                        <h3 className="font-semibold text-blue-600 text-sm flex items-center">
                          📦 Deine letzte Bestellung
                        </h3>
                        <div className="text-blue-400">
                          {showLastOrder ? '▼' : '▶'}
                        </div>
                      </button>

                      {showLastOrder && (
                        <div className="space-y-2">
                          {loadingLastOrder ? (
                            <div className="text-center py-2">
                              <div className="text-xs text-gray-600">Lädt...</div>
                            </div>
                          ) : customerLastOrder ? (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-200">
                              {/* Gleiche Format wie in Bestellungen-Liste für Konsistenz */}
                              <div className="flex justify-between items-center">
                                <div className="font-medium text-gray-800">
                                  {currentCustomer?.customer_number || 'N/A'} | {customerLastOrder.size} | {customerLastOrder.quantity} | {(customerLastOrder.price / customerLastOrder.quantity).toFixed(2).replace('.', ',')} €
                                </div>
                                <div className="text-xs text-gray-500 ml-3 whitespace-nowrap">
                                  {formatGermanDateTime(customerLastOrder.timestamp || customerLastOrder.formatted_time)}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-xl">
                              <div className="text-2xl mb-2">📦</div>
                              <div className="text-xs">
                                Noch keine Bestellungen<br/>
                                Bestellen Sie jetzt Ihren ersten Artikel!
                              </div>
                              {isAdminView && currentCustomer && (
                                <div className="text-xs text-blue-500 mt-2">
                                  Debug: Kunde #{currentCustomer.customer_number}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Trennlinie */}
                    <div className="border-t border-gray-200"></div>

                    {/* Top 3 Käufer - auf/zuklappbar */}
                    <div className="space-y-3">
                      <button
                        onClick={() => setShowTopBuyers(!showTopBuyers)}
                        className="w-full flex items-center justify-between p-2 bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 rounded-lg border border-pink-200 transition-all duration-300"
                      >
                        <h3 className="font-bold text-sm text-pink-600 flex items-center">
                          🏆 TOP 3 KÄUFER 🏆
                        </h3>
                        <div className="text-pink-400">
                          {showTopBuyers ? '▼' : '▶'}
                        </div>
                      </button>

                      {showTopBuyers && (
                        <div className="space-y-2">
                          {getTop3Buyers().map((buyer, index) => (
                            <div key={buyer.customerNumber} className={`p-3 rounded-xl border-2 shadow-sm ${
                              index === 0 ? 'bg-gradient-to-r from-pink-100 to-pink-200 border-pink-400' :
                              index === 1 ? 'bg-gradient-to-r from-purple-100 to-purple-200 border-purple-400' :
                              'bg-gradient-to-r from-indigo-100 to-indigo-200 border-indigo-400'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  {/* Medal Icon */}
                                  <div className="text-xl">
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                  </div>
                                  
                                  <div>
                                    <div className="font-bold text-sm text-gray-800">
                                      Kunde #{buyer.customerNumber.length > 8 ? 
                                        buyer.customerNumber.slice(-6) : 
                                        buyer.customerNumber}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {buyer.totalItems} Artikel
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Rank Badge */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                  index === 0 ? 'bg-pink-500' :
                                  index === 1 ? 'bg-purple-500' :
                                  'bg-indigo-500'
                                }`}>
                                  #{index + 1}
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {getTop3Buyers().length === 0 && (
                            <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-xl">
                              <div className="text-3xl mb-2">🚀</div>
                              <div className="text-xs">
                                Seien Sie der erste Top-Käufer!<br/>
                                Bestellen Sie jetzt und sichern Sie sich Platz #1!
                              </div>
                            </div>
                          )}

                          {/* Motivations-Text für aktuellen Kunden */}
                          {currentCustomer && getTop3Buyers().length > 0 && (
                            <div className="mt-3 p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-200">
                              <div className="text-xs text-center text-pink-700">
                                {getTop3Buyers().some(buyer => buyer.customerNumber === currentCustomer.customer_number) ? (
                                  <>🎉 <strong>Sie sind in den Top 3!</strong> Halten Sie Ihre Position! 💪</>
                                ) : (
                                  <>⚡ <strong>Jetzt bestellen</strong> und in die Top 3 aufsteigen! 🏆</>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Split View - Chat and Orders */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {/* Tab Header */}
                <div className="grid grid-cols-2 bg-gray-100">
                  <button
                    onClick={() => setActiveView('orders')}
                    className={`py-3 px-4 text-center font-medium transition-colors ${
                      activeView === 'orders'
                        ? 'bg-pink-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    📋 Bestellungen
                  </button>
                  <button
                    onClick={() => setActiveView('chat')}
                    className={`py-3 px-4 text-center font-medium transition-colors ${
                      activeView === 'chat'
                        ? 'bg-pink-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    💬 Chat
                  </button>
                </div>

                {/* Tab Content */}
                <div className="p-4">
                  {activeView === 'orders' ? (
                    /* Orders View */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold flex items-center">
                          <ShoppingCart className="mr-2" size={20} />
                          Bestellungen
                        </h3>
                      </div>
                      
                      {/* Orders List - Alle Bestellungen von allen Kunden */}
                      <div className="h-64 overflow-y-auto bg-gray-50 rounded p-3 space-y-2">
                        {loadingOrders ? (
                          <div className="text-center text-gray-500 py-8">
                            Bestellungen werden geladen...
                          </div>
                        ) : allOrders.length > 0 ? (
                          allOrders
                            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // Neueste zuerst
                            .map((order) => (
                            <div key={order.id} className="text-sm bg-white rounded-lg p-3 border-l-4 border-pink-500 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-center">
                                <div className="font-medium text-gray-800">
                                  {order.customer_id || 'N/A'} | {order.size || 'N/A'} | {order.quantity || 1} | {((order.price || 0) / (order.quantity || 1)).toFixed(2).replace('.', ',')} €
                                </div>
                                <div className="text-xs text-gray-500 ml-3 whitespace-nowrap">
                                  {formatGermanDateTime(order.timestamp)}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-gray-500 py-8">
                            Noch keine Bestellungen vorhanden
                            <div className="text-xs mt-2">
                              <button 
                                onClick={loadAllOrders}
                                className="text-pink-500 hover:text-pink-600 underline"
                              >
                                Neu laden
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Chat View */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold flex items-center">
                          <MessageCircle className="mr-2" size={20} />
                          {t.welcomeMessage}
                        </h3>
                      </div>

                      {/* Gepinnte Nachrichten */}
                      {pinnedMessages.length > 0 && (
                        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 mb-3">
                          <div className="flex items-center mb-2">
                            <span className="text-yellow-600 font-semibold text-sm">📌 GEPINNTE NACHRICHTEN</span>
                          </div>
                          <div className="space-y-2">
                            {pinnedMessages.map((msg) => (
                              <div key={`pinned-${msg.id}`} className="bg-yellow-100 rounded p-2 border-l-4 border-yellow-500">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-yellow-800 text-sm">
                                      {formatMessage(msg.message)}
                                    </div>
                                    <div className="text-xs text-yellow-600 mt-1">
                                      📍 Gepinnt • {formatGermanTime(msg.timestamp || Date.now())}
                                    </div>
                                  </div>
                                  {isAdminView && (
                                    <button
                                      onClick={() => unpinMessage(msg.id)}
                                      className="ml-2 text-yellow-600 hover:text-yellow-800 text-xs"
                                      title="Nachricht entpinnen"
                                    >
                                      📌❌
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Chat Messages */}
                      <div 
                        ref={chatRef}
                        className="h-64 overflow-y-auto bg-gray-50 rounded p-3 space-y-2"
                      >
                        {chatMessages
                          .filter(msg => !msg.message.includes('Bestellung'))
                          .map((msg) => (
                            <div key={msg.id} className={`text-sm ${isPinned(msg.id) ? 'opacity-60' : ''}`}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  {msg.username === 'System' ? (
                                <div className="text-gray-600 font-medium">
                                  {formatMessage(msg.message)}
                                </div>
                              ) : msg.username === 'Admin' ? (
                                <div>
                                  <span className="font-bold text-red-600">
                                    👑 Admin {msg.emoji && <span className="ml-1">{msg.emoji}</span>}
                                  </span>
                                  {msg.message && (
                                    <span className="ml-2 text-gray-600">{msg.message}</span>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <span className="font-medium text-blue-600">
                                    #{extractCustomerNumber(msg.username)} {msg.emoji && <span className="ml-1">{msg.emoji}</span>}
                                  </span>
                                  {msg.message && (
                                    <span className="ml-2 text-gray-600">{msg.message}</span>
                                  )}
                                </div>
                              )}
                                </div>
                                
                                {/* Pin-Button für Admins */}
                                {isAdminView && (
                                  <div className="ml-2 flex space-x-1">
                                    {!isPinned(msg.id) ? (
                                      <button
                                        onClick={() => pinMessage(msg.id)}
                                        className="text-gray-400 hover:text-yellow-600 text-xs px-1"
                                        title="Nachricht pinnen"
                                      >
                                        📌
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => unpinMessage(msg.id)}
                                        className="text-yellow-600 hover:text-red-600 text-xs px-1"
                                        title="Nachricht entpinnen"
                                      >
                                        📌❌
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {/* Zeitstempel */}
                              <div className="text-xs text-gray-500 mt-1">
                                {formatGermanTime(msg.timestamp || Date.now())}
                                {isPinned(msg.id) && <span className="ml-1 text-yellow-600">📍</span>}
                              </div>
                            </div>
                          ))}
                      </div>

                      {/* Chat Input */}
                      <div className="space-y-3">
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
                            className="bg-pink-500 hover:bg-pink-600 text-white px-4"
                            size="sm"
                          >
                            Senden
                          </Button>
                        </div>

                        {/* Quick Action Buttons - Only for Admin */}
                        {isAdminView && (
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
                        )}

                        {/* Emoji Reactions - For all users */}
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
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Product Selection Area - Only for Admin */}
        {selectedProduct && isAdminView && (
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
                    {priceOptions.map((price) => (
                      <Button
                        key={price}
                        variant={selectedPrice === parseFloat(price.replace(',', '.').replace(' €', '')) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePriceSelect(price)}
                        className={selectedPrice === parseFloat(price.replace(',', '.').replace(' €', '')) ? "bg-pink-500 text-white" : "text-xs hover:bg-pink-50"}
                      >
                        {price}
                      </Button>
                    ))}
                  </div>
                  <Input 
                    placeholder="Manuell" 
                    className="mt-2"
                    type="number"
                    step="0.01"
                    value={selectedPrice}
                    onChange={(e) => setSelectedPrice(parseFloat(e.target.value) || 0)}
                  />
                  <Button 
                    className="w-full mt-2 text-sm"
                    variant="outline"
                    onClick={() => setSelectedPrice(selectedProduct?.price || 0)}
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
      </div>
      </>
      )}

      {/* Create Event Modal */}
      {showCreateEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📅 Neues Event erstellen</h3>
              
              {eventError && (
                <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
                  <p className="text-red-700 text-sm">{eventError}</p>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
                  <Input
                    type="date"
                    value={newEventData.date}
                    onChange={(e) => setNewEventData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zeit *</label>
                  <Input
                    type="time"
                    value={newEventData.time}
                    onChange={(e) => setNewEventData(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
                  <Input
                    type="text"
                    placeholder="z.B. Sale und aktuelle Ware"
                    value={newEventData.title}
                    onChange={(e) => setNewEventData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                  <Input
                    type="text"
                    placeholder="Zusätzliche Details (optional)"
                    value={newEventData.description}
                    onChange={(e) => setNewEventData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <Button 
                  variant="outline"
                  onClick={() => setShowCreateEvent(false)}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button 
                  onClick={createEvent}
                  className="flex-1 bg-pink-500 hover:bg-pink-600 text-white"
                >
                  Event erstellen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📅 Event bearbeiten</h3>
              
              {eventError && (
                <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
                  <p className="text-red-700 text-sm">{eventError}</p>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
                  <Input
                    type="date"
                    value={newEventData.date}
                    onChange={(e) => setNewEventData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zeit *</label>
                  <Input
                    type="time"
                    value={newEventData.time}
                    onChange={(e) => setNewEventData(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
                  <Input
                    type="text"
                    placeholder="z.B. Sale und aktuelle Ware"
                    value={newEventData.title}
                    onChange={(e) => setNewEventData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                  <Input
                    type="text"
                    placeholder="Zusätzliche Details (optional)"
                    value={newEventData.description}
                    onChange={(e) => setNewEventData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowEditEvent(false);
                    setCurrentEvent(null);
                  }}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button 
                  onClick={updateEvent}
                  className="flex-1 bg-pink-500 hover:bg-pink-600 text-white"
                >
                  Event aktualisieren
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customer Calendar Modal */}
      {showCalendar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-4 md:p-6">
              {/* Mobile-optimized Header */}
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg md:text-xl font-semibold text-gray-800 pr-2">
                  📅 Live Shopping Kalender
                </h3>
                
                {/* Close Button - Always visible and prominent */}
                <Button 
                  variant="ghost"
                  onClick={() => setShowCalendar(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl p-2 min-w-[40px] flex-shrink-0"
                  title="Schließen"
                >
                  ✕
                </Button>
              </div>

              {/* Notification Button - Mobile friendly placement */}
              {!notificationsEnabled && (
                <div className="mb-4">
                  <Button 
                    onClick={requestNotificationPermission}
                    className="bg-green-500 hover:bg-green-600 text-white text-sm w-full md:w-auto"
                    size="sm"
                  >
                    🔔 Erinnerungen aktivieren
                  </Button>
                </div>
              )}
              
              {loadingEvents ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Kalender wird geladen...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 mb-2">📅 Keine kommenden Live Shopping Events geplant.</p>
                      <p className="text-sm text-gray-500">Schauen Sie bald wieder vorbei für neue Events!</p>
                      {notificationsEnabled && (
                        <p className="text-xs text-green-600 mt-2">
                          🔔 Sie werden über neue Events benachrichtigt
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="mb-6">
                        <h4 className="text-lg font-medium text-gray-800 mb-4">Kommende Live Shopping Events:</h4>
                      </div>
                      
                      {events.map((event, index) => {
                        const eventDateTime = new Date(event.date + 'T' + event.time);
                        const now = new Date();
                        const isToday = eventDateTime.toDateString() === now.toDateString();
                        const isUpcoming = eventDateTime > now;
                        
                        return (
                          <div key={event.id} className={`border rounded-lg p-4 transition-colors ${
                            isToday ? 'bg-pink-50 border-pink-300' : 
                            isUpcoming ? 'hover:bg-gray-50' : 'opacity-50'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-4 mb-2">
                                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    isToday ? 'bg-pink-500 text-white' : 'bg-pink-100 text-pink-800'
                                  }`}>
                                    {formatEventDate(event.date)}
                                  </div>
                                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                                    isToday ? 'bg-pink-600 text-white' : 'bg-pink-500 text-white'
                                  }`}>
                                    {event.time}
                                  </div>
                                  {isToday && (
                                    <span className="animate-pulse text-pink-600 font-bold text-xs">
                                      🔴 HEUTE LIVE!
                                    </span>
                                  )}
                                </div>
                                
                                <h5 className="text-lg font-semibold text-gray-800 mb-1">
                                  {event.title}
                                </h5>
                                
                                {event.description && (
                                  <p className="text-gray-600 text-sm">
                                    {event.description}
                                  </p>
                                )}
                              </div>
                              
                              <div className="ml-4 text-2xl">
                                {isToday ? '🔴' : index === 0 ? '⭐' : '📅'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      <div className="mt-6 pt-4 border-t text-center">
                        <p className="text-sm text-gray-500">
                          💡 Verpassen Sie keine Live Shopping Events! Besuchen Sie uns zur angegebenen Zeit.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* WebRTC Streaming Modal */}
      {showStreaming && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-6xl max-h-[90vh] overflow-auto">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {streamingMode === 'streamer' ? '🎥 Live-Stream' : '📺 Live-Stream ansehen'}
                </h2>
                <Button
                  onClick={() => {
                    setShowStreaming(false);
                    handleStreamEnd();
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </Button>
              </div>

              <StreamingInterface
                isStreamer={streamingMode === 'streamer'}
                streamId={currentStreamId}
                onStreamEnd={handleStreamEnd}
                backendUrl={BACKEND_URL}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Live Stream Integration for Customers */}
      {isAuthenticated && !isAdminView && !showSimpleStream && (
        <div className="container mx-auto px-4 py-4">
          {/* Embedded Live Stream Section */}
          <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 rounded-2xl p-6 mb-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-500 px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                  🔴 LIVE STREAM
                </div>
                <div className="text-sm opacity-90">
                  👥 {Math.floor(Math.random() * 50) + 15} Zuschauer online
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-90">OUTLET34 Fashion Store</div>
                <div className="text-xs opacity-75">Jetzt live • HD Qualität</div>
              </div>
            </div>

            {/* Embedded Live Stream Video */}
            <div className="bg-black rounded-xl overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
              <SimpleVideoStreaming
                isAdmin={false}
                currentUser={currentCustomer}
                onClose={() => {}}
                embedded={true}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-1">🛍️ Live Shopping Event</h3>
                <p className="text-sm opacity-90">
                  Exklusive Fashion Angebote • Live Beratung • Sofort bestellen
                </p>
              </div>
              <button 
                onClick={() => setShowSimpleStream(true)}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
              >
                💬 Vollbild & Chat
              </button>
            </div>
          </div>

          {/* Additional Customer Content */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                🎥 Live Shopping Funktionen
              </h3>
            </div>
            <div className="text-sm text-gray-600 space-y-2">
              <p>🔥 <strong>Live Video:</strong> Sehen Sie Produkte in Echtzeit</p>
              <p>💬 <strong>Live Chat:</strong> Stellen Sie direkt Fragen</p>
              <p>🛒 <strong>Sofort bestellen:</strong> Produkte während dem Stream kaufen</p>
              <p>📱 <strong>Mobile optimiert:</strong> Perfekt für iPhone und Android</p>
            </div>
          </div>
        </div>
      )}

      {/* Legacy Active Streams List for Customers (Backward Compatibility) */}
      {isAuthenticated && !isAdminView && !showStreaming && !showSimpleStream && (
        <div className="mt-6" style={{display: 'none'}}> {/* Hidden but kept for compatibility */}
          <StreamsList
            onJoinStream={joinWebRTCStream}
            backendUrl={BACKEND_URL}
          />
        </div>
      )}

      {/* Simple Video Streaming Modal */}
      {showSimpleStream && (
        <SimpleVideoStreaming
          isAdmin={isAdminAuthenticated}
          currentUser={currentCustomer}
          onClose={handleSimpleStreamClose}
        />
      )}
    </div>
  );
}

export default App;