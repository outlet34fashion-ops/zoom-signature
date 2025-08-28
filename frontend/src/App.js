import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import axios from 'axios';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Heart, Bell, ShoppingCart, Send, Users, Clock, MessageCircle } from 'lucide-react';
import ZoomLiveStream from './components/ZoomLiveStream';
import SimpleLiveStream from './components/SimpleLiveStream';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace(/^https?:\/\//, 'wss://');

function App() {
  const [language, setLanguage] = useState('de');
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
  const [adminStats, setAdminStats] = useState({ total_orders: 0, session_orders: 0 });
  const [showCustomerLogin, setShowCustomerLogin] = useState(false);
  const [customerLoginData, setCustomerLoginData] = useState({ customer_number: '' });
  const [customerLoginError, setCustomerLoginError] = useState('');
  const [activeView, setActiveView] = useState('chat'); // 'chat' or 'orders'
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
      selectPrice: 'Preis auswählen',
      tickerSettings: 'Ticker Einstellungen',
      tickerText: 'Ticker Text',
      updateTicker: 'Ticker aktualisieren',
      enableTicker: 'Ticker aktivieren'
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
      selectPrice: 'Select Price',
      tickerSettings: 'Ticker Settings',
      tickerText: 'Ticker Text',
      updateTicker: 'Update Ticker',
      enableTicker: 'Enable Ticker'
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
    }
  }, [isAdminView]);

  useEffect(() => {
    // Load customer's last order when customer changes
    if (currentCustomer?.customer_number && isAuthenticated && !isAdminView) {
      loadCustomerLastOrder(currentCustomer.customer_number);
    }
  }, [currentCustomer?.customer_number, isAuthenticated, isAdminView]);

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
    setAdminLoginError('');
    
    if (adminPin === '1924') {
      setIsAdminAuthenticated(true);
      setIsAdminView(true);
      setIsAuthenticated(true);
      setShowAdminLogin(false);
      setAdminPin('');
      
      // Store admin session
      localStorage.setItem('adminSession', 'true');
    } else {
      setAdminLoginError('Falscher PIN. Bitte versuchen Sie es erneut.');
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
      await axios.post(`${API}/admin/customers/create`, newCustomerData);
      
      // Reset form and close modal
      setNewCustomerData({ customer_number: '', email: '', name: '' });
      setShowCreateCustomer(false);
      setCreateCustomerError('');
      
      // Refresh customer list
      loadCustomers();
      
      // Send admin notification
      await sendAdminNotification(`Neuer Kunde manuell erstellt: ${newCustomerData.name} (${newCustomerData.customer_number}) - Status: Aktiv`);
      
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
    if (!customerNumber || customerNumber === 'undefined' || customerNumber === '10299') {
      return; // Skip for invalid or fallback customer numbers
    }
    
    try {
      setLoadingLastOrder(true);
      const response = await axios.get(`${API}/customers/${customerNumber}/last-order`);
      
      if (response.data.has_order) {
        setCustomerLastOrder(response.data.order);
      } else {
        setCustomerLastOrder(null);
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
      
      // Place the order first
      await axios.post(`${API}/orders`, {
        customer_id: actualCustomerId,
        product_id: selectedProduct.id,
        size: selectedSize,
        quantity: quantity,
        price: selectedPrice
      });

      // Automatic customer number detection - try all available sources
      let customerDisplayNumber = getCustomerNumber();
      
      // Send formatted order message to chat with bold "Bestellung"
      const orderChatMessage = `**Bestellung** ${customerDisplayNumber} I ${quantity}x I ${selectedPrice.toFixed(2)} I ${selectedSize}`;
      
      // Send order message to chat via API
      await axios.post(`${API}/chat`, {
        username: 'System',
        message: orderChatMessage,
        emoji: ''
      });

      // Reload customer's last order to update the display
      if (actualCustomerId && actualCustomerId !== '10299') {
        loadCustomerLastOrder(actualCustomerId);
      }

    } catch (error) {
      console.error('Error placing order:', error);
    }
  };

  const resetOrderCounter = async () => {
    try {
      await axios.post(`${API}/admin/reset-counter`);
      setAdminStats(prev => ({ ...prev, session_orders: 0 }));
    } catch (error) {
      console.error('Error resetting counter:', error);
    }
  };

  const priceOptions = ['5,00 €', '6,90 €', '7,50 €', '8,50 €', '9,00 €', '9,90 €', '11,50 €', '12,90 €', '15,90 €', '18,90 €'];

  const handlePriceSelect = (priceStr) => {
    const price = parseFloat(priceStr.replace(',', '.').replace(' €', ''));
    setSelectedPrice(price);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Guest Registration/Blocking Screen */}
      {!isAuthenticated && !isAdminView && (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-400 to-purple-600">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <h1 className="text-2xl font-bold text-gray-800">OUTLET34 Live Shopping</h1>
                
                {customerStatus === 'pending' ? (
                  <div className="space-y-4">
                    <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
                      <h2 className="text-lg font-semibold text-yellow-800 mb-2">
                        Anmeldung eingegangen ✓
                      </h2>
                      <p className="text-yellow-700">
                        Ihre Registrierung wird derzeit geprüft. Sie werden aktiviert, sobald die Prüfung abgeschlossen ist.
                      </p>
                    </div>
                    
                    {currentCustomer && (
                      <div className="text-left bg-gray-50 rounded-lg p-4">
                        <p><strong>Kundennummer:</strong> {currentCustomer.customer_number || 'N/A'}</p>
                        <p><strong>Name:</strong> {currentCustomer.name || 'N/A'}</p>
                        <p><strong>E-Mail:</strong> {currentCustomer.email || 'N/A'}</p>
                      </div>
                    )}
                    
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        localStorage.removeItem('customerNumber');
                        setCurrentCustomer(null);
                        setCustomerStatus(null);
                      }}
                      className="w-full"
                    >
                      Andere Kundennummer verwenden
                    </Button>
                  </div>
                ) : customerStatus === 'blocked' ? (
                  <div className="space-y-4">
                    <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                      <h2 className="text-lg font-semibold text-red-800 mb-2">
                        Konto gesperrt ⚠️
                      </h2>
                      <p className="text-red-700">
                        Ihr Kundenkonto wurde gesperrt. Bitte kontaktieren Sie unseren Support.
                      </p>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        localStorage.removeItem('customerNumber');
                        setCurrentCustomer(null);
                        setCustomerStatus(null);
                      }}
                      className="w-full"
                    >
                      Andere Kundennummer verwenden
                    </Button>
                  </div>
                ) : showCustomerLogin ? (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-800">🔑 Kunden-Anmeldung</h2>
                    <p className="text-sm text-gray-600">
                      Melden Sie sich mit Ihrer Kundennummer an.
                    </p>
                    
                    {customerLoginError && (
                      <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                        <p className="text-red-700 text-sm">{customerLoginError}</p>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kundennummer
                        </label>
                        <Input
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
                          className="w-full"
                        />
                      </div>
                    </div>
                    
                    <div className="flex space-x-3">
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setShowCustomerLogin(false);
                          setCustomerLoginError('');
                        }}
                        className="flex-1"
                      >
                        Zurück
                      </Button>
                      <Button 
                        onClick={customerLogin}
                        className="flex-1 bg-pink-500 hover:bg-pink-600"
                      >
                        Anmelden
                      </Button>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <p className="text-xs text-gray-500 text-center">
                        Noch nicht registriert?
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setShowCustomerLogin(false);
                          setShowRegistration(true);
                        }}
                        className="w-full mt-2 text-gray-600 hover:text-gray-800"
                        size="sm"
                      >
                        Jetzt registrieren
                      </Button>
                    </div>
                  </div>
                ) : showAdminLogin ? (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-800">🔐 Admin-Anmeldung</h2>
                    
                    {adminLoginError && (
                      <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                        <p className="text-red-700 text-sm">{adminLoginError}</p>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Admin PIN
                        </label>
                        <Input
                          type="password"
                          placeholder="Admin PIN eingeben"
                          value={adminPin}
                          onChange={(e) => setAdminPin(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              adminLogin();
                            }
                          }}
                          className="w-full text-center text-lg tracking-widest"
                          maxLength="4"
                        />
                      </div>
                    </div>
                    
                    <div className="flex space-x-3">
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setShowAdminLogin(false);
                          setAdminLoginError('');
                          setAdminPin('');
                        }}
                        className="flex-1"
                      >
                        Zurück
                      </Button>
                      <Button 
                        onClick={adminLogin}
                        disabled={!adminPin}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Anmelden
                      </Button>
                    </div>
                  </div>
                ) : showRegistration ? (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-800">📝 Registrierung</h2>
                    <p className="text-sm text-gray-600">
                      Geben Sie Ihre Kundendaten ein für die Registrierung.
                    </p>
                    
                    {registrationError && (
                      <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                        <p className="text-red-700 text-sm">{registrationError}</p>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kundennummer
                        </label>
                        <Input
                          type="text"
                          placeholder="Ihre Kundennummer"
                          value={registrationData.customer_number}
                          onChange={(e) => setRegistrationData(prev => ({
                            ...prev,
                            customer_number: e.target.value
                          }))}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          E-Mail
                        </label>
                        <Input
                          type="email"
                          placeholder="ihre@email.de"
                          value={registrationData.email}
                          onChange={(e) => setRegistrationData(prev => ({
                            ...prev,
                            email: e.target.value
                          }))}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name
                        </label>
                        <Input
                          type="text"
                          placeholder="Ihr vollständiger Name"
                          value={registrationData.name}
                          onChange={(e) => setRegistrationData(prev => ({
                            ...prev,
                            name: e.target.value
                          }))}
                          className="w-full"
                        />
                      </div>
                    </div>
                    
                    <div className="flex space-x-3">
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setShowRegistration(false);
                          setRegistrationError('');
                        }}
                        className="flex-1"
                      >
                        Zurück
                      </Button>
                      <Button 
                        onClick={registerCustomer}
                        disabled={!registrationData.customer_number || !registrationData.email || !registrationData.name}
                        className="flex-1 bg-pink-500 hover:bg-pink-600"
                      >
                        Registrieren
                      </Button>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <p className="text-xs text-gray-500 text-center">
                        Bereits registriert?
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setShowRegistration(false);
                          setShowCustomerLogin(true);
                        }}
                        className="w-full mt-2 text-gray-600 hover:text-gray-800"
                        size="sm"
                      >
                        Jetzt anmelden
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-800">OUTLET34 Live Shopping</h2>
                    <p className="text-sm text-gray-600">
                      Live-Event nur nach Anmeldung möglich bei: <br/>
                      <a href="https://www.outlet34fashion.com/registrieren" className="text-pink-500 hover:underline">
                        https://www.outlet34fashion.com/registrieren
                      </a>
                    </p>
                    
                    <div className="flex space-x-3">
                      <Button 
                        onClick={() => setShowCustomerLogin(true)}
                        className="flex-1 bg-pink-500 hover:bg-pink-600"
                      >
                        🔑 Anmelden
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setShowRegistration(true)}
                        className="flex-1"
                      >
                        📝 Registrieren
                      </Button>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <p className="text-xs text-gray-500 text-center">
                        Administratoren
                      </p>
                      <Button 
                        onClick={() => setShowAdminLogin(true)}
                        variant="outline"
                        className="w-full mt-2 text-gray-600 hover:text-gray-800"
                        size="sm"
                      >
                        🔐 Admin-Anmeldung
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main App - Only shown when authenticated */}
      {(isAuthenticated || isAdminView) && (
      <>
      {/* Header */}
      <header className="bg-pink-500 text-white">
        <div className="container mx-auto px-4 py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">
                {isAdminAuthenticated ? 
                  "👑 Admin angemeldet" :
                  (isAuthenticated && currentCustomer ? 
                    `${t.customerLoggedIn} ${currentCustomer.customer_number || '10299'}` :
                    `${t.customerLoggedIn} 10299`
                  )
                }
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-pink-600 text-xs"
                onClick={() => setLanguage(language === 'de' ? 'en' : 'de')}
              >
                {language === 'de' ? 'EN' : 'DE'}
              </Button>
            </div>
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
                    {t.customerView}
                  </Button>
                  <Button 
                    variant={isAdminView ? "secondary" : "ghost"} 
                    size="sm"
                    onClick={() => setIsAdminView(true)}
                    className={isAdminView ? "bg-white text-pink-600" : "text-white hover:bg-pink-600"}
                  >
                    {t.adminView}
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" className="text-white hover:bg-pink-600"
                onClick={() => {
                  if (isAdminAuthenticated) {
                    adminLogout();
                  } else {
                    customerLogout();
                  }
                }}
              >
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
        {tickerSettings.enabled && (
          <div className="bg-pink-500 py-3">
            <div className="container mx-auto px-4 text-center">
              <p className="text-white font-medium">{tickerSettings.text}</p>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        
        {/* Admin Dashboard */}
        {isAdminAuthenticated && isAdminView && (
          <div className="space-y-6">
            <Card className="mb-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  📊 {t.adminDashboard}
                </h2>
                
                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/20 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold">{adminStats.total_orders}</div>
                    <div className="text-sm opacity-90">{t.totalOrders}</div>
                  </div>
                  <div className="bg-white/20 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-yellow-300">{adminStats.session_orders}</div>
                    <div className="text-sm opacity-90">{t.sessionOrders}</div>
                  </div>
                </div>

                {/* Ticker Settings */}
                <div className="bg-white/10 rounded-lg p-4 mb-4">
                  <h3 className="text-lg font-semibold mb-3">⚙️ {t.tickerSettings}</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">{t.tickerText}</label>
                      <Input
                        value={newTickerText}
                        onChange={(e) => setNewTickerText(e.target.value)}
                        className="bg-white/20 border-white/30 text-white placeholder-white/70"
                        placeholder="Ticker Text eingeben..."
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        onClick={updateTicker}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        📝 {t.updateTicker}
                      </Button>
                      <Button 
                        onClick={toggleTicker}
                        className={tickerSettings.enabled ? "bg-orange-500 hover:bg-orange-600" : "bg-gray-500 hover:bg-gray-600"}
                      >
                        {tickerSettings.enabled ? "⏸️ Ticker Stop" : "▶️ Ticker Start"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Reset Counter */}
                <div className="text-center">
                  <Button 
                    onClick={resetOrderCounter}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    🔄 {t.resetCounter}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Customer Management Dashboard */}
            <Card className="bg-gradient-to-r from-blue-500 to-teal-500 text-white">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  👥 Kundenverwaltung
                </h2>
                
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">
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
                      className="bg-white/20 border-white/30 text-white placeholder-white/70"
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
                      className={customerFilter === 'pending' ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "bg-white/20 hover:bg-white/30 text-white"}
                      size="sm"
                    >
                      ⏳ Freigabe ({customers.filter(c => c.activation_status === 'pending').length})
                    </Button>
                    <Button 
                      onClick={() => setCustomerFilter('blocked')}
                      className={customerFilter === 'blocked' ? "bg-red-500 hover:bg-red-600 text-white" : "bg-white/20 hover:bg-white/30 text-white"}
                      size="sm"
                    >
                      🚫 Gesperrt ({customers.filter(c => c.activation_status === 'blocked').length})
                    </Button>
                    <Button 
                      onClick={() => setCustomerFilter('all')}
                      className={customerFilter === 'all' ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-white/20 hover:bg-white/30 text-white"}
                      size="sm"
                    >
                      📋 Alle
                    </Button>
                    <Button 
                      onClick={loadCustomers}
                      className="bg-white/20 hover:bg-white/30 text-white"
                      size="sm"
                    >
                      🔄 Aktualisieren
                    </Button>
                  </div>
                  
                  <div className="space-y-3 max-h-64 overflow-y-auto">
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
                      <p className="text-white/70 text-center py-4">
                        {customerSearch.trim() ? `Keine Kunden mit Nummer "${customerSearch}" gefunden` :
                         customerFilter === 'pending' ? 'Keine wartenden Kunden' : 
                         customerFilter === 'blocked' ? 'Keine gesperrten Kunden' : 
                         'Noch keine Kunden registriert'}
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
                        <div key={customer.id} className="bg-white/20 rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start space-x-3">
                              {/* Profile Image */}
                              <div className="flex-shrink-0">
                                {customer.profile_image ? (
                                  <img
                                    src={customer.profile_image}
                                    alt={customer.name}
                                    className="w-16 h-16 rounded-full object-cover border-2 border-white/30"
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded-full bg-white/30 flex items-center justify-center border-2 border-white/30">
                                    <span className="text-white text-xl font-bold">
                                      {customer.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Customer Info */}
                              <div className="flex-1">
                                {/* Customer Number FIRST - Most Important */}
                                <div className="font-bold text-lg text-yellow-200">
                                  #{customer.customer_number}
                                </div>
                                {/* Name Second - ONLY FOR ADMIN INTERNAL USE */}
                                <div className="font-medium text-white">
                                  {customer.name}
                                </div>
                                {/* Email and date smaller */}
                                <div className="text-sm opacity-90">
                                  📧 {customer.email}
                                </div>
                                <div className="text-xs opacity-75">
                                  📅 Registriert: {new Date(customer.created_at).toLocaleDateString('de-DE')}
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
              </CardContent>
            </Card>
          </div>
        )}

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
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Video Stream Area - Simple Live Stream Solution */}
          <div className="lg:col-span-2">
            <SimpleLiveStream 
              isHost={isAdminView}
            />
          </div>

          {/* Order Section - Only for Customers - MOVED UP */}
          {selectedProduct && !isAdminView && (
            <div className="space-y-4">
              {/* Customer Profile Section */}
              <Card className="max-w-sm mx-auto">
                <CardContent className="p-4">
                  <div className="text-center space-y-3">
                    <h3 className="font-semibold text-gray-800">Mein Profil</h3>
                    
                    {/* Profile Image */}
                    <div className="flex justify-center">
                      {currentCustomer?.profile_image ? (
                        <img
                          src={currentCustomer.profile_image}
                          alt="Profilbild"
                          className="w-20 h-20 rounded-full object-cover border-4 border-pink-200"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-4 border-pink-200">
                          <span className="text-gray-600 text-2xl font-bold">
                            #{currentCustomer?.customer_number || '10299'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Customer Number Display */}
                    <div className="text-lg font-bold text-pink-600">
                      Kunde #{getCustomerNumber()}
                    </div>
                    
                    {/* Profile Image Upload */}
                    <div>
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
                        id="customer-profile-upload"
                      />
                      <div className="flex justify-center space-x-2">
                        <label
                          htmlFor="customer-profile-upload"
                          className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                        >
                          📷 {currentCustomer?.profile_image ? 'Bild ändern' : 'Profilbild hinzufügen'}
                        </label>
                        {currentCustomer?.profile_image && (
                          <button
                            onClick={() => {
                              const customerNumber = currentCustomer?.customer_number || localStorage.getItem('customerNumber') || '10299';
                              console.log('Deleting for customer:', customerNumber);
                              deleteProfileImage(customerNumber);
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                          >
                            🗑️ Entfernen
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Form */}
              <Card className="max-w-sm mx-auto">
                <CardContent className="p-3">
                <div className="text-center space-y-3">
                  <div>
                    <div className="text-xs text-gray-600">{t.size}</div>
                    <div className="font-medium text-sm">{selectedSize}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Händlerpreis</div>
                    <div className="font-bold text-pink-600 text-lg">
                      {selectedPrice.toFixed(2)} €
                    </div>
                  </div>
                  <div className="flex items-center justify-center space-x-3">
                    <span className="text-sm">{t.quantity}</span>
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

              {/* Last Order Block - Compact Format */}
              <Card className="max-w-sm mx-auto">
                <CardContent className="p-2">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700 text-center text-sm">📦 Letzte Bestellung</h3>
                    
                    {loadingLastOrder ? (
                      <div className="text-center py-2">
                        <div className="text-xs text-gray-600">Lädt...</div>
                      </div>
                    ) : customerLastOrder ? (
                      <div className="bg-gray-50 rounded p-2 space-y-1">
                        {/* Compact One-Line Format: quantity I price I size */}
                        <div className="text-center font-medium text-sm text-gray-800">
                          {customerLastOrder.quantity} I {(customerLastOrder.price / customerLastOrder.quantity).toFixed(2)} I {customerLastOrder.size}
                        </div>
                        <div className="text-center text-xs text-gray-600">
                          {customerLastOrder.product_name}
                        </div>
                        <div className="text-center text-xs text-gray-500">
                          {customerLastOrder.formatted_time}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <div className="text-xs text-gray-500">Keine Bestellungen</div>
                      </div>
                    )}
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
                      
                      {/* Orders List */}
                      <div className="h-64 overflow-y-auto bg-gray-50 rounded p-3 space-y-2">
                        {chatMessages
                          .filter(msg => msg.message.includes('Bestellung'))
                          .map((msg) => (
                            <div key={msg.id} className="text-sm bg-white rounded p-2 border-l-4 border-pink-500">
                              <div className="font-medium text-pink-600">
                                {formatMessage(msg.message)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(msg.timestamp || Date.now()).toLocaleTimeString()}
                              </div>
                            </div>
                          ))}
                        {chatMessages.filter(msg => msg.message.includes('Bestellung')).length === 0 && (
                          <div className="text-center text-gray-500 py-8">
                            Noch keine Bestellungen
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

                      {/* Chat Messages */}
                      <div 
                        ref={chatRef}
                        className="h-64 overflow-y-auto bg-gray-50 rounded p-3 space-y-2"
                      >
                        {chatMessages
                          .filter(msg => !msg.message.includes('Bestellung'))
                          .map((msg) => (
                            <div key={msg.id} className="text-sm">
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
                            className="bg-pink-500 hover:bg-pink-600"
                            size="sm"
                          >
                            {t.send}
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
    </div>
  );
}

export default App;