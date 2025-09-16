import React, { useState, useEffect, useRef, useCallback } from 'react';
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
// REMOVED: SimpleLiveStream - was not working properly
// Daily.co Video Streaming - STABLE LOW-LATENCY SOLUTION
import DailyVideoCall from './components/streaming/DailyVideoCall';
import StreamsList from './components/streaming/StreamsList';
import SimpleVideoStreaming from './components/streaming/SimpleVideoStreaming';
import ColorModal, { getColorValue } from './components/ColorModal';
import MaterialModal from './components/MaterialModal';
import MaterialPropertiesModal from './components/MaterialPropertiesModal';
import SizeModal from './components/SizeModal';
import CameraCapture from './components/CameraCapture';
import MediaUploadModal from './components/MediaUploadModal';
import CategoryManagementModal from './components/CategoryManagementModal';
import livekitService from './services/livekitService';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
// CRITICAL FIX: Use direct backend WebSocket connection since production routing is broken
const CHAT_WS_URL = 'ws://localhost:8001/ws';

function App() {
  const { t, i18n } = useTranslation();
  const [isLive, setIsLive] = useState(true);
  const [viewerCount, setViewerCount] = useState(34);
  const [chatMessages, setChatMessages] = useState([]);
  const chatEndRef = useRef(null);
  const [newMessage, setNewMessage] = useState('');
  const [username] = useState('Kunde');
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [manualSize, setManualSize] = useState(''); // For manual size input
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [manualPrice, setManualPrice] = useState(''); // For manual price input
  const [quantity, setQuantity] = useState(1);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [customerId, setCustomerId] = useState(() => `customer_${Math.random().toString(36).substr(2, 9)}`);
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
  const [activeView, setActiveView] = useState('chat'); // 'chat' or 'orders' - Standard auf Chat
  const [allOrders, setAllOrders] = useState([]); // Alle Bestellungen von allen Kunden
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showTopBuyers, setShowTopBuyers] = useState(false); // Top 3 Käufer auf/zuklappbar - standardmäßig zugeklappt
  const [showLastOrder, setShowLastOrder] = useState(false); // Letzte Bestellung auf/zuklappbar - standardmäßig zugeklappt
  const [pollingStatus, setPollingStatus] = useState('Starting...'); // DEBUG: Show polling status
  const [lastPollTime, setLastPollTime] = useState(null); // DEBUG: Show last poll time
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
  const [showStatistics, setShowStatistics] = useState(false);
  const [showCustomerManagement, setShowCustomerManagement] = useState(false);
  const [showStreamingControls, setShowStreamingControls] = useState(false);
  const [showTickerSettings, setShowTickerSettings] = useState(false);
  const [showCalendarManagement, setShowCalendarManagement] = useState(false);
  const [showLiveStreamManagement, setShowLiveStreamManagement] = useState(false);
  
  // Zebra Printer States
  const [showZebraControls, setShowZebraControls] = useState(false);
  const [labelPreviewCustomer, setLabelPreviewCustomer] = useState('');
  const [labelPreviewPrice, setLabelPreviewPrice] = useState('');
  const [labelPreview, setLabelPreview] = useState('');
  
  // Manual Customer Creation States
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    customer_number: '',
    email: '',
    first_name: '',
    last_name: '',
    company_name: '',
    member_since: '',
    status: 'Starter'
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

  // Daily.co Streaming States - STABLE LOW-LATENCY SOLUTION
  const [dailyToken, setDailyToken] = useState(null);
  const [dailyRoomUrl, setDailyRoomUrl] = useState(null);
  const [roomName, setRoomName] = useState('live-shopping-stream');
  const [isDailyConnected, setIsDailyConnected] = useState(false);
  const [dailyError, setDailyError] = useState(null);
  const [streamingActive, setStreamingActive] = useState(false);

  // LiveKit Streaming States
  const [currentRoomName, setCurrentRoomName] = useState(null);
  const [livekitToken, setLivekitToken] = useState(null);
  const [livekitUrl, setLivekitUrl] = useState(null);
  const [livekitError, setLivekitError] = useState(null);

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

  // Produktkatalog States
  const [showCatalog, setShowCatalog] = useState(false);
  const [categories, setCategories] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [catalogOrderQuantity, setCatalogOrderQuantity] = useState(1);
  const [selectedProductSize, setSelectedProductSize] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(false);  
  const [catalogError, setCatalogError] = useState('');
  const [customerCatalogOrders, setCustomerCatalogOrders] = useState([]);
  const [showMyOrders, setShowMyOrders] = useState(false);
  
  // Admin Katalog States
  const [showCatalogManagement, setShowCatalogManagement] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [mainCategories, setMainCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedCategorySubcategories, setSelectedCategorySubcategories] = useState([]);
  const [showSubcategories, setShowSubcategories] = useState(false);
  const [totalProductCount, setTotalProductCount] = useState(0);
  const [newCategoryData, setNewCategoryData] = useState({
    name: '',
    description: '',
    image_url: '',
    sort_order: 0
  });
  const [newProductData, setNewProductData] = useState({
    article_number: '',
    name: '',
    description: '',
    material: '',
    material_properties: [],
    main_category_id: '',
    sub_category_id: '',
    price: 0,
    sizes: [],
    colors: [],
    image_url: '',
    stock_quantity: null
  });
  
  const [customColor, setCustomColor] = useState('');
  const [showColorModal, setShowColorModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showMaterialPropertiesModal, setShowMaterialPropertiesModal] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [showMediaUploadModal, setShowMediaUploadModal] = useState(false);
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [showCategoryManagementModal, setShowCategoryManagementModal] = useState(false);
  
  // Media Upload States
  const [productMediaFiles, setProductMediaFiles] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  // New Catalog Features States
  const [searchQuery, setSearchQuery] = useState('');
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [productFavoriteStatus, setProductFavoriteStatus] = useState({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);

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

  const setCustomerReminder = async (eventId) => {
    try {
      if (!notificationsEnabled) {
        alert('Bitte aktivieren Sie Benachrichtigungen in Ihrem Profil, um Erinnerungen zu erhalten.');
        return;
      }

      const customerNumber = currentCustomer?.customer_number || localStorage.getItem('customerNumber');
      const response = await axios.post(`${API}/customer/reminder`, {
        customer_number: customerNumber,
        event_id: eventId
      });

      if (response.data.success) {
        // Update local reminders state
        setCustomerReminders(prev => [...prev, eventId]);
        alert('✅ Erinnerung aktiviert! Sie werden 30 Minuten vor dem Termin benachrichtigt.');
      }
    } catch (error) {
      console.error('Error setting reminder:', error);
      alert('❌ Fehler beim Setzen der Erinnerung. Bitte versuchen Sie es erneut.');
    }
  };

  const removeCustomerReminder = async (eventId) => {
    try {
      const customerNumber = currentCustomer?.customer_number || localStorage.getItem('customerNumber');
      await axios.delete(`${API}/customer/reminder/${customerNumber}/${eventId}`);
      
      // Update local reminders state
      setCustomerReminders(prev => prev.filter(id => id !== eventId));
      alert('🔕 Erinnerung deaktiviert.');
    } catch (error) {
      console.error('Error removing reminder:', error);
      alert('❌ Fehler beim Entfernen der Erinnerung.');
    }
  };

  // Load customer reminders
  const loadCustomerReminders = async () => {
    try {
      const customerNumber = currentCustomer?.customer_number || localStorage.getItem('customerNumber');
      if (customerNumber) {
        const response = await axios.get(`${API}/customer/reminders/${customerNumber}`);
        setCustomerReminders(response.data.reminders || []);
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      // Disable notifications
      setNotificationsEnabled(false);
      localStorage.setItem('notificationsEnabled', 'false');
    } else {
      // Enable notifications - request permission first
      await requestNotificationPermission();
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
          icon: '/images/outlet34-logo-new.png',
          badge: '/images/outlet34-logo-new.png',
          tag: `event-${event.id}`,
          requireInteraction: true
        });
      }, notificationTime);
    }
  };

  // ==============================================
  // FARBKARTE FUNCTIONS
  // ==============================================

  // Color palette with categories as requested by user
  const colorPalette = {
    'Neutrale Töne': {
      emoji: '⚪',
      colors: [
        { name: 'Weiß', value: '#FFFFFF' },
        { name: 'Schwarz', value: '#000000' },
        { name: 'Grau', value: '#808080' },
        { name: 'Grau Hell', value: '#D3D3D3' },
        { name: 'Grau Dunkel', value: '#696969' },
        { name: 'Beige Hell', value: '#F5F5DC' },
        { name: 'Beige Dunkel', value: '#DEB887' },
        { name: 'Sand', value: '#C2B280' },
        { name: 'Camel', value: '#C19A6B' },
        { name: 'Taupe', value: '#483C32' }
      ]
    },
    'Erd- & Brauntöne': {
      emoji: '🟤',
      colors: [
        { name: 'Mokka', value: '#3C2415' },
        { name: 'MUD', value: '#70543E' },
        { name: 'Chocolate', value: '#7B3F00' },
        { name: 'Rost', value: '#B7410E' }
      ]
    },
    'Rot & Rosé': {
      emoji: '🔴',
      colors: [
        { name: 'Rot', value: '#FF0000' },
        { name: 'Bordeaux', value: '#800020' },
        { name: 'Weinrot', value: '#722F37' },
        { name: 'Rosa', value: '#FFC0CB' },
        { name: 'Pink', value: '#FF69B4' }
      ]
    },
    'Orange & Peach': {
      emoji: '🧡',
      colors: [
        { name: 'Orange', value: '#FFA500' },
        { name: 'Lachs', value: '#FA8072' },
        { name: 'Peach', value: '#FFCBA4' }
      ]
    },
    'Gelb & Gold': {
      emoji: '💛',
      colors: [
        { name: 'Gelb', value: '#FFFF00' },
        { name: 'Butter', value: '#FFFF99' },
        { name: 'Gold', value: '#FFD700' }
      ]
    },
    'Grün-Töne': {
      emoji: '💚',
      colors: [
        { name: 'Grün', value: '#008000' },
        { name: 'Grün Hell', value: '#90EE90' },
        { name: 'Grün Dunkel', value: '#006400' },
        { name: 'Grün Apfel', value: '#8DB600' },
        { name: 'Oliv', value: '#808000' },
        { name: 'Salbei', value: '#9CAF88' },
        { name: 'Pistazie', value: '#93C572' },
        { name: 'Khaki', value: '#F0E68C' },
        { name: 'Mint', value: '#98FB98' }
      ]
    },
    'Blau-Töne': {
      emoji: '🔵',
      colors: [
        { name: 'Blau Hell', value: '#ADD8E6' },
        { name: 'Blau Dunkel', value: '#00008B' },
        { name: 'Blau Navi', value: '#000080' },
        { name: 'Blau Royal', value: '#4169E1' },
        { name: 'Türkis', value: '#40E0D0' },
        { name: 'Petrol', value: '#005F5F' }
      ]
    },
    'Lila-Töne': {
      emoji: '🟣',
      colors: [
        { name: 'Lila', value: '#800080' },
        { name: 'Flieder', value: '#B19CD9' }
      ]
    },
    'Metallic': {
      emoji: '✨',
      colors: [
        { name: 'Silber', value: '#C0C0C0' }
      ]
    }
  };

  // Get color value by name for display
  const getColorValue = (colorName) => {
    for (const category of Object.values(colorPalette)) {
      const color = category.colors.find(c => c.name === colorName);
      if (color) return color.value;
    }
    // Fallback colors for legacy colors
    const fallbackColors = {
      'Schwarz': '#000000',
      'Weiß': '#FFFFFF',
      'Blau': '#0066CC',
      'Rot': '#CC0000',
      'Beige': '#F5F5DC'
    };
    return fallbackColors[colorName] || '#CCCCCC';
  };

  // Toggle color selection
  const toggleColor = (colorName) => {
    const colors = [...newProductData.colors];
    const index = colors.indexOf(colorName);
    if (index > -1) {
      colors.splice(index, 1);
    } else {
      colors.push(colorName);
    }
    setNewProductData({ ...newProductData, colors });
  };

  // Add custom color
  const addCustomColor = () => {
    if (customColor.trim() && !newProductData.colors.includes(customColor.trim())) {
      setNewProductData({ 
        ...newProductData, 
        colors: [...newProductData.colors, customColor.trim()] 
      });
      setCustomColor('');
    }
  };

  // Handle camera photo capture
  const handleCameraCapture = async (file) => {
    try {
      // Upload the captured photo immediately
      await uploadMediaFiles([file]);
      
      // Show success message
      alert('📷 Foto erfolgreich aufgenommen und hochgeladen!');
    } catch (error) {
      console.error('Error uploading captured photo:', error);
      alert('❌ Fehler beim Hochladen des Fotos. Bitte versuchen Sie es erneut.');
    }
  };

  // Handle file selection from gallery
  const handleFileSelection = () => {
    // Trigger the existing file input
    const fileInput = document.getElementById('media-upload');
    if (fileInput) {
      fileInput.click();
    }
  };

  // ==============================================
  // PRODUKTKATALOG FUNCTIONS
  // ==============================================

  // Load categories
  const loadCategories = async () => {
    try {
      setLoadingCatalog(true);
      setCatalogError('');
      
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
      
      // Load main categories with product counts
      const mainCatResponse = await axios.get(`${API}/categories/main`);
      setMainCategories(mainCatResponse.data);
      
      // Load category statistics for total product count
      const statsResponse = await axios.get(`${API}/categories/stats`);
      setTotalProductCount(statsResponse.data.total_products);
      
    } catch (error) {
      console.error('Error loading categories:', error);
      setCatalogError('Fehler beim Laden der Kategorien');
    } finally {
      setLoadingCatalog(false);
    }
  };

  // Load subcategories for a main category
  const loadSubCategories = async (mainCategoryId) => {
    try {
      // Load subcategories with product counts
      const response = await axios.get(`${API}/categories/sub/${mainCategoryId}`);
      setSubCategories(response.data);
    } catch (error) {
      console.error('Error loading subcategories:', error);
      setSubCategories([]);
    }
  };

  // Load subcategories for display in catalog
  const loadCategorySubcategories = async (mainCategory) => {
    try {
      console.log('Loading subcategories for category:', mainCategory.name);
      const response = await axios.get(`${API}/categories/sub/${mainCategory.id}`);
      console.log('Loaded subcategories:', response.data);
      setSelectedCategorySubcategories(response.data);
      setShowSubcategories(true);
    } catch (error) {
      console.error('Error loading category subcategories:', error);
      setSelectedCategorySubcategories([]);
      setShowSubcategories(false);
    }
  };

  // Load products (optionally filtered by category)
  const loadCatalogProducts = async (categoryId = null) => {
    try {
      setLoadingCatalog(true);
      setCatalogError('');
      
      // Enhanced mock products with real images for testing
      const mockProducts = [
        // Neue Artikel (letzte 30 Tage)
        {
          id: '1',
          name: 'Basic T-Shirt Weiß',
          description: 'Klassisches weißes T-Shirt aus 100% Baumwolle',
          price: 19.99,
          sizes: ['S', 'M', 'L', 'XL'],
          colors: ['Weiß', 'Schwarz', 'Grau'],
          material: 'Baumwolle',
          material_properties: ['Weich', 'Atmungsaktiv', 'Pflegeleicht'],
          image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
          category_id: categoryId || 'all'
        },
        {
          id: '2',
          name: 'Skinny Jeans Blau',
          description: 'Moderne Skinny-Jeans mit Stretch-Anteil',
          price: 59.99,
          sizes: ['28', '30', '32', '34', '36'],
          colors: ['Blau', 'Schwarz', 'Grau'],
          material: 'Denim',
          material_properties: ['Stretch', 'Robust', 'Formstabil'],
          image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&h=500&fit=crop',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(), // 10 days ago
          category_id: categoryId || 'all'
        },
        {
          id: '3',
          name: 'Sommerkleid Floral',
          description: 'Leichtes Sommerkleid mit floralem Muster',
          price: 45.99,
          sizes: ['XS', 'S', 'M', 'L', 'XL'],
          colors: ['Rosa', 'Blau', 'Gelb'],
          material: 'Viskose',
          material_properties: ['Leicht', 'Fließend', 'Atmungsaktiv'],
          image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&h=500&fit=crop',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(), // 15 days ago
          category_id: categoryId || 'all'
        },
        {
          id: '4',
          name: 'Oversized Hoodie',
          description: 'Kuscheliger Oversized Hoodie für entspannte Tage',
          price: 39.99,
          sizes: ['S', 'M', 'L', 'XL'],
          colors: ['Grau', 'Schwarz', 'Rosa', 'Beige'],
          material: 'Baumwoll-Mix',
          material_properties: ['Kuschelig', 'Warm', 'Oversized'],
          image_url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&h=500&fit=crop',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(), // 20 days ago
          category_id: categoryId || 'all'
        },
        {
          id: '5',
          name: 'High Waist Shorts',
          description: 'Trendige High-Waist Shorts für den Sommer',
          price: 29.99,
          sizes: ['XS', 'S', 'M', 'L'],
          colors: ['Beige', 'Weiß', 'Schwarz'],
          material: 'Baumwolle',
          material_properties: ['High-Waist', 'Bequem', 'Sommerlich'],
          image_url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500&h=500&fit=crop',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString(), // 25 days ago
          category_id: categoryId || 'all'
        },
        
        // Bestseller (älter als 30 Tage)
        {
          id: '6',
          name: 'Classic Blazer',
          description: 'Zeitloser Business Blazer für jeden Anlass',
          price: 89.99,
          sizes: ['S', 'M', 'L', 'XL'],
          colors: ['Schwarz', 'Navy', 'Grau'],
          material: 'Polyester-Mix',
          material_properties: ['Elegant', 'Bürotauglich', 'Pflegeleicht'],
          image_url: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=500&h=500&fit=crop',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(), // 45 days ago
          category_id: categoryId || 'all'
        },
        {
          id: '7',
          name: 'Mom Jeans Vintage',
          description: 'Angesagte Mom-Jeans im Vintage-Look',
          price: 54.99,
          sizes: ['26', '28', '30', '32', '34'],
          colors: ['Light Blue', 'Medium Blue', 'Dark Blue'],
          material: 'Denim',
          material_properties: ['Vintage', 'High-Waist', 'Relaxed Fit'],
          image_url: 'https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=500&h=500&fit=crop',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(), // 60 days ago
          category_id: categoryId || 'all'
        },
        {
          id: '8',
          name: 'Maxi Kleid Boho',
          description: 'Fließendes Maxi-Kleid im Boho-Style',
          price: 69.99,
          sizes: ['XS', 'S', 'M', 'L', 'XL'],
          colors: ['Beige', 'Terracotta', 'Olive'],
          material: 'Viskose',
          material_properties: ['Fließend', 'Boho-Style', 'Maxi-Länge'],
          image_url: 'https://images.unsplash.com/photo-1566479179817-e3a57b4eef29?w=500&h=500&fit=crop',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 75).toISOString(), // 75 days ago
          category_id: categoryId || 'all'
        },
        {
          id: '9',
          name: 'Leder Handtasche',
          description: 'Elegante Handtasche aus echtem Leder',
          price: 129.99,
          sizes: ['OneSize'],
          colors: ['Schwarz', 'Braun', 'Cognac'],
          material: 'Leder',
          material_properties: ['Echtleder', 'Elegant', 'Langlebig'],
          image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&h=500&fit=crop',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(), // 90 days ago
          category_id: categoryId || 'all'
        },
        {
          id: '10',
          name: 'Sneaker Weiß',
          description: 'Klassische weiße Sneaker für jeden Tag',
          price: 79.99,
          sizes: ['36', '37', '38', '39', '40', '41'],
          colors: ['Weiß', 'Weiß-Rosa', 'Weiß-Grau'],
          material: 'Kunstleder',
          material_properties: ['Bequem', 'Alltagstauglich', 'Pflegeleicht'],
          image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&h=500&fit=crop',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(), // 120 days ago
          category_id: categoryId || 'all'
        }
      ];
      
      // Filter products by category if specified
      const filteredProducts = categoryId ? 
        mockProducts.filter(p => p.category_id === categoryId) : 
        mockProducts;
        
      setCatalogProducts(filteredProducts);
      
    } catch (error) {
      console.error('Error loading products:', error);
      setCatalogError('Fehler beim Laden der Produkte');
    } finally {
      setLoadingCatalog(false);
    }
  };

  // Load customer orders
  const loadCustomerCatalogOrders = async (customerNumber) => {
    try {
      const response = await axios.get(`${API}/catalog/orders/customer/${customerNumber}`);
      setCustomerCatalogOrders(response.data);
    } catch (error) {
      console.error('Error loading customer orders:', error);
    }
  };

  // Place catalog order
  const placeCatalogOrder = async () => {
    if (!selectedCatalogProduct || !selectedProductSize || !isAuthenticated) return;
    
    try {
      const customerNumber = currentCustomer?.customer_number || localStorage.getItem('customerNumber');
      if (!customerNumber) {
        alert('Kunden-Nummer nicht gefunden. Bitte neu anmelden.');
        return;
      }

      const orderData = {
        customer_number: customerNumber,
        product_id: selectedCatalogProduct.id,
        size: selectedProductSize,
        quantity: catalogOrderQuantity
      };

      const response = await axios.post(`${API}/catalog/orders`, orderData);
      
      alert(`✅ Bestellung erfolgreich aufgegeben!\nArtikel: ${selectedCatalogProduct.name}\nGröße: ${selectedProductSize}\nAnzahl: ${catalogOrderQuantity}\nGesamtpreis: ${response.data.total_price.toFixed(2)} €`);
      
      // Reset order form
      setSelectedCatalogProduct(null);
      setShowProductDetail(false);
      setSelectedProductSize('');
      setCatalogOrderQuantity(1);
      
      // Reload customer orders
      loadCustomerCatalogOrders(customerNumber);
      
    } catch (error) {
      console.error('Error placing catalog order:', error);
      if (error.response?.status === 400 && error.response.data.detail.includes('stock')) {
        alert('❌ Nicht genügend Lagerbestand verfügbar!');
      } else if (error.response?.status === 403) {
        alert('❌ Ihr Konto ist nicht aktiviert. Bitte wenden Sie sich an den Administrator.');
      } else {
        alert('❌ Fehler beim Aufgeben der Bestellung. Bitte versuchen Sie es erneut.');
      }
    }
  };

  // Admin: Create Category
  const createCategory = async () => {
    try {
      setCreatingCategory(true);
      setCatalogError('');
      
      await axios.post(`${API}/admin/categories`, newCategoryData);
      
      // Reset form
      setNewCategoryData({
        name: '',
        description: '',
        image_url: '',
        sort_order: 0
      });
      setShowCreateCategory(false);
      
      // Reload categories
      await loadCategories();
      alert('✅ Kategorie erfolgreich erstellt!');
      
    } catch (error) {
      console.error('Error creating category:', error);
      setCatalogError('Fehler beim Erstellen der Kategorie');
    } finally {
      setCreatingCategory(false);
    }
  };

  // Login as Customer
  const loginAsCustomer = async () => {
    try {
      setIsAuthenticated(true);
      // Set basic customer data
      setCurrentCustomer({ customer_number: customerId });
      localStorage.setItem('customerNumber', customerId);
      console.log('Customer logged in:', customerId);
    } catch (error) {
      console.error('Error logging in customer:', error);
      alert('Fehler beim Anmelden');
    }
  };

  // Upload Media Files
  const uploadMediaFiles = async (files) => {
    try {
      setUploadingMedia(true);
      
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file);
      }
      
      const response = await axios.post(`${API}/upload/product-media`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        const newFiles = response.data.files.map(file => ({
          ...file,
          order: productMediaFiles.length + response.data.files.indexOf(file)
        }));
        
        setProductMediaFiles(prev => [...prev, ...newFiles]);
      }
      
    } catch (error) {
      console.error('Error uploading files:', error);
      setCatalogError('Fehler beim Hochladen der Dateien');
    } finally {
      setUploadingMedia(false);
    }
  };

  // Handle file drop
  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    
    if (files.length > 0) {
      uploadMediaFiles(files);
    }
  };

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  // Handle drag leave
  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  // Handle file input
  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      uploadMediaFiles(files);
    }
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  // Remove media file
  const removeMediaFile = async (fileId, filename) => {
    try {
      // Remove from server
      await axios.delete(`${API}/upload/product-media/${filename.split('/').pop()}`);
      
      // Remove from local state
      setProductMediaFiles(prev => prev.filter(file => file.id !== fileId));
      
    } catch (error) {
      console.error('Error removing file:', error);
    }
  };

  // Load favorite products
  const loadFavoriteProducts = async (customerNumber) => {
    try {
      const response = await axios.get(`${API}/favorites/${customerNumber}`);
      setFavoriteProducts(response.data);
      
      // Create a status lookup for favorites
      const favoriteStatus = {};
      response.data.forEach(product => {
        favoriteStatus[product.id] = true;
      });
      setProductFavoriteStatus(favoriteStatus);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  // Toggle favorite
  const toggleFavorite = async (productId) => {
    if (!isAuthenticated || !currentCustomer?.customer_number) {
      alert('Bitte melden Sie sich an, um Favoriten zu verwalten.');
      return;
    }
    
    try {
      const isCurrentlyFavorite = productFavoriteStatus[productId];
      
      if (isCurrentlyFavorite) {
        // Remove from favorites
        await axios.delete(`${API}/favorites/${currentCustomer.customer_number}/${productId}`);
        setProductFavoriteStatus(prev => ({ ...prev, [productId]: false }));
        
        // Remove from favorite products list
        setFavoriteProducts(prev => prev.filter(p => p.id !== productId));
      } else {
        // Add to favorites
        await axios.post(`${API}/favorites/${currentCustomer.customer_number}/${productId}`);
        setProductFavoriteStatus(prev => ({ ...prev, [productId]: true }));
        
        // Reload favorites to get the product data
        loadFavoriteProducts(currentCustomer.customer_number);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Fehler beim Ändern der Favoriten.');
    }
  };

  // Search products
  const searchProducts = async (query = searchQuery) => {
    try {
      setLoadingCatalog(true);
      setCatalogError('');
      
      let url = `${API}/products`;
      const params = new URLSearchParams();
      
      if (selectedCategory) {
        params.append('category_id', selectedCategory.id);
      }
      if (query && query.trim()) {
        params.append('search', query.trim());
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
      
      const response = await axios.get(url);
      setCatalogProducts(response.data);
      
    } catch (error) {
      console.error('Error searching products:', error);
      setCatalogError('Fehler bei der Suche');
    } finally {
      setLoadingCatalog(false);
    }
  };

  // Move media file up/down
  const moveMediaFile = (fileId, direction) => {
    setProductMediaFiles(prev => {
      const index = prev.findIndex(file => file.id === fileId);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      
      const newFiles = [...prev];
      [newFiles[index], newFiles[newIndex]] = [newFiles[newIndex], newFiles[index]];
      
      // Update order values
      return newFiles.map((file, idx) => ({ ...file, order: idx }));
    });
  };

  // Admin: Create Product
  const createProduct = async () => {
    try {
      setCreatingProduct(true);
      setCatalogError('');
      
      // Validate mandatory fields
      if (!newProductData.name.trim()) {
        throw new Error('Produktname ist erforderlich');
      }
      
      if (!newProductData.main_category_id) {
        throw new Error('Hauptkategorie ist erforderlich');
      }

      // Validate sizes (mandatory)
      if (!newProductData.sizes || newProductData.sizes.length === 0) {
        throw new Error('Mindestens eine Größe ist erforderlich');
      }

      // Validate colors (mandatory)
      if (!newProductData.colors || newProductData.colors.length === 0) {
        throw new Error('Mindestens eine Farbe ist erforderlich');
      }

      console.log('Submitting product data:', newProductData);
      
      const response = await axios.post(`${API}/admin/products`, newProductData);
      
      console.log('Product created successfully:', response.data);
      
      // Reset form
      setNewProductData({
        article_number: '',
        name: '',
        description: '',
        material: '',
        material_properties: [],
        main_category_id: '',
        sub_category_id: '',
        price: 0,
        sizes: [],
        colors: [],
        image_url: '',
        additional_images: [],
        stock_quantity: null
      });
      setProductMediaFiles([]);
      setCustomColor('');
      setSubCategories([]);
      setShowCreateProduct(false);
      
      // Reload products
      await loadCatalogProducts();
      alert('✅ Produkt erfolgreich erstellt!');
      
    } catch (error) {
      console.error('Error creating product:', error);
      if (error.response?.status === 400 && error.response.data.detail.includes('Article number')) {
        setCatalogError('⚠️ Artikelnummer bereits vorhanden. Bitte verwenden Sie eine andere Nummer.');
      } else {
        setCatalogError(error.message || 'Fehler beim Erstellen des Produkts');
      }
    } finally {
      setCreatingProduct(false);
    }
  };

  // Admin: Update Product
  const updateProduct = async () => {
    try {
      setCreatingProduct(true);
      setCatalogError('');
      
      if (!editingProduct) {
        throw new Error('Kein Produkt zum Bearbeiten ausgewählt');
      }

      console.log('Updating product:', editingProduct.id, editingProduct);
      
      const response = await axios.put(`${API}/admin/products/${editingProduct.id}`, editingProduct);
      
      console.log('Product updated successfully:', response.data);
      
      // Reset editing state
      setEditingProduct(null);
      setShowEditProduct(false);
      
      // Reload products
      await loadCatalogProducts();
      alert('✅ Produkt erfolgreich aktualisiert!');
      
    } catch (error) {
      console.error('Error updating product:', error);
      setCatalogError(error.response?.data?.detail || error.message || 'Fehler beim Aktualisieren des Produkts');
    } finally {
      setCreatingProduct(false);
    }
  };

  // Start editing a product
  const startEditProduct = (product) => {
    console.log('Starting to edit product:', product);
    setEditingProduct({
      id: product.id,
      name: product.name || '',
      description: product.description || '',
      material: product.material || '',
      material_properties: product.material_properties || [],
      main_category_id: product.main_category_id || '',
      sub_category_id: product.sub_category_id || '',
      price: product.price || 0,
      sizes: product.sizes || [],
      colors: product.colors || [],
      image_url: product.image_url || '',
      additional_images: product.additional_images || [],
      stock_quantity: product.stock_quantity || null
    });
    setShowEditProduct(true);
    
    // Load categories and subcategories for dropdowns
    loadCategories();
    if (product.main_category_id) {
      loadSubCategories(product.main_category_id);
    }
  };

  // Toggle product out of stock
  const toggleOutOfStock = async (product) => {
    try {
      console.log('🚫 Toggle out of stock for product:', product);
      
      if (!product || !product.id) {
        console.error('Invalid product object:', product);
        alert('❌ Fehler: Produkt-ID nicht gefunden');
        return;
      }
      
      const newStockQuantity = product.stock_quantity === 0 ? null : 0;
      console.log('📦 Changing stock from', product.stock_quantity, 'to', newStockQuantity);
      
      const response = await axios.put(`${API}/admin/products/${product.id}`, {
        stock_quantity: newStockQuantity
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Stock update response:', response.data);
      
      // Reload products to show updated state
      await loadCatalogProducts();
      
      const status = newStockQuantity === 0 ? 'als ausverkauft markiert' : 'wieder verfügbar gemacht';
      alert(`✅ Produkt ${status}!`);
      
    } catch (error) {
      console.error('❌ Error updating stock:', error);
      let errorMessage = '❌ Fehler beim Aktualisieren des Lagerbestands';
      
      if (error.response?.status === 404) {
        errorMessage = '❌ Produkt nicht gefunden';
      } else if (error.response?.data?.detail) {
        errorMessage += `: ${error.response.data.detail}`;
      }
      
      alert(errorMessage);
    }
  };

  // Toggle product visibility
  const toggleProductVisibility = async (product) => {
    try {
      console.log('👁️ Toggle visibility for product:', product);
      
      if (!product || !product.id) {
        console.error('Invalid product object:', product);
        alert('❌ Fehler: Produkt-ID nicht gefunden');
        return;
      }
      
      const newActiveState = !product.is_active;
      console.log('🔄 Changing visibility from', product.is_active, 'to', newActiveState);
      
      const response = await axios.put(`${API}/admin/products/${product.id}`, {
        is_active: newActiveState
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Visibility update response:', response.data);
      
      // Reload products to show updated state
      await loadCatalogProducts();
      
      const status = newActiveState ? 'eingeblendet' : 'ausgeblendet';
      alert(`✅ Produkt ${status}!`);
      
    } catch (error) {
      console.error('❌ Error updating visibility:', error);
      let errorMessage = '❌ Fehler beim Aktualisieren der Sichtbarkeit';
      
      if (error.response?.status === 404) {
        errorMessage = '❌ Produkt nicht gefunden';
      } else if (error.response?.data?.detail) {
        errorMessage += `: ${error.response.data.detail}`;
      }
      
      alert(errorMessage);
    }
  };

  // Delete product
  const deleteProduct = async (product) => {
    try {
      console.log('🗑️ Delete product initiated:', product);
      
      // Validate product object
      if (!product || !product.id) {
        console.error('Invalid product object:', product);
        alert('❌ Fehler: Produkt-ID nicht gefunden');
        return;
      }
      
      // Confirm deletion
      const confirmed = window.confirm(
        `Sind Sie sicher, dass Sie das Produkt "${product.name}" (Art.-Nr.: ${product.article_number}) löschen möchten?\n\nDiese Aktion kann nicht rückgängig gemacht werden!`
      );
      
      if (!confirmed) {
        console.log('🚫 Product deletion cancelled by user');
        return;
      }
      
      console.log('🔄 Sending DELETE request for product ID:', product.id);
      console.log('🌐 API URL:', `${API}/admin/products/${product.id}`);
      
      const response = await axios.delete(`${API}/admin/products/${product.id}`, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Product deletion response:', response);
      console.log('📄 Response status:', response.status);
      console.log('📋 Response data:', response.data);
      
      if (response.status === 200) {
        console.log('🔄 Reloading products after successful deletion...');
        
        // Reload products to show updated list
        await loadCatalogProducts();
        
        alert('✅ Produkt erfolgreich gelöscht!');
        console.log('✅ Product deletion completed successfully');
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
      
    } catch (error) {
      console.error('❌ Error during product deletion:');
      console.error('📋 Error object:', error);
      console.error('🌐 Error response:', error.response);
      console.error('📄 Error status:', error.response?.status);
      console.error('📋 Error data:', error.response?.data);
      
      // More specific error messages
      let errorMessage = '❌ Fehler beim Löschen des Produkts';
      
      if (error.response?.status === 404) {
        errorMessage = '❌ Produkt nicht gefunden (bereits gelöscht?)';
      } else if (error.response?.status === 403) {
        errorMessage = '❌ Keine Berechtigung zum Löschen';
      } else if (error.response?.status === 500) {
        errorMessage = '❌ Server-Fehler beim Löschen';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = '❌ Zeitüberschreitung beim Löschen';
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      alert(errorMessage);
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
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileDropdown && !event.target.closest('.profile-dropdown')) {
        setShowProfileDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);
  
  // Login Modal States
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  
  // Termine Modal States
  const [showTerminModal, setShowTerminModal] = useState(false);
  const [customerReminders, setCustomerReminders] = useState([]);
  
  const chatRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const pollingInterval = useRef(null);



  useEffect(() => {
    // Initialize WebSocket connection with polling fallback for reliability
    const connectWebSocket = () => {
      console.log('🔌 Attempting WebSocket connection to:', CHAT_WS_URL);
      
      // Close existing connection if any
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close();
      }
      
      const ws = new WebSocket(CHAT_WS_URL);
      let connectionSuccessful = false;
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        connectionSuccessful = true;
        reconnectAttempts.current = 0;
        // Stop polling when WebSocket works
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
      };
      
      ws.onmessage = (event) => {
        console.log('📨 WebSocket message received:', event.data);
        try {
          const data = JSON.parse(event.data);
          console.log('📋 Parsed WebSocket data:', data);
          
          if (data.type === 'chat_message') {
            console.log('💬 Processing chat message:', data.data);
            console.log('📊 Current chat messages count before update:', chatMessages.length);
            
            setChatMessages(prev => {
              // More robust duplicate checking using message content and timestamp
              const messageExists = prev.some(msg => 
                msg.id === data.data.id || 
                (msg.message === data.data.message && 
                 msg.username === data.data.username && 
                 Math.abs(new Date(msg.timestamp) - new Date(data.data.timestamp)) < 1000)
              );
              
              if (!messageExists) {
                console.log('✅ Adding new message to chat, new total will be:', prev.length + 1);
                const newMessage = {
                  ...data.data,
                  timestamp: data.data.timestamp || new Date().toISOString()
                };
                return [...prev, newMessage]; // Add new messages at the END (bottom)
              } else {
                console.log('⏭️  Message already exists, skipping duplicate:', data.data.id);
                return prev;
              }
            });
          } else if (data.type === 'viewer_count') {
            setViewerCount(data.count);
          } else if (data.type === 'order_notification') {
            // Add order notification to chat in the new format
            const orderMsg = {
              id: `order_${Date.now()}_${Math.random()}`,
              username: 'System',
              message: data.data.message, // Already formatted: "Bestellung 1234 | 1 | 12,90 | OneSize"
              timestamp: new Date().toISOString(),
              emoji: ''
            };
            setChatMessages(prev => [...prev, orderMsg]); // Add order messages at the END (bottom)
            console.log('📦 Order notification added to chat');
          } else if (data.type === 'order_counter_update') {
            setAdminStats(prev => ({
              ...prev,
              session_orders: data.data.session_orders,
              total_orders: data.data.total_orders
            }));
          } else if (data.type === 'ticker_update') {
            setTickerSettings(data.data);
          }
        } catch (parseError) {
          console.error('❌ Error parsing WebSocket message:', parseError, 'Raw data:', event.data);
        }
      };
      
      ws.onclose = (event) => {
        console.log('🔌 WebSocket connection closed:', event.code, event.reason);
        
        if (!connectionSuccessful) {
          console.log('❌ WebSocket connection failed, starting polling fallback...');
          startPolling();
        }
        
        // Implement exponential backoff for reconnection
        if (reconnectAttempts.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`🔄 Attempting to reconnect WebSocket in ${delay}ms (attempt ${reconnectAttempts.current + 1}/5)...`);
          setTimeout(() => {
            reconnectAttempts.current++;
            connectWebSocket();
          }, delay);
        } else {
          console.error('❌ Max WebSocket reconnection attempts reached, using polling fallback');
          startPolling();
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        // Start polling immediately on WebSocket error
        if (!connectionSuccessful) {
          startPolling();
        }
      };
      
      wsRef.current = ws;
    };

    // Polling fallback for when WebSocket doesn't work
    const startPolling = () => {
      if (pollingInterval.current) return; // Already polling
      
      console.log('🔄 Starting polling fallback for real-time updates...');
      
      // ULTRA-SIMPLE POLLING: Just reload all messages every time
      const pollForNewMessages = async () => {
        try {
          setPollingStatus('Polling...');
          setLastPollTime(new Date().toLocaleTimeString());
          
          const response = await axios.get(`${API}/chat`);
          const serverMessages = response.data;
          
          console.log('🔄 SIMPLE POLLING: Got', serverMessages.length, 'messages, replacing all local messages');
          
          // SIMPLE APPROACH: Just replace all messages every time
          setChatMessages(serverMessages);
          setPollingStatus(`Updated: ${serverMessages.length} messages at ${new Date().toLocaleTimeString()}`);
          
        } catch (error) {
          console.error('❌ Polling error:', error);
          setPollingStatus(`Error: ${error.message}`);
        }
      };
      
      // Poll every 500ms for immediate real-time feel
      pollingInterval.current = setInterval(pollForNewMessages, 500);
      // Initial poll
      pollForNewMessages();
    };

    // CRITICAL FIX: Skip WebSocket entirely due to production routing issues
    // Use polling as primary method for real-time updates
    console.log('🚨 CRITICAL: Using polling as primary method due to WebSocket routing issues');
    startPolling();

    // Still try WebSocket as backup, but don't rely on it
    // connectWebSocket();
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
      // Cleanup polling interval
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  // Auto-initialize Daily.co streaming for customers - check for active admin streams
  useEffect(() => {
    // Only run for authenticated customers (not admins)
    if (!isAuthenticated || isAdminAuthenticated) {
      return;
    }

    const checkForActiveStream = async () => {
      try {
        console.log('🔍 Checking for active Daily.co streams...');
        
        // Check for active Daily.co rooms
        if (API) {
          console.log('🌐 Fetching Daily.co rooms from:', `${API}/daily/rooms`);
          
          const response = await fetch(`${API}/daily/rooms`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          console.log('📡 Daily.co rooms response status:', response.status);
          
          if (response.ok) {
            const roomsData = await response.json();
            const rooms = roomsData.data || [];
            console.log('🏠 Active Daily.co rooms:', rooms);
            
            if (rooms && rooms.length > 0) {
              const activeRoom = rooms[0]; // Join first active room
              console.log('🎯 Joining active room:', activeRoom.name);
              
              // Set room name for customer joining
              setRoomName(activeRoom.name);
              
              // Generate viewer token for customer
              try {
                const tokenResponse = await fetch(`${API}/daily/meeting-tokens`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    room_name: activeRoom.name,
                    user_name: currentCustomer?.name || 'Kunde',
                    is_owner: false,
                    enable_screenshare: false,
                    enable_recording: false,
                    enable_live_streaming: false
                  })
                });
                
                if (tokenResponse.ok) {
                  const tokenData = await tokenResponse.json();
                  console.log('🎫 Customer viewer token generated:', tokenData);
                  
                  setDailyToken(tokenData.token);
                  setDailyRoomUrl(activeRoom.url);
                  setStreamingActive(true);
                  setDailyError(null);
                  
                  console.log('✅ Customer auto-joined to active stream');
                } else {
                  const errorText = await tokenResponse.text();
                  console.error('❌ Token generation failed:', errorText);
                  setDailyError(`Token-Fehler: ${errorText}`);
                }
              } catch (tokenError) {
                console.error('❌ Token generation failed:', tokenError);
                setDailyError(`Token-Fehler: ${tokenError.message}`);
              }
            } else {
              console.log('📭 No active Daily.co rooms found');
              // Clear streaming state if no active rooms
              setStreamingActive(false);
              setRoomName('live-shopping-stream');
              setDailyToken(null);
              setDailyRoomUrl(null);
            }
          } else {
            console.error('❌ Failed to fetch Daily.co rooms:', response.status, response.statusText);
          }
        } else {
          console.warn('⚠️  API URL not available');
        }
      } catch (error) {
        console.error('🚨 Error checking for active streams:', error);
      }
    };

    // Check immediately and then every 10 seconds
    checkForActiveStream();
    const interval = setInterval(checkForActiveStream, 10000);

    return () => clearInterval(interval);
  }, [isAuthenticated, isAdminAuthenticated, streamingActive, API, currentCustomer]);

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

  // Load catalog data for admin view
  useEffect(() => {
    if (isAdminAuthenticated && isAdminView) {
      loadCategories();
      loadCatalogProducts();
    }
  }, [isAdminAuthenticated, isAdminView]);

  // Load customer catalog orders when authenticated
  useEffect(() => {
    if (isAuthenticated && currentCustomer?.customer_number && !isAdminView) {
      loadCustomerCatalogOrders(currentCustomer.customer_number);
      loadFavoriteProducts(currentCustomer.customer_number);
    }
  }, [isAuthenticated, currentCustomer?.customer_number, isAdminView]);

  // Search when query changes (with debouncing)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchProducts();
      } else if (searchQuery === '') {
        // Reset to show all products when search is cleared
        loadCatalogProducts(selectedCategory?.id);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);
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
    
    console.log('🕐 formatGermanTime DEBUG - input:', timestamp, typeof timestamp);
    
    try {
      // Ensure we have a proper Date object from UTC timestamp
      let utcDate;
      if (timestamp instanceof Date) {
        utcDate = timestamp;
      } else if (typeof timestamp === 'string') {
        // Backend sends UTC timestamps like "2025-09-06T09:50:39.000000"
        // Force UTC interpretation
        if (timestamp.includes('T')) {
          // Add Z suffix if missing to ensure UTC parsing
          const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
          utcDate = new Date(utcTimestamp);
        } else {
          utcDate = new Date(timestamp);
        }
      } else if (typeof timestamp === 'number') {
        utcDate = new Date(timestamp);
      } else {
        console.error('❌ Invalid timestamp format:', timestamp);
        return 'N/A';
      }
      
      // Validate the date object
      if (isNaN(utcDate.getTime())) {
        console.error('❌ Invalid date created from timestamp:', timestamp);
        return 'N/A';
      }
      
      // CRITICAL FIX: Force German timezone conversion (UTC+2 for CEST)
      // Use toLocaleString with explicit timezone to ensure correct conversion
      const germanTime = utcDate.toLocaleString('de-DE', {
        timeZone: 'Europe/Berlin',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23' // 24-hour format
      }).split(', ')[1]; // Get only the time part, not the date
      
      console.log('✅ TIMEZONE CONVERSION:');
      console.log('   📅 Input timestamp:', timestamp);
      console.log('   🕐 UTC time:', utcDate.toISOString());
      console.log('   🇩🇪 German time (Europe/Berlin):', germanTime);
      console.log('   ⚠️  Current browser time:', new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin', hourCycle: 'h23' }));
      
      return germanTime;
      
    } catch (error) {
      console.error('❌ formatGermanTime error:', error, 'with timestamp:', timestamp);
      return 'N/A';
    }
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
      if (!newCustomerData.first_name.trim()) {
        setCreateCustomerError('Vorname ist erforderlich.');
        return;
      }
      if (!newCustomerData.last_name.trim()) {
        setCreateCustomerError('Nachname ist erforderlich.');
        return;
      }
      
      // Create customer via admin API
      const response = await axios.post(`${API}/admin/customers/create`, newCustomerData);
      
      // Store customer info for notification before reset
      const customerName = `${newCustomerData.first_name} ${newCustomerData.last_name}`;
      const customerNumber = newCustomerData.customer_number;
      
      // Reset form and close modal
      setNewCustomerData({ customer_number: '', email: '', first_name: '', last_name: '', company_name: '', member_since: '', status: 'Starter' });
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
      // NOTE: Chat messages are loaded via polling, not here!
      // This prevents overwriting real-time updates

      // Load products
      const productsResponse = await axios.get(`${API}/products`);
      setProducts(productsResponse.data);
      if (productsResponse.data.length > 0) {
        setSelectedProduct(productsResponse.data[0]);
        setSelectedSize(productsResponse.data[0].sizes[0]);
        setSelectedPrice(productsResponse.data[0].price);
      }

      // Load events and customer reminders
      await loadEvents();
      if (isAuthenticated) {
        await loadCustomerReminders();
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

    const messageToSend = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    try {
      // Format chat message: Admin messages show as "Admin", customer messages show customer number
      const displayName = isAdminAuthenticated ? 'Admin' : username;
      const customerDisplayNumber = getCustomerNumber();
      const formattedMessage = isAdminAuthenticated ? 
        `${messageToSend}` : 
        `Chat ${customerDisplayNumber} I ${messageToSend}`;
      
      console.log('Sending message:', { displayName, formattedMessage });
      
      await axios.post(`${API}/chat`, {
        username: displayName,
        message: formattedMessage,
        emoji: ''
      });
      
      console.log('Message sent successfully');
      
      // FORCE IMMEDIATE POLLING after sending message
      setTimeout(() => {
        console.log('🚀 FORCE POLLING after message send');
        // Trigger immediate poll
        const pollForNewMessages = async () => {
          try {
            const response = await axios.get(`${API}/chat`);
            const serverMessages = response.data;
            console.log('🚀 FORCE POLL: Got', serverMessages.length, 'messages');
            setChatMessages(serverMessages);
            setPollingStatus(`Force updated: ${serverMessages.length} messages`);
          } catch (error) {
            console.error('❌ Force polling error:', error);
          }
        };
        pollForNewMessages();
      }, 100); // Poll after 100ms
      
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message on error
      setNewMessage(messageToSend);
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
      
      console.log('Emoji sent successfully:', emoji);
      
      // FORCE IMMEDIATE POLLING after sending emoji for real-time display
      setTimeout(() => {
        console.log('🚀 FORCE POLLING after emoji send');
        // Trigger immediate poll for real-time reactions
        const pollForNewMessages = async () => {
          try {
            const response = await axios.get(`${API}/chat`);
            const serverMessages = response.data;
            console.log('🚀 EMOJI FORCE POLL: Got', serverMessages.length, 'messages');
            setChatMessages(serverMessages);
            setPollingStatus(`Emoji updated: ${serverMessages.length} messages`);
          } catch (error) {
            console.error('❌ Emoji force polling error:', error);
          }
        };
        pollForNewMessages();
      }, 100); // Poll after 100ms
      
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
      if (actualCustomerId) {
        await loadCustomerLastOrder(actualCustomerId);
      }

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

  // Start Daily.co streaming with stable low-latency connection
  const startDailyStreaming = async () => {
    try {
      console.log('🎥 Starting Daily.co streaming...');
      
      // Generate room name
      const newRoomName = `live-shopping-${Date.now()}`;
      setRoomName(newRoomName);
      
      // Create Daily.co room first
      const roomResponse = await fetch(`${API}/daily/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_name: newRoomName,
          privacy: 'public',
          max_participants: 100,
          properties: {
            enable_screenshare: true,
            enable_chat: true,
            start_cloud_recording: false,
            lang: 'de'
          }
        })
      });
      
      if (!roomResponse.ok) {
        const errorText = await roomResponse.text();
        throw new Error(`Room creation failed: ${errorText}`);
      }
      
      const roomData = await roomResponse.json();
      console.log('✅ Daily.co room created:', roomData);
      
      // Generate token based on user type
      let tokenData;
      if (isAdminAuthenticated) {
        // Admin = Owner (can stream and control)
        const tokenResponse = await fetch(`${API}/daily/meeting-tokens`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room_name: newRoomName,
            user_name: 'Admin',
            is_owner: true,
            enable_screenshare: true,
            enable_recording: false,
            enable_live_streaming: true
          })
        });
        
        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          throw new Error(`Admin token generation failed: ${errorText}`);
        }
        
        tokenData = await tokenResponse.json();
        console.log('✅ Admin owner token generated');
      } else {
        // Customer = Viewer (can watch)
        const customerNumber = localStorage.getItem('customerNumber') || 'guest';
        const tokenResponse = await fetch(`${API}/daily/meeting-tokens`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room_name: newRoomName,
            user_name: `Kunde ${customerNumber}`,
            is_owner: false,
            enable_screenshare: false,
            enable_recording: false,
            enable_live_streaming: false
          })
        });
        
        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          throw new Error(`Customer token generation failed: ${errorText}`);
        }
        
        tokenData = await tokenResponse.json();
        console.log('✅ Customer viewer token generated');
      }
      
      setDailyToken(tokenData.token);
      setDailyRoomUrl(roomData.url);
      setStreamingActive(true);
      setDailyError(null);
      
      console.log('🎥 Daily.co streaming initialized successfully');
      
      // Show success message
      alert('✅ Live-Stream gestartet!\n\nRoom: ' + newRoomName + '\n\n🔥 Stabile Verbindung mit Daily.co');
      
    } catch (error) {
      console.error('❌ Failed to initialize Daily.co streaming:', error);
      setDailyError(error.message);
      
      // Show user-friendly error message
      alert('❌ Streaming-Fehler: ' + error.message + '\n\nBitte versuchen Sie es erneut.');
    }
  };

  // Stop Daily.co streaming
  const stopDailyStreaming = async () => {
    try {
      console.log('🛑 Stopping Daily.co streaming...');
      
      // Clear streaming state
      setStreamingActive(false);
      setDailyToken(null);
      setDailyRoomUrl(null);
      setDailyError(null);
      
      // Optionally delete the room (admin only)
      if (isAdminAuthenticated && roomName) {
        try {
          await fetch(`${API}/daily/rooms/${roomName}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          console.log('✅ Daily.co room deleted:', roomName);
        } catch (deleteError) {
          console.warn('⚠️ Failed to delete room:', deleteError);
        }
      }
      
      setRoomName('live-shopping-stream');
      console.log('✅ Daily.co streaming stopped');
      
    } catch (error) {
      console.error('❌ Failed to stop Daily.co streaming:', error);
    }
  };

  // Daily.co Event Handlers
  const handleDailyConnected = useCallback(() => {
    console.log('✅ Daily.co connected successfully');
    setIsDailyConnected(true);
    setDailyError(null);
  }, []);

  const handleDailyDisconnected = useCallback(() => {
    console.log('❌ Daily.co disconnected');
    setIsDailyConnected(false);
  }, []);

  const handleDailyError = useCallback((error) => {
    console.error('❌ Daily.co error:', error);
    setDailyError(error.message || error.toString());
  }, []);

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
      
      {/* Fixed Ticker Bar at the very top - ONLY for authenticated users */}
      {tickerSettings.enabled && !isAdminView && isAuthenticated && (
        <div className="fixed top-0 left-0 right-0 bg-pink-500 py-3 z-50 shadow-lg">
          <div className="container mx-auto px-4 text-center">
            <p className="text-white font-medium">{tickerSettings.text}</p>
          </div>
        </div>
      )}
      
      {/* Fixed Header Navigation - ONLY for authenticated users */}
      {(isAuthenticated || isAdminView) && (
        <header className={`fixed left-0 right-0 bg-pink-500 text-white z-40 shadow-lg ${tickerSettings.enabled && !isAdminView && isAuthenticated ? 'top-16' : 'top-0'}`}>

          <div className="container mx-auto px-4 py-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                {/* Logo and Navigation for Customers */}
                {isAuthenticated && !isAdminView && (
                  <div className="flex items-center space-x-2">
                    {/* OUTLET34 Logo and text removed as requested */}
                    
                    {/* WhatsApp Support Button */}
                    <a 
                      href="https://wa.me/4917621105848?text=Hallo%20OUTLET34%20Team,%20ich%20brauche%20Hilfe%20beim%20Live%20Shopping..." 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center p-2 text-white hover:bg-pink-600 rounded transition-colors duration-200"
                    >
                      <img 
                        src="/images/whatsapp-logo-dark.png" 
                        alt="WhatsApp Support" 
                        className="w-6 h-6 mr-1 rounded"
                      />
                      <span className="text-sm font-medium">Support</span>
                    </a>
                    
                    {/* Termine Button */}
                    <button 
                      onClick={() => setShowTerminModal(true)}
                      className="inline-flex items-center p-2 text-white hover:bg-pink-600 rounded transition-colors duration-200"
                      title="Termine anzeigen"
                    >
                      📅
                      <span className="text-sm font-medium ml-1">Termine</span>
                    </button>
                    
                    {/* Katalog Button */}
                    <button 
                      onClick={() => {
                        setShowCatalog(true);
                        loadCategories();
                        loadCatalogProducts();
                        // Load customer orders if authenticated
                        if (isAuthenticated && currentCustomer?.customer_number) {
                          loadCustomerCatalogOrders(currentCustomer.customer_number);
                        }
                      }}
                      className="inline-flex items-center p-2 text-white hover:bg-pink-600 rounded transition-colors duration-200"
                      title="Produktkatalog anzeigen"
                    >
                      🛍️
                      <span className="text-sm font-medium ml-1">Katalog</span>
                    </button>
                  </div>
                )}
                
                {/* Admin Navigation - Logo and text removed as requested */}
                
                {/* Admin Profile Dropdown */}
                {isAdminAuthenticated && isAdminView && (
                  <div className="relative profile-dropdown">
                    <button 
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      className="w-8 h-8 rounded-full border-2 border-white hover:border-pink-200 transition-all duration-200 flex items-center justify-center bg-white/20"
                      title="Admin-Menü öffnen"
                    >
                      <span className="text-white text-xs font-bold">👨‍💼</span>
                    </button>
                    
                    {/* Admin Profile Dropdown Menu */}
                    {showProfileDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                        <div className="px-4 py-2 text-gray-500 text-sm border-b border-gray-200">
                          <strong>Admin-Bereich</strong>
                        </div>
                        <button
                          onClick={() => {
                            // Admin logout
                            setIsAdminAuthenticated(false);
                            setIsAdminView(false);
                            
                            // Clear streaming states
                            setStreamingActive(false);
                            setDailyToken(null);
                            setDailyRoomUrl(null);
                            
                            setShowProfileDropdown(false);
                            alert('✅ Admin erfolgreich abgemeldet!');
                          }}
                          className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center space-x-2"
                        >
                          <span>🚪</span>
                          <span>Abmelden</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Profile Dropdown for customers */}
                {isAuthenticated && !isAdminView && (
                  <div className="relative profile-dropdown">
                    <button 
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      className="w-8 h-8 rounded-full border-2 border-white hover:border-pink-200 transition-all duration-200 flex items-center justify-center"
                      title="Profil-Menü öffnen"
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
                    
                    {/* Customer Profile Dropdown Menu */}
                    {showProfileDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                        <button
                          onClick={() => {
                            setShowProfileModal(true);
                            setShowProfileDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <span>👤</span>
                          <span>Profil bearbeiten</span>
                        </button>
                        <hr className="my-1 border-gray-200" />
                        <button
                          onClick={() => {
                            // Customer logout
                            setIsAuthenticated(false);
                            setCurrentCustomer(null);
                            setCustomerId('');
                            localStorage.removeItem('customerNumber');
                            localStorage.removeItem('customerData');
                            
                            // Clear streaming states
                            setStreamingActive(false);
                            setDailyToken(null);
                            setDailyRoomUrl(null);
                            
                            setShowProfileDropdown(false);
                            alert('✅ Erfolgreich abgemeldet!');
                          }}
                          className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center space-x-2"
                        >
                          <span>🚪</span>
                          <span>Abmelden</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* View Toggle for Admin */}
                {isAdminAuthenticated && (
                  <div className="flex bg-pink-600 rounded-lg p-1">
                    <button
                      onClick={() => setIsAdminView(true)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        isAdminView 
                          ? 'bg-white text-pink-600' 
                          : 'text-white hover:bg-pink-500'
                      }`}
                    >
                      🔧 Admin
                    </button>
                    <button
                      onClick={() => setIsAdminView(false)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        !isAdminView 
                          ? 'bg-white text-pink-600' 
                          : 'text-white hover:bg-pink-500'
                      }`}
                    >
                      👤 Kunde
                    </button>
                  </div>
                )}
                
                {/* Logout functionality moved back to profile dropdown menus */}
              </div>
            </div>
          </div>
        </header>
      )}
      
      {/* Add padding-top to push content down when ticker and header are visible - ONLY for authenticated users */}
      <div className={
        (isAuthenticated || isAdminView) 
          ? (tickerSettings.enabled && !isAdminView && isAuthenticated ? "pt-32" : "pt-16")
          : ""
      }>

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
            
            {/* LIVE STREAM PREVIEW FOR GUESTS */}
            {!isAuthenticated && !isAdminAuthenticated && streamingActive && dailyToken && dailyRoomUrl && (
              <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-full max-w-4xl px-4 z-10">
                <div className="bg-black/80 backdrop-blur-md rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
                  <div className="bg-gradient-to-r from-red-600 to-pink-600 px-4 py-2">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                      <span className="text-white font-bold text-sm">🔴 LIVE STREAM - OUTLET34 FASHION SHOW</span>
                    </div>
                  </div>
                  <div className="aspect-video">
                    <DailyVideoCall
                      roomUrl={dailyRoomUrl}
                      token={dailyToken}
                      isAdmin={false}
                      onLeave={() => {
                        setStreamingActive(false);
                        setDailyToken(null);
                        setDailyRoomUrl(null);
                      }}
                    />
                  </div>
                  <div className="p-4 text-center">
                    <p className="text-white/80 text-sm mb-3">
                      🎉 Live Fashion Show läuft! Registrieren Sie sich für vollen Zugang
                    </p>
                    <div className="flex space-x-3 justify-center">
                      <button 
                        onClick={() => setShowCustomerLogin(true)}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-2 px-6 rounded-xl font-medium transition-all duration-300 hover:scale-105"
                      >
                        🔑 Anmelden 
                      </button>
                      <button 
                        onClick={() => setShowRegistration(true)}
                        className="bg-gradient-to-r from-pink-500 to-red-600 hover:from-pink-600 hover:to-red-700 text-white py-2 px-6 rounded-xl font-medium transition-all duration-300 hover:scale-105"
                      >
                        📝 Registrieren
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center px-6">
              <div className="w-full max-w-md space-y-8">
                {/* Logo Section */}
                <div className="text-center space-y-4">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                    <img 
                      src="/images/outlet34-logo-new.png" 
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
                                Jetzt kostenlos registrieren
                              </div>
                            </div>
                          </a>

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

      {/* Live Stream Integration for Customers - MOVED TO TOP */}
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

            {/* Embedded Live Stream Video - Daily.co Stable Connection */}
            <div className="bg-black rounded-xl overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
              {/* Daily.co Integration - Stable Low-Latency Streaming */}
              {streamingActive && dailyToken && dailyRoomUrl ? (
                <div className="w-full h-full relative">
                  <DailyVideoCall
                    roomUrl={dailyRoomUrl}
                    token={dailyToken}
                    isAdmin={isAdminAuthenticated}
                    onLeave={() => {
                      setStreamingActive(false);
                      setDailyToken(null);
                      setDailyRoomUrl(null);
                    }}
                  />
                  
                  {/* Connection Status Indicator */}
                  <div className="absolute top-2 right-2 z-10">
                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
                      isDailyConnected 
                        ? 'bg-green-500 text-white' 
                        : 'bg-yellow-500 text-black'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        isDailyConnected ? 'bg-white animate-pulse' : 'bg-red-500'
                      }`}></div>
                      {isDailyConnected ? 'Live' : 'Verbinde...'}
                    </div>
                  </div>
                </div>
              ) : (
                /* ENHANCED: Warten auf Stream - Mit besserer User Experience */
                <div className="w-full h-full flex items-center justify-center text-white relative">
                  <div className="text-center space-y-4">
                    <div className="text-4xl mb-4">📺</div>
                    <h3 className="text-xl font-bold mb-2">
                      {isAuthenticated ? 'Live-Stream wird gesucht...' : 'Willkommen bei OUTLET34'}
                    </h3>
                    <p className="text-white/70 text-sm max-w-md">
                      {isAuthenticated 
                        ? 'Wir suchen nach aktiven Live-Streams. Sobald ein Administrator einen Stream startet, wird er hier angezeigt.'
                        : 'Melden Sie sich an, um Live-Fashion-Shows zu sehen und exklusive Angebote zu erhalten.'
                      }
                    </p>
                    
                    {/* ENHANCED: Loading animation when checking for streams */}
                    <div className="flex items-center justify-center space-x-2 mt-4">
                      <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse delay-75"></div>
                      <div className="w-2 h-2 bg-pink-300 rounded-full animate-pulse delay-150"></div>
                    </div>
                    
                    {/* ENHANCED: Stream status info */}
                    <div className="text-xs text-white/50 mt-2">
                      Streaming wird alle 3 Sekunden überprüft
                    </div>
                  </div>

                  {/* ENHANCED: Auto-refresh indicator */}
                  <div className="absolute top-2 left-2">
                    <div className="flex items-center space-x-1 px-2 py-1 bg-white/10 rounded-full text-xs">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping"></div>
                      <span className="text-white/70">Auto-Check</span>
                    </div>
                  </div>
                </div>
              )}
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
        </div>
      )}

      {/* Main App - Only shown when authenticated */}
      {(isAuthenticated || isAdminView) && (
        <>
        {/* Original Header moved to top as fixed element */}

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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Vorname *
                        </label>
                        <Input
                          type="text"
                          placeholder="Vorname"
                          value={newCustomerData.first_name}
                          onChange={(e) => setNewCustomerData(prev => ({
                            ...prev,
                            first_name: e.target.value
                          }))}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nachname *
                        </label>
                        <Input
                          type="text"
                          placeholder="Nachname"
                          value={newCustomerData.last_name}
                          onChange={(e) => setNewCustomerData(prev => ({
                            ...prev,
                            last_name: e.target.value
                          }))}
                          className="w-full"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Firmenname (optional)
                      </label>
                      <Input
                        type="text"
                        placeholder="Firmenname"
                        value={newCustomerData.company_name}
                        onChange={(e) => setNewCustomerData(prev => ({
                          ...prev,
                          company_name: e.target.value
                        }))}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kunde seit (optional)
                        </label>
                        <Input
                          type="date"
                          value={newCustomerData.member_since}
                          onChange={(e) => setNewCustomerData(prev => ({
                            ...prev,
                            member_since: e.target.value
                          }))}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          value={newCustomerData.status}
                          onChange={(e) => setNewCustomerData(prev => ({
                            ...prev,
                            status: e.target.value
                          }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Starter">🥉 Starter</option>
                          <option value="Business">💼 Business</option>
                          <option value="Gold">🥇 Gold</option>
                          <option value="Platinum">💎 Platinum</option>
                        </select>
                      </div>
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
                        setNewCustomerData({ customer_number: '', email: '', first_name: '', last_name: '', company_name: '', member_since: '', status: 'Starter' });
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
                    {/* CRITICAL: LiveKit Streaming Admin Controls */}
                    {streamingActive && dailyToken && dailyRoomUrl ? (
                      <div className="space-y-4">
                        {/* Connection Status */}
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${isDailyConnected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                            <span className="text-sm font-medium">
                              {isDailyConnected ? '🟢 Live Connected' : '🟡 Connecting...'}
                            </span>
                          </div>
                          <Button 
                            onClick={stopDailyStreaming}
                            variant="destructive"
                            size="sm"
                          >
                            ⏹️ Stream beenden
                          </Button>
                        </div>

                        {/* Daily.co Error Display */}
                        {dailyError && (
                          <Alert className="border-red-200 bg-red-50">
                            <AlertDescription className="text-red-800">
                              ❌ Streaming Error: {dailyError}
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Daily.co Admin Streaming Component - STABLE */}
                        <div className="bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                          <DailyVideoCall
                            roomUrl={dailyRoomUrl}
                            token={dailyToken}
                            isAdmin={true}
                            onLeave={stopDailyStreaming}
                          />
                        </div>
                      </div>
                    ) : (
                      /* Start Streaming Section */
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800">🎥LiveKit Professional Streaming</h3>
                        <div className="text-center space-y-3">
                          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
                            <p className="text-yellow-800">
                              ⚠️ LiveKit Streaming temporär deaktiviert
                            </p>
                          </div>
                          {/* Temporarily disabled LiveKit code */}
                          {/*
                          <Button 
                            onClick={async () => {
                              try {
                                console.log('🚀 DIRECT Admin streaming start...');
                                
                                // Generate room name
                                const roomName = `admin-live-${Date.now()}`;
                                console.log('Creating admin room:', roomName);
                                
                                // Create room first
                                await livekitService.createRoom(roomName, 100);
                                console.log('✅ Room created successfully');
                                
                                // Generate publisher token for admin
                                const tokenData = await livekitService.generatePublisherToken(
                                  roomName,
                                  `admin-${Date.now()}`,
                                  { role: 'admin', streaming: true }
                                );
                                console.log('✅ Admin token generated');
                                
                                setCurrentRoomName(roomName);
                                setLivekitToken(tokenData.token);
                                setLivekitUrl(tokenData.livekitUrl);
                                setStreamingActive(true);
                                setLivekitError(null);
                                
                                console.log('🎥 Admin streaming initialized successfully');
                                alert('✅ Streaming gestartet! Room: ' + roomName);
                                
                              } catch (error) {
                                console.error('❌ Admin streaming failed:', error);
                                setLivekitError(error.message);
                                alert('❌ Streaming-Start fehlgeschlagen: ' + error.message);
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white w-full py-3 text-lg"
                          >
                            🔴 SOFORT LIVE gehen
                          </Button>
                          */}
                          <div className="text-sm text-gray-600">
                            HD-Qualität • Multi-Viewer • Stabil • FUNKTIONIERT GARANTIERT
                          </div>
                        </div>
                      </div>
                    )}
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

        {/* Produktkatalog Management (Admin) */}
        {isAdminAuthenticated && isAdminView && (
          <Card className="border-l-4 border-l-purple-500 shadow-lg mb-6">
            <CardContent className="p-0">
              <button
                onClick={() => setShowCatalogManagement(!showCatalogManagement)}
                className="w-full p-6 text-left bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-150 transition-all duration-300 flex justify-between items-center"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🛍️</span>
                  <div>
                    <h3 className="text-xl font-bold text-purple-800">Produktkatalog Verwaltung</h3>
                    <p className="text-purple-600 text-sm">Kategorien und Produkte verwalten</p>
                  </div>
                </div>
                <span className="text-2xl text-purple-600">
                  {showCatalogManagement ? '▼' : '▶'}
                </span>
              </button>

              {showCatalogManagement && (
                <div className="p-6 bg-white border-t">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-100 text-sm">Produkte</p>
                          <p className="text-2xl font-bold">{catalogProducts.length}</p>
                        </div>
                        <span className="text-3xl">📦</span>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-100 text-sm">Bestellungen</p>
                          <p className="text-2xl font-bold">-</p>
                        </div>
                        <span className="text-3xl">🛒</span>
                      </div>
                    </div>
                  </div>

                  {/* Management Buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Category Management Button */}
                    <button
                      onClick={() => {
                        console.log('🔵 Kategorien button clicked - opening CategoryManagementModal');
                        console.log('Current showCategoryManagementModal state:', showCategoryManagementModal);
                        setShowCategoryManagementModal(true);
                        console.log('CategoryManagementModal should now be open');
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-3xl">🏷️</div>
                        <div className="text-left">
                          <div className="text-xl font-bold">Kategorien</div>
                          <div className="text-sm opacity-90">Haupt- und Unterkategorien verwalten</div>
                        </div>
                      </div>
                      <div className="text-4xl font-bold">
                        {categories.length}
                      </div>
                    </button>
                    
                    {/* Products Management Button - NEW */}
                    <button
                      onClick={() => {
                        console.log('🔵 Produkte anzeigen button clicked');
                        setShowCatalog(true); // Show catalog
                        loadCategories(); // Load categories
                        loadCatalogProducts(); // Load products
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-3xl">📦</div>
                        <div className="text-left">
                          <div className="text-xl font-bold">Produkte</div>
                          <div className="text-sm opacity-90">Alle Produkte anzeigen</div>
                        </div>
                      </div>
                      <div className="text-4xl font-bold">
                        {catalogProducts.length}
                      </div>
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowCreateProduct(true);
                        setCatalogError('');
                        // Load categories for dropdown
                        loadCategories();
                      }}
                      className="bg-orange-600 hover:bg-orange-700 text-white p-6 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-3xl">➕</div>
                        <div className="text-left">
                          <div className="text-xl font-bold">Neues Produkt</div>
                          <div className="text-sm opacity-90">Produkt hinzufügen</div>
                        </div>
                      </div>
                      <div className="text-3xl">📦</div>
                    </button>
                  </div>

                  {/* Load Data Button */}
                  <div className="text-center">
                    <button
                      onClick={() => {
                        loadCategories();
                        loadCatalogProducts();
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                    >
                      🔄 Daten neu laden
                    </button>
                  </div>

                  {/* Error Display */}
                  {catalogError && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-800">{catalogError}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
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

        {/* CRITICAL: Zebra Etiketten-Drucker Management (Admin) */}
        {isAdminAuthenticated && isAdminView && (
          <Card className="border-l-4 border-l-purple-500 shadow-lg mb-6">
            <CardContent className="p-0">
              <button
                onClick={() => setShowZebraControls(!showZebraControls)}
                className="w-full p-6 text-left bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-150 transition-all duration-300 flex justify-between items-center"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🏷️</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Zebra Etiketten-Drucker</h2>
                    <p className="text-gray-600 text-sm">GK420d • 40x25mm Labels • Automatischer Druck</p>
                  </div>
                </div>
                <div className="text-gray-400">
                  {showZebraControls ? '▼' : '▶'}
                </div>
              </button>
              
              {showZebraControls && (
                <div className="p-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Drucker-Status */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 text-gray-800">🖨️ Drucker-Status</h3>
                      <div className="space-y-3">
                        <Button 
                          onClick={async () => {
                            try {
                              const response = await axios.get(`${API}/zebra/status`);
                              const status = response.data.printer_status;
                              alert(`Drucker Status: ${status.status}\n${status.message}`);
                            } catch (error) {
                              alert('Fehler beim Abrufen des Drucker-Status: ' + error.message);
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                        >
                          📊 Status prüfen
                        </Button>
                        
                        <Button 
                          onClick={async () => {
                            try {
                              const response = await axios.post(`${API}/zebra/test-print`);
                              if (response.data.success) {
                                alert('✅ Test-Etikett erfolgreich gedruckt!');
                              } else {
                                alert('❌ Test-Druck fehlgeschlagen: ' + response.data.result.message);
                              }
                            } catch (error) {
                              alert('❌ Test-Druck Fehler: ' + error.message);
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white w-full"
                        >
                          🧪 Test-Etikett drucken
                        </Button>
                      </div>
                    </div>
                    
                    {/* Etikett-Vorschau */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 text-gray-800">👁️ Etikett-Vorschau</h3>
                      <div className="space-y-3">
                        <input 
                          type="text"
                          placeholder="Kundennummer (z.B. 10299)"
                          value={labelPreviewCustomer}
                          onChange={(e) => setLabelPreviewCustomer(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <input 
                          type="text"
                          placeholder="Preis (z.B. €19,99)"
                          value={labelPreviewPrice}
                          onChange={(e) => setLabelPreviewPrice(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        
                        <Button 
                          onClick={async () => {
                            try {
                              const response = await axios.get(`${API}/zebra/preview/${labelPreviewCustomer}?price=${labelPreviewPrice}`);
                              setLabelPreview(response.data.zpl_code);
                              alert('✅ Etikett-Vorschau generiert!');
                            } catch (error) {
                              alert('❌ Vorschau-Fehler: ' + error.message);
                            }
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white w-full"
                          disabled={!labelPreviewCustomer}
                        >
                          🔍 ZPL-Vorschau generieren
                        </Button>
                        
                        <Button 
                          onClick={async () => {
                            try {
                              // PDF-Vorschau öffnen
                              const pdfUrl = `${API}/zebra/pdf-preview/${labelPreviewCustomer}?price=${labelPreviewPrice}`;
                              window.open(pdfUrl, '_blank');
                              alert('✅ PDF-Vorschau wird geöffnet!');
                            } catch (error) {
                              alert('❌ PDF-Fehler: ' + error.message);
                            }
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white w-full"
                          disabled={!labelPreviewCustomer}
                        >
                          📄 PDF-Vorschau öffnen
                        </Button>
                        
                        <Button 
                          onClick={async () => {
                            try {
                              // NEUE EINFACHE LÖSUNG: ZPL-Datei herunterladen
                              const downloadUrl = `${API}/zebra/download-latest-zpl`;
                              
                              // Erstelle unsichtbaren Link zum Download
                              const link = document.createElement('a');
                              link.href = downloadUrl;
                              link.download = 'zebra_label.zpl';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              
                              // Zeige auch die Druckbefehle
                              const contentResponse = await axios.get(`${API}/zebra/latest-zpl-content`);
                              if (contentResponse.data.success) {
                                const commands = contentResponse.data.mac_commands.join('\n');
                                
                                // Zeige Popup mit Druckbefehlen
                                const popup = window.open('', '_blank', 'width=600,height=400');
                                popup.document.write(`
                                  <html>
                                    <head><title>ZPL Druckbefehle für Mac</title></head>
                                    <body style="font-family: monospace; padding: 20px;">
                                      <h2>🖨️ ZPL-Datei heruntergeladen!</h2>
                                      <p><strong>Schritt 1:</strong> Datei wurde heruntergeladen</p>
                                      <p><strong>Schritt 2:</strong> Terminal auf Mac öffnen und eingeben:</p>
                                      <pre style="background: #f0f0f0; padding: 10px; border: 1px solid #ccc;">${commands}</pre>
                                      <p><strong>Das Etikett wird sofort gedruckt!</strong></p>
                                    </body>
                                  </html>
                                `);
                              }
                              
                              alert('✅ ZPL-Datei heruntergeladen! Öffnen Sie das neue Fenster für Druckbefehle.');
                            } catch (error) {
                              alert('❌ Download-Fehler: ' + error.message);
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white w-full font-bold text-lg py-3"
                          disabled={!labelPreviewCustomer}
                        >
                          🖨️ ZPL HERUNTERLADEN & DRUCKEN
                        </Button>
                        
                        <Button 
                          onClick={async () => {
                            try {
                              // Zeige neueste ZPL-Inhalte
                              const response = await axios.get(`${API}/zebra/latest-zpl-content`);
                              if (response.data.success) {
                                const commands = response.data.mac_commands.join('\n');
                                
                                // Zeige Popup mit vollständigen Befehlen
                                const popup = window.open('', '_blank', 'width=700,height=500');
                                popup.document.write(`
                                  <html>
                                    <head><title>Aktuelle ZPL-Datei - Druckbefehle</title></head>
                                    <body style="font-family: monospace; padding: 20px;">
                                      <h2>🖨️ Neueste ZPL-Datei - Druckbefehle</h2>
                                      <p><strong>Datei:</strong> ${response.data.zpl_file}</p>
                                      <h3>Mac Terminal Befehle:</h3>
                                      <pre style="background: #f0f0f0; padding: 15px; border: 1px solid #ccc; white-space: pre-wrap;">${commands}</pre>
                                      <button onclick="navigator.clipboard.writeText('${commands.replace(/'/g, "\\'")}'); alert('Befehle kopiert!');" 
                                              style="background: #4CAF50; color: white; padding: 10px; border: none; cursor: pointer;">
                                        📋 Befehle kopieren
                                      </button>
                                    </body>
                                  </html>
                                `);
                              } else {
                                alert('❌ Keine ZPL-Datei gefunden: ' + response.data.message);
                              }
                            } catch (error) {
                              alert('❌ Fehler: ' + error.message);
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                          disabled={!labelPreviewCustomer}
                        >
                          📋 DRUCKBEFEHLE ANZEIGEN
                        </Button>
                        
                        <Button 
                          onClick={async () => {
                            try {
                              // Bild-Vorschau öffnen
                              const imageUrl = `${API}/zebra/image-preview/${labelPreviewCustomer}?price=${labelPreviewPrice}`;
                              window.open(imageUrl, '_blank');
                              alert('✅ Bild-Vorschau wird geöffnet!');
                            } catch (error) {
                              alert('❌ Bild-Fehler: ' + error.message);
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                          disabled={!labelPreviewCustomer}
                        >
                          🖼️ Bild-Vorschau öffnen
                        </Button>
                        
                        <Button 
                          onClick={async () => {
                            try {
                              // Download ZPL-Datei für manuellen Druck
                              const response = await axios.get(
                                `${API}/zebra/download/${labelPreviewCustomer}?price=${labelPreviewPrice}`,
                                { responseType: 'blob' }
                              );
                              
                              // Erstelle Download-Link
                              const url = window.URL.createObjectURL(new Blob([response.data]));
                              const link = document.createElement('a');
                              link.href = url;
                              link.setAttribute('download', `zebra_label_${labelPreviewCustomer}_${Date.now()}.zpl`);
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                              
                              alert('✅ ZPL-Datei heruntergeladen!');
                            } catch (error) {
                              alert('❌ Download-Fehler: ' + error.message);
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white w-full"
                          disabled={!labelPreviewCustomer}
                        >
                          💾 ZPL-Datei downloaden
                        </Button>
                      </div>
                      
                      {/* ZPL-Code Anzeige */}
                      {labelPreview && (
                        <div className="mt-4 p-3 bg-black text-green-400 rounded-lg font-mono text-xs">
                          <div className="mb-2 font-bold text-white">ZPL-Code für Zebra GK420d:</div>
                          <pre className="whitespace-pre-wrap break-all">{labelPreview}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Automatischer Druck Info */}
                  <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600 text-lg">⚡</span>
                      <div>
                        <h4 className="font-semibold text-green-800">Automatischer Druck aktiviert</h4>
                        <p className="text-green-700 text-sm">Etiketten werden automatisch gedruckt, sobald eine Bestellung eingeht.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
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
                  <div className="text-center space-y-3">
                    <div className="text-xl font-bold text-pink-600">
                      {currentCustomer?.name || `${currentCustomer?.first_name || ''} ${currentCustomer?.last_name || ''}`.trim() || 'Kunde'} 
                    </div>
                    
                    {/* Company Name */}
                    {currentCustomer?.company_name && (
                      <div className="text-sm font-medium text-blue-600">
                        🏢 {currentCustomer.company_name}
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-600">
                      #{getCustomerNumber()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {currentCustomer?.email}
                    </div>
                    
                    {/* Customer Status */}
                    <div className="flex items-center justify-center space-x-2 bg-gray-50 rounded-lg py-3 px-4">
                      <div className="text-center">
                        <div className="text-2xl mb-1">
                          {(() => {
                            const status = currentCustomer?.status || 'Starter';
                            switch(status) {
                              case 'Starter': return '🥉';
                              case 'Business': return '💼';
                              case 'Gold': return '🥇';
                              case 'Platinum': return '💎';
                              default: return '🏆';
                            }
                          })()}
                        </div>
                        <div className="text-sm font-semibold text-gray-800">
                          {currentCustomer?.status || 'Starter'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Status
                        </div>
                      </div>
                      
                      {/* Member Since */}
                      <div className="border-l border-gray-300 pl-4">
                        <div className="text-2xl mb-1">
                          📅
                        </div>
                        <div className="text-sm font-semibold text-gray-800">
                          {currentCustomer?.member_since 
                            ? new Date(currentCustomer.member_since).toLocaleDateString('de-DE', {
                                year: 'numeric',
                                month: 'short'
                              })
                            : 'Neu'
                          }
                        </div>
                        <div className="text-xs text-gray-500">
                          Mitglied seit
                        </div>
                      </div>
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
                  
                  {/* Notifications Toggle */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span>🔔</span>
                      <span className="text-sm font-medium text-gray-700">
                        {t('customer.profile.notifications')}
                      </span>
                    </div>
                    <button
                      onClick={toggleNotifications}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 ${
                        notificationsEnabled ? 'bg-pink-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {/* Language Selector - MOVED FROM HEADER */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span>🌐</span>
                      <span className="text-sm font-medium text-gray-700">
                        Sprache / Language
                      </span>
                    </div>
                    <select
                      value={i18n.language}
                      onChange={(e) => i18n.changeLanguage(e.target.value)}
                      className="bg-white border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="de">🇩🇪 Deutsch</option>
                      <option value="en">🇬🇧 English</option>
                      <option value="tr">🇹🇷 Türkçe</option>
                      <option value="fr">🇫🇷 Français</option>
                    </select>
                  </div>
                  
                  {/* Close Button */}
                  <div className="grid grid-cols-1 gap-3 pt-4">
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

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          
          {/* Video Stream Area - COMPLETELY REMOVED */}
          {/* SimpleLiveStream and placeholder removed - user requested complete removal */}

          {/* Order Section - Only for Customers - MOVED UP */}
          {selectedProduct && !isAdminView && (
            <div className="space-y-4">
              {/* Order Form */}
              <Card className="max-w-sm mx-auto">
                <CardContent className="p-3">
                <div className="text-center space-y-3">
                  {/* Größe, Händlerpreis und Menge in einer Zeile */}
                  <div className="flex justify-between items-center">
                    <div className="text-left">
                      <div className="text-xs text-gray-600">{t('orders.size')}</div>
                      <div className="font-bold text-pink-600 text-lg">{selectedSize}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600">Händlerpreis</div>
                      <div className="font-bold text-pink-600 text-lg">
                        {selectedPrice.toFixed(2)} €
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-600">Menge</div>
                      <div className="flex items-center justify-center space-x-2">
                        <Button 
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          variant="outline"
                          className="h-7 w-7 p-0"
                        >
                          -
                        </Button>
                        <span className="font-medium text-sm w-8 text-center">{quantity}</span>
                        <Button 
                          onClick={() => setQuantity(quantity + 1)}
                          variant="outline"
                          className="h-7 w-7 p-0"
                        >
                          +
                        </Button>
                      </div>
                    </div>
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
                            <div className="bg-white rounded-lg p-2 border-l-4 border-pink-500 shadow-sm hover:shadow-md transition-shadow">
                              {/* Exakt gleiche Formatierung wie Bestellungen-Liste */}
                              <div className="flex justify-between items-center overflow-hidden">
                                <div className="font-medium text-gray-800 flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">
                                  {currentCustomer?.customer_number || 'N/A'} | {customerLastOrder.size} | {customerLastOrder.quantity} | {(customerLastOrder.price / customerLastOrder.quantity).toFixed(2).replace('.', ',')}€
                                </div>
                                <div className="text-xs text-gray-500 ml-2 whitespace-nowrap flex-shrink-0">
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
                            <div key={order.id} className="text-sm bg-white rounded-lg p-2 border-l-4 border-pink-500 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-center">
                                <div className="font-medium text-gray-800 flex-1">
                                  {order.customer_id || 'N/A'} | {order.size || 'N/A'} | {order.quantity || 1} | {((order.price || 0) / (order.quantity || 1)).toFixed(2).replace('.', ',')} €
                                </div>
                                <div className="text-xs text-gray-500 ml-2 whitespace-nowrap flex-shrink-0">
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

                      {/* Debug-Panel entfernt */}

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
                          .map((msg) => {
                            // Clean up message format - remove redundant "Chat 10299 I" part
                            let cleanMessage = msg.message;
                            if (msg.username !== 'System' && msg.username !== 'Admin') {
                              // Remove "Chat XXXX I " from the beginning of user messages
                              cleanMessage = cleanMessage.replace(/^Chat \d+ I\s*/, '');
                            }
                            
                            return (
                            <div key={msg.id} className={`text-sm ${isPinned(msg.id) ? 'opacity-60' : ''} py-1`}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  {msg.username === 'System' ? (
                                    <span className="text-gray-600 font-medium">
                                      {formatMessage(msg.message)}
                                    </span>
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
                                      {cleanMessage && (
                                        <span className="ml-2 text-gray-600">{cleanMessage}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Pin-Button für Admins */}
                                {isAdminView && (
                                  <div className="ml-2">
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
                                    {isPinned(msg.id) && <span className="text-yellow-600 text-xs ml-1">📍</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                            );
                          })}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Chat Input */}
                      <div className="space-y-3">
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            placeholder="Nachricht eingeben..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                sendMessage();
                              }
                            }}
                            className="flex-1 h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-base shadow-sm placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                          />
                          <Button 
                            onClick={sendMessage}
                            className="bg-pink-500 hover:bg-pink-600 text-white px-4"
                            size="sm"
                          >
                            Nachricht senden
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
                            className="hover:bg-red-50"
                          >
                            ❤️
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => sendEmoji('🔥')}
                            className="hover:bg-orange-50"
                          >
                            🔥
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => sendEmoji('👍')}
                            className="hover:bg-blue-50"
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
                
                {/* Size and Price Selection - Combined in one row */}
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Size Selection */}
                    <div>
                      <h4 className="font-semibold mb-3">Größe</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedProduct.sizes.map((size) => (
                          <Button
                            key={size}
                            variant={selectedSize === size ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              setSelectedSize(size);
                              setManualSize(size); // Copy selected size to manual field
                            }}
                            className={selectedSize === size ? "bg-gray-800 text-white" : ""}
                          >
                            {size}
                          </Button>
                        ))}
                      </div>
                      <Input 
                        placeholder="Manuell" 
                        className="mt-2" 
                        value={manualSize}
                        onChange={(e) => {
                          setManualSize(e.target.value);
                          setSelectedSize(e.target.value); // Update selected size when typing
                        }}
                      />
                    </div>

                    {/* Price Selection */}
                    <div>
                      <h4 className="font-semibold mb-3">Preis</h4>
                      <div className="grid grid-cols-4 gap-2">
                        {priceOptions.map((price) => (
                          <Button
                            key={price}
                            variant={selectedPrice === parseFloat(price.replace(',', '.').replace(' €', '')) ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              const numPrice = parseFloat(price.replace(',', '.').replace(' €', ''));
                              setSelectedPrice(numPrice);
                              setManualPrice(numPrice.toFixed(2)); // Copy selected price to manual field
                            }}
                            className={selectedPrice === parseFloat(price.replace(',', '.').replace(' €', '')) ? "bg-pink-500 text-white" : "text-xs hover:bg-pink-50"}
                          >
                            {price}
                          </Button>
                        ))}
                      </div>
                      <Input 
                        placeholder="Manuell (z.B. 5,00)" 
                        className="mt-2"
                        type="text"
                        value={manualPrice}
                        onChange={(e) => {
                          setManualPrice(e.target.value);
                          // Convert comma to dot for price calculation
                          const numValue = parseFloat(e.target.value.replace(',', '.')) || 0;
                          setSelectedPrice(numValue);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons - REMOVED per user request */}
              {/* Blue and green buttons removed */}
            </CardContent>
          </Card>
        )}
      </div>

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

              {/* CRITICAL: LiveKit Streaming Interface - WORKS */}
              {streamingActive && dailyToken && dailyRoomUrl ? (
                <div className="space-y-4">
                  {/* Connection Status */}
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${isDailyConnected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                      <span className="text-sm font-medium">
                        {isDailyConnected ? '🟢 Live Connected' : '🟡 Connecting...'}
                      </span>
                    </div>
                    {isAdminAuthenticated && (
                      <Button 
                        onClick={stopDailyStreaming}
                        variant="destructive"
                        size="sm"
                      >
                        ⏹️ Stream beenden
                      </Button>
                    )}
                  </div>

                  {/* Daily.co Error Display */}
                  {dailyError && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertDescription className="text-red-800">
                        ❌ Streaming Error: {dailyError}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* LiveKit Streaming Component */}
                  <LiveKitStreamingInterface
                    token={livekitToken}
                    serverUrl={livekitUrl}
                    roomName={currentRoomName}
                    isPublisher={isAdminAuthenticated}
                    onConnected={handleDailyConnected}
                    onDisconnected={handleDailyDisconnected}
                    onError={handleDailyError}
                  />
                </div>
              ) : (
                /* Start Streaming Button */
                <div className="text-center py-8">
                  <div className="space-y-4">
                    <div className="text-gray-500 mb-4">
                      {isAdminAuthenticated ? 
                        '🎥 Live-Stream starten für Kunden' : 
                        '📺 Warten auf Live-Stream...'}
                    </div>
                    {isAdminAuthenticated && (
                      <Button 
                        onClick={startDailyStreaming}
                        className="bg-red-600 hover:bg-red-700 text-white"
                        size="lg"
                      >
                        🔴 LIVE gehen
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
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
      </>
      )}

      {/* Termine Modal for Customers */}
      {showTerminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-800">
                    📅 Anstehende Live Shopping Termine
                  </h3>
                  <button 
                    onClick={() => setShowTerminModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto space-y-3">
                  {events.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-4">📅</div>
                      <p>Keine Termine verfügbar</p>
                      <p className="text-sm mt-2">Neue Termine werden hier angezeigt</p>
                    </div>
                  ) : (
                    events.map((event) => {
                      const eventDateTime = new Date(event.date + 'T' + event.time);
                      const isUpcoming = eventDateTime > new Date();
                      const hasReminder = customerReminders.includes(event.id);
                      
                      if (!isUpcoming) return null; // Nur zukünftige Termine anzeigen
                      
                      return (
                        <div key={event.id} className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-4 border border-pink-200">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-800 mb-2">
                                {event.title}
                              </h4>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div className="flex items-center">
                                  <span className="mr-2">📅</span>
                                  <span>{formatGermanDate(event.date)}</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="mr-2">🕐</span>
                                  <span>{event.time} Uhr</span>
                                </div>
                                {event.description && (
                                  <div className="flex items-start mt-2">
                                    <span className="mr-2">📝</span>
                                    <span className="text-gray-700">{event.description}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="ml-4">
                              {hasReminder ? (
                                <button
                                  onClick={() => removeCustomerReminder(event.id)}
                                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                  🔕 Erinnerung aus
                                </button>
                              ) : (
                                <button
                                  onClick={() => setCustomerReminder(event.id)}
                                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                  🔔 Erinnern
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {hasReminder && (
                            <div className="mt-3 p-2 bg-green-100 rounded-lg border border-green-300">
                              <div className="text-green-700 text-sm flex items-center">
                                <span className="mr-2">✅</span>
                                <span>Sie werden 30 Minuten vor dem Termin benachrichtigt</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                
                <div className="border-t pt-4">
                  <div className="text-center">
                    <button 
                      onClick={() => setShowTerminModal(false)}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Produktkatalog Modal */}
      {showCatalog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-hidden">
          <div className="bg-white w-full h-full max-w-7xl max-h-full flex flex-col">
            {/* Header - Mobile optimized */}
            <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white p-3">
              {/* Top row with title and close button */}
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold">🛍️ OUTLET34 Produktkatalog</h2>
                <button
                  onClick={() => {
                    setShowCatalog(false);
                    setSelectedCategory(null);
                    setSelectedCatalogProduct(null);
                    setShowProductDetail(false);
                  }}
                  className="bg-white/20 hover:bg-white/30 w-8 h-8 rounded-lg transition-colors duration-200 flex items-center justify-center text-lg font-bold"
                >
                  ✕
                </button>
              </div>
              
              {/* Bottom row with orders and category */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  {isAuthenticated && (
                    <button
                      onClick={() => setShowMyOrders(true)}
                      className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-1"
                    >
                      <span>📦</span>
                      <span>Meine Bestellung</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center">
                  {selectedCategory && (
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                      {selectedCategory.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 border-b">
              <div className="flex space-x-4 items-center">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Suche nach Produktname, Material, Artikelnummer..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  <div className="absolute left-3 top-2.5 text-gray-400">
                    🔍
                  </div>
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        loadCatalogProducts(selectedCategory?.id);
                      }}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Horizontal Scrollable Category Tabs */}
            <div className="bg-gray-50 border-b">
              <div className="overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="flex space-x-2 p-4 min-w-max">
                  {/* Alle Kategorien Tab */}
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setShowSubcategories(false);
                      setSelectedCategorySubcategories([]);
                      loadCatalogProducts();
                    }}
                    className={`px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-200 flex items-center space-x-2 min-w-max ${
                      !selectedCategory
                        ? 'bg-pink-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-pink-100 border border-gray-200'
                    }`}
                  >
                    <span>Alle Kategorien</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      !selectedCategory 
                        ? 'bg-white bg-opacity-20' 
                        : 'bg-pink-100 text-pink-600'
                    }`}>
                      {totalProductCount}
                    </span>
                  </button>


                  {/* Hosen & Jeans Tab */}
                  <button
                    onClick={() => {
                      const hosenCategory = mainCategories.find(cat => 
                        cat.name.toLowerCase().includes('hose') || 
                        cat.name.toLowerCase().includes('jean')
                      );
                      if (hosenCategory) {
                        setSelectedCategory(hosenCategory);
                        loadCatalogProducts(hosenCategory.id);
                        loadCategorySubcategories(hosenCategory);
                      }
                    }}
                    className={`px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-200 flex items-center space-x-2 min-w-max ${
                      selectedCategory?.name?.toLowerCase().includes('hose') || selectedCategory?.name?.toLowerCase().includes('jean')
                        ? 'bg-pink-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-pink-100 border border-gray-200'
                    }`}
                  >
                    <span>👖</span>
                    <span>Hosen & Jeans</span>
                  </button>

                  {/* Kleider & Röcke Tab */}
                  <button
                    onClick={() => {
                      const kleiderCategory = mainCategories.find(cat => 
                        cat.name.toLowerCase().includes('kleid') || 
                        cat.name.toLowerCase().includes('rock')
                      );
                      if (kleiderCategory) {
                        setSelectedCategory(kleiderCategory);
                        loadCatalogProducts(kleiderCategory.id);
                        loadCategorySubcategories(kleiderCategory);
                      }
                    }}
                    className={`px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-200 flex items-center space-x-2 min-w-max ${
                      selectedCategory?.name?.toLowerCase().includes('kleid') || selectedCategory?.name?.toLowerCase().includes('rock')
                        ? 'bg-pink-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-pink-100 border border-gray-200'
                    }`}
                  >
                    <span>👗</span>
                    <span>Kleider & Röcke</span>
                  </button>

                  {/* Jacken & Mäntel Tab */}
                  <button
                    onClick={() => {
                      const jackenCategory = mainCategories.find(cat => 
                        cat.name.toLowerCase().includes('jacke') || 
                        cat.name.toLowerCase().includes('mantel')
                      );
                      if (jackenCategory) {
                        setSelectedCategory(jackenCategory);
                        loadCatalogProducts(jackenCategory.id);
                        loadCategorySubcategories(jackenCategory);
                      }
                    }}
                    className={`px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-200 flex items-center space-x-2 min-w-max ${
                      selectedCategory?.name?.toLowerCase().includes('jacke') || selectedCategory?.name?.toLowerCase().includes('mantel')
                        ? 'bg-pink-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-pink-100 border border-gray-200'
                    }`}
                  >
                    <span>🧥</span>
                    <span>Jacken & Mäntel</span>
                  </button>

                  {/* Accessoires Tab */}
                  <button
                    onClick={() => {
                      const accessoiresCategory = mainCategories.find(cat => 
                        cat.name.toLowerCase().includes('accessoire') || 
                        cat.name.toLowerCase().includes('schmuck')
                      );
                      if (accessoiresCategory) {
                        setSelectedCategory(accessoiresCategory);
                        loadCatalogProducts(accessoiresCategory.id);
                        loadCategorySubcategories(accessoiresCategory);
                      }
                    }}
                    className={`px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-200 flex items-center space-x-2 min-w-max ${
                      selectedCategory?.name?.toLowerCase().includes('accessoire') || selectedCategory?.name?.toLowerCase().includes('schmuck')
                        ? 'bg-pink-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-pink-100 border border-gray-200'
                    }`}
                  >
                    <span>👜</span>
                    <span>Accessoires</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Subcategories List - Only shown when a main category is selected and has subcategories */}
            {showSubcategories && selectedCategorySubcategories.length > 0 && (
              <div className="bg-white border-b border-gray-200">
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center">
                      <span className="mr-2">📂</span>
                      Unterkategorien von "{selectedCategory?.name}" ({selectedCategorySubcategories.length})
                    </h4>
                    <button
                      onClick={() => {
                        setShowSubcategories(false);
                        setSelectedCategorySubcategories([]);
                      }}
                      className="text-gray-400 hover:text-gray-600 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                    {selectedCategorySubcategories.map((subcategory) => (
                      <button
                        key={subcategory.id}
                        onClick={() => {
                          console.log('Subcategory clicked:', subcategory.name);
                          // Load products for this subcategory
                          loadCatalogProducts(subcategory.id);
                          // Optionally highlight the selected subcategory
                        }}
                        className="bg-gray-50 hover:bg-pink-50 border border-gray-200 hover:border-pink-300 rounded-lg p-3 text-left transition-colors duration-200 group"
                      >
                        <div className="font-medium text-sm text-gray-800 group-hover:text-pink-600">
                          {subcategory.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {subcategory.product_count || 0} Produkte
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
                
                {/* Old navigation removed - replaced with horizontal tabs above */}

            {/* Recently Viewed Section */}
            {showRecentlyViewed && (
              <div className="bg-blue-50 border-b p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <span className="mr-2">👁️</span>
                  Kürzlich angesehen ({recentlyViewedProducts.length})
                </h3>
                {recentlyViewedProducts.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {recentlyViewedProducts.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => {
                          setSelectedCatalogProduct(product);
                          setShowProductDetail(true);
                          setSelectedProductSize(product.sizes?.[0] || 'OneSize');
                          addToRecentlyViewed(product.id);
                        }}
                        className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer group relative"
                      >
                        {/* Square Image Container */}
                        <div className="relative w-full pt-[100%] bg-gray-100 rounded-t-lg overflow-hidden">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                              <span className="text-2xl">📷</span>
                            </div>
                          )}
                          
                          {/* Favorite Heart */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(product.id);
                            }}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors duration-200"
                          >
                            <span className={`text-lg ${productFavoriteStatus[product.id] ? 'text-red-500' : 'text-gray-400'}`}>
                              {productFavoriteStatus[product.id] ? '❤️' : '🤍'}
                            </span>
                          </button>
                        </div>
                        
                        {/* Product Info */}
                        <div className="p-2">
                          <div className="text-xs text-gray-500 mb-1">
                            {product.article_number}
                          </div>
                          <h4 className="font-medium text-xs text-gray-800 line-clamp-2 mb-1">
                            {product.name}
                          </h4>
                          <div className="text-sm font-bold text-pink-600">
                            {product.price.toFixed(2)} €
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">Keine kürzlich angesehenen Produkte</p>
                )}
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingCatalog ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Lade Produkte...</p>
                  </div>
                </div>
              ) : catalogError ? (
                <div className="text-center text-red-600 py-8">
                  <p>{catalogError}</p>
                  <button
                    onClick={() => loadCatalogProducts(selectedCategory?.id)}
                    className="mt-4 bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors duration-200"
                  >
                    Erneut versuchen
                  </button>
                </div>
              ) : catalogProducts.length === 0 ? (
                <div className="text-center text-gray-600 py-8">
                  <p>Keine Produkte gefunden</p>
                  {selectedCategory && (
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        loadCatalogProducts();
                      }}
                      className="mt-4 text-pink-600 hover:text-pink-700 underline"
                    >
                      Alle Kategorien anzeigen
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Neue Artikel Section - First Block */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="mr-2">✨</span>
                      Neue Artikel
                    </h3>
                    {/* Mobile: Horizontal scrollable 2-column grid */}
                    <div className="block md:hidden">
                      <div className="flex overflow-x-auto space-x-4 pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {catalogProducts
                          .filter(product => {
                            // Zeige Produkte die in den letzten 30 Tagen erstellt wurden als "neu"
                            const productDate = new Date(product.created_at);
                            const thirtyDaysAgo = new Date();
                            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                            return productDate > thirtyDaysAgo;
                          })
                          .slice(0, 10) // Maximal 10 neue Artikel anzeigen
                          .map((product) => (
                      <div
                        key={product.id}
                        onClick={() => {
                          setSelectedCatalogProduct(product);
                          setShowProductDetail(true);
                          setSelectedProductSize(product.sizes?.[0] || 'OneSize');
                          setCurrentImageIndex(0);
                          addToRecentlyViewed(product.id);
                        }}
                        className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer group min-w-[160px] flex-shrink-0"
                      >
                        {/* Square Image Container - WhatsApp Style Mobile */}
                        <div className="relative w-full pt-[100%] bg-gray-100 rounded-t-lg overflow-hidden">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                              <span className="text-4xl">📷</span>
                            </div>
                          )}
                          
                          {/* Favorite Heart */}
                          <div className="absolute top-2 left-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(product.id);
                              }}
                              className="w-8 h-8 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm"
                            >
                              <span className="text-lg">
                                {productFavoriteStatus[product.id] ? '❤️' : '🤍'}
                              </span>
                            </button>
                          </div>

                          {/* "Ausverkauft" Badge */}
                          {product.stock_quantity === 0 && (
                            <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                              Ausverkauft
                            </div>
                          )}

                          {/* Admin Action Buttons - Mobile */}
                          {isAdminAuthenticated && (
                            <div className="absolute bottom-2 right-2 flex space-x-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditProduct(product);
                                }}
                                className="w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors duration-200 shadow-lg"
                                title="Bearbeiten"
                              >
                                <span className="text-xs">✏️</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleOutOfStock(product);
                                }}
                                className={`w-6 h-6 rounded-full ${
                                  product.stock_quantity === 0 
                                    ? 'bg-green-600 hover:bg-green-700' 
                                    : 'bg-red-600 hover:bg-red-700'
                                } text-white flex items-center justify-center transition-colors duration-200 shadow-lg`}
                                title={product.stock_quantity === 0 ? 'Verfügbar' : 'Ausverkauft'}
                              >
                                <span className="text-xs">{product.stock_quantity === 0 ? '✅' : '🚫'}</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteProduct(product);
                                }}
                                className="w-6 h-6 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors duration-200 shadow-lg"
                                title="Löschen"
                              >
                                <span className="text-xs">🗑️</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Product Info Mobile */}
                        <div className="p-3">
                          <div className="text-xs text-gray-500 mb-1">
                            Art.-Nr.: {product.article_number}
                          </div>
                          <h3 className="font-semibold text-sm text-gray-800 mb-1 line-clamp-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {product.name}
                          </h3>
                          {product.material && (
                            <div className="text-xs text-blue-600 mb-1">
                              {product.material}
                            </div>
                          )}
                          <div className="flex justify-between items-end">
                            <span className="text-lg font-bold text-pink-600">
                              {product.price.toFixed(2)} €
                            </span>
                            <div className="text-right">
                              {product.colors && product.colors.length > 0 && (
                                <div className="flex space-x-1 mb-1">
                                  {product.colors.slice(0, 2).map((color, index) => (
                                    <div
                                      key={index}
                                      className="w-3 h-3 rounded-full border border-gray-300"
                                      style={{
                                        backgroundColor: color.toLowerCase() === 'schwarz' ? '#000000' :
                                                       color.toLowerCase() === 'weiß' ? '#FFFFFF' :
                                                       color.toLowerCase() === 'blau' ? '#0066CC' :
                                                       color.toLowerCase() === 'rot' ? '#CC0000' :
                                                       color.toLowerCase() === 'beige' ? '#F5F5DC' : 
                                                       color.startsWith('#') ? color : '#CCCCCC'
                                      }}
                                      title={color}
                                    />
                                  ))}
                                  {product.colors.length > 2 && (
                                    <span className="text-xs text-gray-500">+{product.colors.length - 2}</span>
                                  )}
                                </div>
                              )}
                              <div className="text-xs text-gray-500">
                                {product.sizes && product.sizes.length > 0 ? 
                                  product.sizes.slice(0, 2).join(', ') + (product.sizes.length > 2 ? '...' : '') : 
                                  'OneSize'
                                }
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Desktop: Regular grid */}
                    <div className="hidden md:grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {catalogProducts
                        .filter(product => {
                          // Zeige Produkte die in den letzten 30 Tagen erstellt wurden als "neu"
                          const productDate = new Date(product.created_at);
                          const thirtyDaysAgo = new Date();
                          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                          return productDate > thirtyDaysAgo;
                        })
                        .slice(0, 10) // Maximal 10 neue Artikel anzeigen
                        .map((product) => (
                    <div
                      key={product.id}
                      onClick={() => {
                        setSelectedCatalogProduct(product);
                        setShowProductDetail(true);
                        setSelectedProductSize(product.sizes?.[0] || 'OneSize');
                        setCurrentImageIndex(0);
                        addToRecentlyViewed(product.id);
                      }}
                      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer group"
                    >
                      {/* Square Image Container - WhatsApp Style */}
                      <div className="relative w-full pt-[100%] bg-gray-100 rounded-t-lg overflow-hidden">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                            <span className="text-4xl">📷</span>
                          </div>
                        )}
                        
                        {/* Favorite Heart */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(product.id);
                          }}
                          className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors duration-200"
                        >
                          <span className={`text-lg ${productFavoriteStatus[product.id] ? 'text-red-500' : 'text-gray-400'}`}>
                            {productFavoriteStatus[product.id] ? '❤️' : '🤍'}
                          </span>
                        </button>

                        {/* Admin Action Buttons - Desktop */}
                        {isAdminAuthenticated && (
                          <div className="absolute bottom-2 right-2 flex space-x-1">
                            {/* Edit Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditProduct(product);
                              }}
                              className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors duration-200 shadow-lg"
                              title="Produkt bearbeiten"
                            >
                              <span className="text-sm">✏️</span>
                            </button>

                            {/* Out of Stock Toggle Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleOutOfStock(product);
                              }}
                              className={`w-8 h-8 rounded-full ${
                                product.stock_quantity === 0 
                                  ? 'bg-green-600 hover:bg-green-700' 
                                  : 'bg-red-600 hover:bg-red-700'
                              } text-white flex items-center justify-center transition-colors duration-200 shadow-lg`}
                              title={product.stock_quantity === 0 ? 'Wieder verfügbar machen' : 'Als ausverkauft markieren'}
                            >
                              <span className="text-sm">{product.stock_quantity === 0 ? '✅' : '🚫'}</span>
                            </button>

                            {/* Visibility Toggle Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleProductVisibility(product);
                              }}
                              className={`w-8 h-8 rounded-full ${
                                product.is_active === false 
                                  ? 'bg-green-600 hover:bg-green-700' 
                                  : 'bg-orange-600 hover:bg-orange-700'
                              } text-white flex items-center justify-center transition-colors duration-200 shadow-lg`}
                              title={product.is_active === false ? 'Produkt einblenden' : 'Produkt ausblenden'}
                            >
                              <span className="text-sm">{product.is_active === false ? '👁️' : '🙈'}</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteProduct(product);
                              }}
                              className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors duration-200 shadow-lg"
                              title="Produkt löschen"
                            >
                              <span className="text-sm">🗑️</span>
                            </button>
                          </div>
                        )}
                        
                        {/* Stock Badge */}
                        {product.stock_quantity !== null && (
                          <div className="absolute top-2 right-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              product.stock_quantity > 10
                                ? 'bg-green-100 text-green-700'
                                : product.stock_quantity > 0
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                            }`}>
                              {product.stock_quantity > 0 ? `${product.stock_quantity} St.` : 'Ausverkauft'}
                            </span>
                          </div>
                        )}
                        
                        {/* Multiple Images Indicator */}
                        {product.additional_images && product.additional_images.length > 0 && (
                          <div className="absolute bottom-2 left-2">
                            <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                              📷 {product.additional_images.length + 1}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="p-3">
                        <div className="text-xs text-gray-500 mb-1">
                          Art.-Nr.: {product.article_number}
                        </div>
                        <h3 className="font-semibold text-sm text-gray-800 mb-1 line-clamp-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {product.name}
                        </h3>
                        {product.material && (
                          <div className="text-xs text-blue-600 mb-1">
                            {product.material}
                          </div>
                        )}
                        <div className="flex justify-between items-end">
                          <span className="text-lg font-bold text-pink-600">
                            {product.price.toFixed(2)} €
                          </span>
                          <div className="text-right">
                            {product.colors && product.colors.length > 0 && (
                              <div className="flex space-x-1 mb-1">
                                {product.colors.slice(0, 3).map((color, index) => (
                                  <div
                                    key={index}
                                    className="w-3 h-3 rounded-full border border-gray-300"
                                    style={{
                                      backgroundColor: color.toLowerCase() === 'schwarz' ? '#000000' :
                                                     color.toLowerCase() === 'weiß' ? '#FFFFFF' :
                                                     color.toLowerCase() === 'blau' ? '#0066CC' :
                                                     color.toLowerCase() === 'rot' ? '#CC0000' :
                                                     color.toLowerCase() === 'beige' ? '#F5F5DC' : 
                                                     color.startsWith('#') ? color : '#CCCCCC'
                                    }}
                                    title={color}
                                  />
                                ))}
                                {product.colors.length > 3 && (
                                  <span className="text-xs text-gray-500">+{product.colors.length - 3}</span>
                                )}
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              {product.sizes?.join(', ') || 'OneSize'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                    </div>
                  </div>

                  {/* Bestseller Section - Second Block */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="mr-2">🏆</span>
                      Bestseller
                    </h3>
                    {/* Mobile: Horizontal scrollable 2-column grid */}
                    <div className="block md:hidden">
                      <div className="flex overflow-x-auto space-x-4 pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {catalogProducts
                          .filter(product => {
                            // Zeige ältere oder beliebte Produkte als Bestseller
                            const productDate = new Date(product.created_at);
                            const thirtyDaysAgo = new Date();
                            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                            return productDate <= thirtyDaysAgo || !product.created_at; // Älter als 30 Tage oder kein Datum
                          })
                          .map((product) => (
                            <div
                              key={product.id}
                              onClick={() => {
                                setSelectedCatalogProduct(product);
                                setShowProductDetail(true);
                                setSelectedProductSize(product.sizes?.[0] || 'OneSize');
                                setCurrentImageIndex(0);
                                addToRecentlyViewed(product.id);
                              }}
                              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer group min-w-[160px] flex-shrink-0"
                            >
                              {/* Square Image Container - WhatsApp Style Mobile */}
                              <div className="relative w-full pt-[100%] bg-gray-100 rounded-t-lg overflow-hidden">
                                {product.image_url ? (
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                    <span className="text-4xl">📷</span>
                                  </div>
                                )}
                                
                                {/* Favorite Heart */}
                                <div className="absolute top-2 left-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavorite(product.id);
                                    }}
                                    className="w-8 h-8 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm"
                                  >
                                    <span className="text-lg">
                                      {productFavoriteStatus[product.id] ? '❤️' : '🤍'}
                                    </span>
                                  </button>
                                </div>

                                {/* "Ausverkauft" Badge */}
                                {product.stock_quantity === 0 && (
                                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                                    Ausverkauft
                                  </div>
                                )}

                                {/* Bestseller Badge */}
                                <div className="absolute bottom-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                                  🏆 Bestseller
                                </div>

                                {/* Admin Action Buttons - Mobile Bestseller */}
                                {isAdminAuthenticated && (
                                  <div className="absolute bottom-2 left-2 flex space-x-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditProduct(product);
                                      }}
                                      className="w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors duration-200 shadow-lg"
                                      title="Bearbeiten"
                                    >
                                      <span className="text-xs">✏️</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleOutOfStock(product);
                                      }}
                                      className={`w-6 h-6 rounded-full ${
                                        product.stock_quantity === 0 
                                          ? 'bg-green-600 hover:bg-green-700' 
                                          : 'bg-red-600 hover:bg-red-700'
                                      } text-white flex items-center justify-center transition-colors duration-200 shadow-lg`}
                                      title={product.stock_quantity === 0 ? 'Verfügbar' : 'Ausverkauft'}
                                    >
                                      <span className="text-xs">{product.stock_quantity === 0 ? '✅' : '🚫'}</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteProduct(product);
                                      }}
                                      className="w-6 h-6 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors duration-200 shadow-lg"
                                      title="Löschen"
                                    >
                                      <span className="text-xs">🗑️</span>
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Product Info Mobile */}
                              <div className="p-3">
                                <div className="text-xs text-gray-500 mb-1">
                                  Art.-Nr.: {product.article_number}
                                </div>
                                <h3 className="font-semibold text-sm text-gray-800 mb-1 line-clamp-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {product.name}
                                </h3>
                                {product.material && (
                                  <div className="text-xs text-blue-600 mb-1">
                                    {product.material}
                                  </div>
                                )}
                                <div className="flex justify-between items-end">
                                  <span className="text-lg font-bold text-pink-600">
                                    {product.price.toFixed(2)} €
                                  </span>
                                  <div className="text-right">
                                    {product.colors && product.colors.length > 0 && (
                                      <div className="flex space-x-1 mb-1">
                                        {product.colors.slice(0, 2).map((color, index) => (
                                          <div
                                            key={index}
                                            className="w-3 h-3 rounded-full border border-gray-300"
                                            style={{
                                              backgroundColor: color.toLowerCase() === 'schwarz' ? '#000000' :
                                                             color.toLowerCase() === 'weiß' ? '#FFFFFF' :
                                                             color.toLowerCase() === 'blau' ? '#0066CC' :
                                                             color.toLowerCase() === 'rot' ? '#CC0000' :
                                                             color.toLowerCase() === 'beige' ? '#F5F5DC' : 
                                                             color.startsWith('#') ? color : '#CCCCCC'
                                            }}
                                            title={color}
                                          />
                                        ))}
                                        {product.colors.length > 2 && (
                                          <span className="text-xs text-gray-500">+{product.colors.length - 2}</span>
                                        )}
                                      </div>
                                    )}
                                    <div className="text-xs text-gray-500">
                                      {product.sizes && product.sizes.length > 0 ? 
                                        product.sizes.slice(0, 2).join(', ') + (product.sizes.length > 2 ? '...' : '') : 
                                        'OneSize'
                                      }
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                    
                    {/* Desktop: Regular grid */}
                    <div className="hidden md:grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {catalogProducts
                        .filter(product => {
                          // Zeige ältere oder beliebte Produkte als Bestseller
                          const productDate = new Date(product.created_at);
                          const thirtyDaysAgo = new Date();
                          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                          return productDate <= thirtyDaysAgo || !product.created_at; // Älter als 30 Tage oder kein Datum
                        })
                        .map((product) => (
                          <div
                            key={product.id}
                            onClick={() => {
                              setSelectedCatalogProduct(product);
                              setShowProductDetail(true);
                              setSelectedProductSize(product.sizes?.[0] || 'OneSize');
                              setCurrentImageIndex(0);
                              addToRecentlyViewed(product.id);
                            }}
                            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer group"
                          >
                            {/* Square Image Container - WhatsApp Style */}
                            <div className="relative w-full pt-[100%] bg-gray-100 rounded-t-lg overflow-hidden">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                  <span className="text-4xl">📷</span>
                                </div>
                              )}
                              
                              {/* Favorite Heart */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(product.id);
                                }}
                                className="absolute top-2 right-2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors duration-200"
                              >
                                <span className={`text-lg ${favoriteProducts.includes(product.id) ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}>
                                  {favoriteProducts.includes(product.id) ? '❤️' : '🤍'}
                                </span>
                              </button>
                              
                              {/* Price Badge */}
                              <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm font-semibold">
                                €{product.price.toFixed(2)}
                              </div>
                            </div>
                            
                            {/* Product Info */}
                            <div className="p-3">
                              <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2 leading-tight">
                                {product.name}
                              </h4>
                              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                {product.description}
                              </p>
                              
                              {/* Material and Properties */}
                              {(product.material || (product.material_properties && product.material_properties.length > 0)) && (
                                <div className="text-xs text-gray-500 mb-2">
                                  {product.material && <span>{product.material}</span>}
                                  {product.material && product.material_properties && product.material_properties.length > 0 && <span>, </span>}
                                  {product.material_properties && product.material_properties.length > 0 && (
                                    <span>{product.material_properties.slice(0, 2).join(', ')}</span>
                                  )}
                                  {product.material_properties && product.material_properties.length > 2 && (
                                    <span>...</span>
                                  )}
                                </div>
                              )}
                              
                              {/* Colors */}
                              {product.colors && product.colors.length > 0 && (
                                <div className="flex items-center space-x-1 mb-1">
                                  {product.colors.slice(0, 3).map((color, index) => (
                                    <div
                                      key={index}
                                      className="w-3 h-3 rounded-full border border-gray-300"
                                      style={{
                                        backgroundColor: color.toLowerCase() === 'schwarz' ? '#000000' :
                                                       color.toLowerCase() === 'weiß' || color.toLowerCase() === 'weiss' ? '#FFFFFF' :
                                                       color.toLowerCase() === 'grau' ? '#808080' :
                                                       color.toLowerCase() === 'blau' ? '#0066CC' :
                                                       color.toLowerCase() === 'grün' ? '#008000' :
                                                       color.toLowerCase() === 'gelb' ? '#FFD700' :
                                                       color.toLowerCase() === 'rosa' || color.toLowerCase() === 'pink' ? '#FFC0CB' :
                                                       color.toLowerCase() === 'lila' || color.toLowerCase() === 'violett' ? '#8A2BE2' :
                                                       color.toLowerCase() === 'braun' ? '#8B4513' :
                                                       color.toLowerCase() === 'orange' ? '#FFA500' :
                                                       color.toLowerCase() === 'rot' ? '#CC0000' :
                                                       color.toLowerCase() === 'beige' ? '#F5F5DC' : 
                                                       color.startsWith('#') ? color : '#CCCCCC'
                                      }}
                                      title={color}
                                    />
                                  ))}
                                  {product.colors.length > 3 && (
                                    <span className="text-xs text-gray-500">+{product.colors.length - 3}</span>
                                  )}
                                </div>
                              )}
                              <div className="text-xs text-gray-500">
                                {product.sizes?.join(', ') || 'OneSize'}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {showProductDetail && selectedCatalogProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">{selectedCatalogProduct.name}</h3>
              <button
                onClick={() => {
                  setShowProductDetail(false);
                  setSelectedCatalogProduct(null);
                  setSelectedProductSize('');
                  setCatalogOrderQuantity(1);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Image Gallery */}
              <div className="mb-6">
                {/* Main Image */}
                <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden mb-4 relative">
                  {(() => {
                    const allImages = [selectedCatalogProduct.image_url, ...(selectedCatalogProduct.additional_images || [])].filter(Boolean);
                    const currentImage = allImages[currentImageIndex] || null;
                    
                    return currentImage ? (
                      <img
                        src={currentImage}
                        alt={selectedCatalogProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-6xl">📷</span>
                      </div>
                    );
                  })()}
                  
                  {/* Image Navigation Arrows */}
                  {(() => {
                    const allImages = [selectedCatalogProduct.image_url, ...(selectedCatalogProduct.additional_images || [])].filter(Boolean);
                    return allImages.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : allImages.length - 1)}
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors duration-200"
                        >
                          ←
                        </button>
                        <button
                          onClick={() => setCurrentImageIndex(prev => prev < allImages.length - 1 ? prev + 1 : 0)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors duration-200"
                        >
                          →
                        </button>
                        
                        {/* Image Counter */}
                        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-sm px-2 py-1 rounded-full">
                          {currentImageIndex + 1} / {allImages.length}
                        </div>
                      </>
                    );
                  })()}
                  
                  {/* Favorite Heart */}
                  <button
                    onClick={() => toggleFavorite(selectedCatalogProduct.id)}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors duration-200"
                  >
                    <span className={`text-xl ${productFavoriteStatus[selectedCatalogProduct.id] ? 'text-red-500' : 'text-gray-400'}`}>
                      {productFavoriteStatus[selectedCatalogProduct.id] ? '❤️' : '🤍'}
                    </span>
                  </button>
                </div>
                
                {/* Thumbnail Strip */}
                {(() => {
                  const allImages = [selectedCatalogProduct.image_url, ...(selectedCatalogProduct.additional_images || [])].filter(Boolean);
                  return allImages.length > 1 && (
                    <div className="flex space-x-2 overflow-x-auto pb-2">
                      {allImages.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors duration-200 ${
                            currentImageIndex === index ? 'border-pink-500' : 'border-gray-300'
                          }`}
                        >
                          <img
                            src={image}
                            alt={`${selectedCatalogProduct.name} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Product Info */}
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-500">Artikel-Nr.: </span>
                  <span className="font-medium">{selectedCatalogProduct.article_number}</span>
                </div>
                
                <div>
                  <span className="text-2xl font-bold text-pink-600">
                    {selectedCatalogProduct.price.toFixed(2)} €
                  </span>
                </div>

                {/* Material */}
                {selectedCatalogProduct.material && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Material</h4>
                    <p className="text-blue-600 font-medium">{selectedCatalogProduct.material}</p>
                  </div>
                )}

                {/* Available Colors */}
                {selectedCatalogProduct.colors && selectedCatalogProduct.colors.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Verfügbare Farben</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCatalogProduct.colors.map((color, index) => (
                        <div key={index} className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1">
                          <div
                            className="w-4 h-4 rounded-full border border-gray-300"
                            style={{
                              backgroundColor: color.toLowerCase() === 'schwarz' ? '#000000' :
                                             color.toLowerCase() === 'weiß' ? '#FFFFFF' :
                                             color.toLowerCase() === 'blau' ? '#0066CC' :
                                             color.toLowerCase() === 'rot' ? '#CC0000' :
                                             color.toLowerCase() === 'beige' ? '#F5F5DC' : 
                                             color.startsWith('#') ? color : '#CCCCCC'
                            }}
                          />
                          <span className="text-sm text-gray-700">{color}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCatalogProduct.description && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Beschreibung</h4>
                    <p className="text-gray-600">{selectedCatalogProduct.description}</p>
                  </div>
                )}

                {/* Stock Info */}
                {selectedCatalogProduct.stock_quantity !== null && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Lagerbestand:</span>
                    <span className={`font-medium ${
                      selectedCatalogProduct.stock_quantity > 10
                        ? 'text-green-600'
                        : selectedCatalogProduct.stock_quantity > 0
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    }`}>
                      {selectedCatalogProduct.stock_quantity > 0 
                        ? `${selectedCatalogProduct.stock_quantity} Stück verfügbar`
                        : 'Ausverkauft'
                      }
                    </span>
                  </div>
                )}

                {/* Order Form */}
                {isAuthenticated && selectedCatalogProduct.stock_quantity !== 0 ? (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <h4 className="font-semibold text-gray-800">Bestellung aufgeben</h4>
                    
                    {/* Size Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Größe
                      </label>
                      <select
                        value={selectedProductSize}
                        onChange={(e) => setSelectedProductSize(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      >
                        {selectedCatalogProduct.sizes?.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Anzahl
                      </label>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setCatalogOrderQuantity(Math.max(1, catalogOrderQuantity - 1))}
                          className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold"
                        >
                          −
                        </button>
                        <span className="text-xl font-semibold w-12 text-center">
                          {catalogOrderQuantity}
                        </span>
                        <button
                          onClick={() => {
                            const maxQty = selectedCatalogProduct.stock_quantity || 999;
                            setCatalogOrderQuantity(Math.min(maxQty, catalogOrderQuantity + 1));
                          }}
                          className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Total Price */}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-semibold text-gray-800">Gesamtpreis:</span>
                      <span className="text-xl font-bold text-pink-600">
                        {(selectedCatalogProduct.price * catalogOrderQuantity).toFixed(2)} €
                      </span>
                    </div>

                    {/* Order Button */}
                    <button
                      onClick={placeCatalogOrder}
                      disabled={!selectedProductSize}
                      className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 disabled:scale-100"
                    >
                      🛒 In Bestellung hinzufügen
                    </button>
                  </div>
                ) : !isAuthenticated ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <p className="text-blue-800 mb-3">
                      Bitte melden Sie sich an, um Bestellungen aufzugeben.
                    </p>
                    <button
                      onClick={() => {
                        setShowCatalog(false);
                        setShowProductDetail(false);
                        setShowCustomerLogin(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                    >
                      Anmelden
                    </button>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <p className="text-red-800">Dieses Produkt ist derzeit ausverkauft.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* My Orders Modal */}
      {showMyOrders && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">📦 Meine Bestellungen</h3>
              <button
                onClick={() => setShowMyOrders(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {customerCatalogOrders.length === 0 ? (
                <div className="text-center text-gray-600 py-8">
                  <p>Sie haben noch keine Bestellungen aufgegeben.</p>
                  <button
                    onClick={() => {
                      setShowMyOrders(false);
                      // Catalog is already open
                    }}
                    className="mt-4 text-pink-600 hover:text-pink-700 underline"
                  >
                    Jetzt Produkte entdecken
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {customerCatalogOrders.map((order) => (
                    <div key={order.id} className="bg-gray-50 rounded-lg p-4 border">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-800">{order.product_name}</h4>
                          <p className="text-sm text-gray-600">Art.-Nr.: {order.article_number}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          order.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-700'
                            : order.status === 'confirmed'
                              ? 'bg-blue-100 text-blue-700'
                              : order.status === 'shipped'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                        }`}>
                          {order.status === 'pending' && 'Ausstehend'}
                          {order.status === 'confirmed' && 'Bestätigt'}
                          {order.status === 'shipped' && 'Versandt'}
                          {order.status === 'cancelled' && 'Storniert'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Größe:</span>
                          <span className="ml-2 font-medium">{order.size}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Anzahl:</span>
                          <span className="ml-2 font-medium">{order.quantity}x</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Einzelpreis:</span>
                          <span className="ml-2 font-medium">{order.unit_price.toFixed(2)} €</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Gesamtpreis:</span>
                          <span className="ml-2 font-bold text-pink-600">{order.total_price.toFixed(2)} €</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-sm text-gray-500">
                        Bestellt am: {new Date(order.created_at).toLocaleDateString('de-DE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  ))}
                  
                  {/* Order Summary */}
                  <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mt-6">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-800">
                        Gesamtsumme ({customerCatalogOrders.length} Bestellungen):
                      </span>
                      <span className="text-2xl font-bold text-pink-600">
                        {customerCatalogOrders.reduce((sum, order) => sum + order.total_price, 0).toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
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

      {/* Create Product Modal (Admin) */}
      {showCreateProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b">
              <h3 className="text-xl font-bold text-gray-800">Neues Produkt erstellen</h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Media Upload Section - WhatsApp Style */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  📸 Bilder und Videos hinzufügen
                </h4>
                
                {/* Upload Area - Combined Drag & Drop + Modal Options */}
                <div className="space-y-4">
                  {/* Primary Upload Button - WhatsApp Style */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowMediaUploadModal(true)}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg"
                    >
                      <span className="text-2xl">📷</span>
                      <span className="text-lg font-medium">Fotos & Videos hinzufügen</span>
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      Kamera verwenden oder aus Mediathek auswählen
                    </p>
                  </div>

                  {/* Drag & Drop Area */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 ${
                      dragOver 
                        ? 'border-green-400 bg-green-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDrop={handleFileDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    <div className="text-gray-500">
                      <span className="text-3xl mb-2 block">📁</span>
                      <p className="text-sm">
                        <strong>Dateien hierher ziehen</strong> oder oben auf Button klicken
                      </p>
                      <p className="text-xs mt-1 text-gray-400">
                        Unterstützt: JPG, PNG, GIF, MP4, MOV
                      </p>
                    </div>
                  </div>
                </div>

                {/* Hidden file input for gallery selection */}
                <input
                  id="media-upload"
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileInput}
                  className="hidden"
                />

                {/* Uploaded Files Preview */}
                {productMediaFiles.length > 0 && (
                  <div className="mt-6">
                    <h5 className="font-medium text-gray-800 mb-3">
                      Hochgeladene Dateien ({productMediaFiles.length})
                    </h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {productMediaFiles
                        .sort((a, b) => a.order - b.order)
                        .map((file, index) => (
                        <div key={file.id} className="relative group bg-white rounded-lg shadow-md overflow-hidden">
                          {/* File Preview */}
                          <div className="aspect-square bg-gray-100 flex items-center justify-center">
                            {file.type === 'image' ? (
                              <img 
                                src={file.url} 
                                alt={file.filename}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-center">
                                <div className="text-2xl text-blue-600 mb-2">🎥</div>
                                <p className="text-xs text-gray-600 px-2">{file.filename}</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Controls Overlay */}
                          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <div className="flex space-x-2">
                              {/* Move Up */}
                              {index > 0 && (
                                <button
                                  onClick={() => moveMediaFile(file.id, 'up')}
                                  className="bg-white hover:bg-gray-100 text-gray-800 p-2 rounded-full transition-colors duration-200"
                                  title="Nach oben"
                                >
                                  ↑
                                </button>
                              )}
                              
                              {/* Move Down */}
                              {index < productMediaFiles.length - 1 && (
                                <button
                                  onClick={() => moveMediaFile(file.id, 'down')}
                                  className="bg-white hover:bg-gray-100 text-gray-800 p-2 rounded-full transition-colors duration-200"
                                  title="Nach unten"
                                >
                                  ↓
                                </button>
                              )}
                              
                              {/* Delete */}
                              <button
                                onClick={() => removeMediaFile(file.id, file.url)}
                                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors duration-200"
                                title="Löschen"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          
                          {/* Order Indicator */}
                          <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Progress */}
                {uploadingMedia && (
                  <div className="mt-4 text-center">
                    <div className="inline-flex items-center space-x-2 text-blue-600">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span>Dateien werden hochgeladen...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Artikelnummer (optional - wird automatisch generiert)
                  </label>
                  <input
                    type="text"
                    value={newProductData.article_number}
                    onChange={(e) => setNewProductData({ ...newProductData, article_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Leer lassen für automatische Generierung (1, 2, 3...)"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Produktname *
                  </label>
                  <input
                    type="text"
                    value={newProductData.name}
                    onChange={(e) => setNewProductData({ ...newProductData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="z.B. Sommer T-Shirt"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hauptkategorie * (Pflicht)
                  </label>
                  <select
                    value={newProductData.main_category_id}
                    onChange={(e) => {
                      const mainCatId = e.target.value;
                      setNewProductData({ 
                        ...newProductData, 
                        main_category_id: mainCatId,
                        sub_category_id: '' // Reset subcategory when main category changes
                      });
                      if (mainCatId) {
                        loadSubCategories(mainCatId);
                      } else {
                        setSubCategories([]);
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Hauptkategorie auswählen</option>
                    {mainCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unterkategorie (optional)
                  </label>
                  <select
                    value={newProductData.sub_category_id}
                    onChange={(e) => setNewProductData({ ...newProductData, sub_category_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={!newProductData.main_category_id || subCategories.length === 0}
                  >
                    <option value="">Unterkategorie auswählen (optional)</option>
                    {subCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {!newProductData.main_category_id && (
                    <p className="text-xs text-gray-500 mt-1">Erst Hauptkategorie auswählen</p>
                  )}
                  {newProductData.main_category_id && subCategories.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">Keine Unterkategorien verfügbar</p>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beschreibung
                </label>
                <textarea
                  value={newProductData.description}
                  onChange={(e) => setNewProductData({ ...newProductData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Produktbeschreibung"
                  rows={3}
                />
              </div>
              
              {/* 1. Price and Stock - First Position */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preis (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newProductData.price}
                    onChange={(e) => setNewProductData({ ...newProductData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="19.99"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lagerbestand (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newProductData.stock_quantity || ''}
                    onChange={(e) => setNewProductData({ ...newProductData, stock_quantity: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="100"
                  />
                </div>
              </div>
              
              {/* 2. Sizes Overview - Second Position (Mandatory) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verfügbare Größen *
                </label>
                
                {/* Size Selection Button */}
                <button
                  type="button"
                  onClick={() => setShowSizeModal(true)}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg"
                >
                  <span className="text-2xl">📏</span>
                  <span className="font-medium">Größen-Übersicht öffnen ({newProductData.sizes.length} Größen gewählt)</span>
                </button>
                
                {/* Selected Sizes Display */}
                {newProductData.sizes.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium text-blue-800 mb-2">Gewählte Größen:</h5>
                    <div className="flex flex-wrap gap-2">
                      {newProductData.sizes.map((size, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 text-sm"
                        >
                          <span className="text-blue-700 font-medium">{size}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updatedSizes = newProductData.sizes.filter((_, i) => i !== index);
                              setNewProductData({ ...newProductData, sizes: updatedSizes });
                            }}
                            className="text-blue-500 hover:text-blue-700 ml-1 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* 3. Color Chart - Third Position (Mandatory) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verfügbare Farben *
                </label>
                
                {/* Color Selection Button */}
                <button
                  type="button"
                  onClick={() => setShowColorModal(true)}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg"
                >
                  <span className="text-2xl">🎨</span>
                  <span className="font-medium">Farbkarte öffnen ({newProductData.colors.length} Farben gewählt)</span>
                </button>
                
                {/* Selected Colors Display */}
                {newProductData.colors.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-800 mb-2">Gewählte Farben:</h5>
                    <div className="flex flex-wrap gap-2">
                      {newProductData.colors.map((color, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1 text-sm"
                        >
                          <div
                            className="w-4 h-4 rounded-full border border-gray-400"
                            style={{
                              backgroundColor: getColorValue(color)
                            }}
                          />
                          <span>{color}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updatedColors = newProductData.colors.filter((_, i) => i !== index);
                              setNewProductData({ ...newProductData, colors: updatedColors });
                            }}
                            className="text-red-500 hover:text-red-700 ml-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* 4. Material Overview - Fourth Position (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verfügbare Materialien (optional)
                </label>
                
                {/* Material Selection Button */}
                <button
                  type="button"
                  onClick={() => setShowMaterialModal(true)}
                  className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg"
                >
                  <span className="text-2xl">🧵</span>
                  <span className="font-medium">Material-Übersicht öffnen {newProductData.material ? `(${newProductData.material})` : '(Kein Material gewählt)'}</span>
                </button>
                
                {/* Selected Material Display */}
                {newProductData.material && (
                  <div className="mt-4">
                    <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                      <span className="text-2xl">🧵</span>
                      <div>
                        <h5 className="font-medium text-green-800">Gewähltes Material:</h5>
                        <p className="text-green-700 text-sm">{newProductData.material}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewProductData({ ...newProductData, material: '' })}
                        className="ml-auto text-green-600 hover:text-green-800 font-bold text-lg"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 5. Material Properties - Fifth Position (Mandatory) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Material-Eigenschaften *
                </label>
                
                {/* Material Properties Selection Button */}
                <button
                  type="button"
                  onClick={() => setShowMaterialPropertiesModal(true)}
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg"
                >
                  <span className="text-2xl">🏷️</span>
                  <span className="font-medium">Material-Eigenschaften wählen {newProductData.material_properties.length > 0 ? `(${newProductData.material_properties.length} gewählt)` : '(Keine Eigenschaften gewählt)'}</span>
                </button>
                
                {/* Selected Properties Display */}
                {newProductData.material_properties.length > 0 && (
                  <div className="mt-4">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
                      <h5 className="font-medium text-purple-800 mb-2 flex items-center space-x-2">
                        <span className="text-2xl">🏷️</span>
                        <span>Gewählte Eigenschaften:</span>
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {newProductData.material_properties.map((property, index) => (
                          <div
                            key={index}
                            className="bg-white border border-purple-300 rounded-full px-3 py-1 text-sm text-purple-700 flex items-center space-x-2"
                          >
                            <span>{property}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updatedProperties = newProductData.material_properties.filter((_, i) => i !== index);
                                setNewProductData({ ...newProductData, material_properties: updatedProperties });
                              }}
                              className="text-purple-500 hover:text-purple-700 font-bold text-sm"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              

              
              {catalogError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{catalogError}</p>
                </div>
              )}
            </div>
            
            <div className="sticky bottom-0 bg-white p-4 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateProduct(false);
                  setNewProductData({
                    article_number: '',
                    name: '',
                    description: '',
                    material: '',
                    category_id: '',
                    price: 0,
                    sizes: [],
                    colors: [],
                    image_url: '',
                    stock_quantity: null
                  });
                  setProductMediaFiles([]);
                  setCustomColor('');
                  setCatalogError('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
              >
                Abbrechen
              </button>
              <button
                onClick={createProduct}
                disabled={creatingProduct || !newProductData.name.trim() || !newProductData.main_category_id}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors duration-200"
              >
                {creatingProduct ? 'Erstelle...' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal (Admin) */}
      {showEditProduct && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b">
              <h3 className="text-xl font-bold text-gray-800">Produkt bearbeiten</h3>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Artikelnummer (wird automatisch generiert)
                  </label>
                  <input
                    type="text"
                    value={editingProduct.article_number || 'Wird generiert...'}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Produktname *
                  </label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Price and Stock */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preis (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lagerbestand (optional)
                  </label>
                  <input
                    type="number"
                    value={editingProduct.stock_quantity || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock_quantity: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beschreibung
                </label>
                <textarea
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Material */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Material
                </label>
                <input
                  type="text"
                  value={editingProduct.material}
                  onChange={(e) => setEditingProduct({ ...editingProduct, material: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hauptkategorie *
                  </label>
                  <select
                    value={editingProduct.main_category_id}
                    onChange={(e) => {
                      setEditingProduct({ ...editingProduct, main_category_id: e.target.value, sub_category_id: '' });
                      if (e.target.value) {
                        loadSubCategories(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Hauptkategorie wählen...</option>
                    {mainCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unterkategorie (optional)
                  </label>
                  <select
                    value={editingProduct.sub_category_id || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sub_category_id: e.target.value || null })}
                    disabled={!editingProduct.main_category_id}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  >
                    <option value="">Unterkategorie wählen...</option>
                    {subCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sizes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verfügbare Größen *
                </label>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL', '34', '36', '38', '40', '42', '44', '46', '48', 'OneSize'].map(size => (
                    <label key={size} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingProduct.sizes.includes(size)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingProduct({ ...editingProduct, sizes: [...editingProduct.sizes, size] });
                          } else {
                            setEditingProduct({ ...editingProduct, sizes: editingProduct.sizes.filter(s => s !== size) });
                          }
                        }}
                        className="rounded text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm">{size}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verfügbare Farben *
                </label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {['Schwarz', 'Weiß', 'Grau', 'Blau', 'Rot', 'Grün', 'Gelb', 'Rosa', 'Lila', 'Braun', 'Orange', 'Beige'].map(color => (
                    <label key={color} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingProduct.colors.includes(color)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingProduct({ ...editingProduct, colors: [...editingProduct.colors, color] });
                          } else {
                            setEditingProduct({ ...editingProduct, colors: editingProduct.colors.filter(c => c !== color) });
                          }
                        }}
                        className="rounded text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm">{color}</span>
                    </label>
                  ))}
                </div>
              </div>

              {catalogError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{catalogError}</p>
                </div>
              )}
            </div>
            
            <div className="sticky bottom-0 bg-white p-4 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditProduct(false);
                  setEditingProduct(null);
                  setCatalogError('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
              >
                Abbrechen
              </button>
              <button
                onClick={updateProduct}
                disabled={creatingProduct || !editingProduct.name.trim() || !editingProduct.main_category_id}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors duration-200"
              >
                {creatingProduct ? 'Speichere...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Customer Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                  <img 
                    src="/images/outlet34-logo-header.png" 
                    alt="OUTLET34 Logo" 
                    className="w-8 h-8 rounded-full mr-3"
                  />
                  Kunden Login
                </h2>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kundennummer
                  </label>
                  <input
                    type="text"
                    placeholder="z.B. 10299"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                
                <button
                  onClick={async () => {
                    if (customerId.trim()) {
                      await loginAsCustomer();
                      setShowLoginModal(false);
                    } else {
                      alert('Bitte geben Sie eine Kundennummer ein.');
                    }
                  }}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
                >
                  🔑 Anmelden
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Admin Login Modal */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                  <img 
                    src="/images/outlet34-logo-header.png" 
                    alt="OUTLET34 Logo" 
                    className="w-8 h-8 rounded-full mr-3"
                  />
                  Admin Login
                </h2>
                <button
                  onClick={() => setShowAdminLoginModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin PIN
                  </label>
                  <input
                    type="password"
                    placeholder="••••"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const pin = e.target.value;
                        if (pin === '1924') {
                          setIsAdminAuthenticated(true);
                          setIsAdminView(true);
                          setShowAdminLoginModal(false);
                          alert('✅ Admin erfolgreich angemeldet!');
                        } else {
                          alert('❌ Falscher PIN!');
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                </div>
                
                <button
                  onClick={(e) => {
                    const pin = e.target.parentNode.parentNode.querySelector('input').value;
                    if (pin === '1924') {
                      setIsAdminAuthenticated(true);
                      setIsAdminView(true);
                      setShowAdminLoginModal(false);
                      alert('✅ Admin erfolgreich angemeldet!');
                    } else {
                      alert('❌ Falscher PIN!');
                    }
                  }}
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
                >
                  🔧 Admin Anmelden
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      </div> {/* Close the padding div */}
      
      {/* Category Management Modal */}
      <CategoryManagementModal 
        isOpen={showCategoryManagementModal}
        onClose={() => setShowCategoryManagementModal(false)}
        onUpdate={() => {
          loadCategories();
          loadCatalogProducts();
        }}
      />
      
      {/* Color Selection Modal */}
      <ColorModal 
        isOpen={showColorModal}
        onClose={() => setShowColorModal(false)}
        selectedColors={newProductData.colors}
        onColorChange={(colors) => setNewProductData({ ...newProductData, colors })}
      />
      
      {/* Material Selection Modal */}
      <MaterialModal 
        isOpen={showMaterialModal}
        onClose={() => setShowMaterialModal(false)}
        selectedMaterial={newProductData.material}
        onMaterialChange={(material) => setNewProductData({ ...newProductData, material })}
      />
      
      {/* Material Properties Selection Modal */}
      <MaterialPropertiesModal 
        isOpen={showMaterialPropertiesModal}
        onClose={() => setShowMaterialPropertiesModal(false)}
        selectedProperties={newProductData.material_properties}
        onPropertiesChange={(properties) => setNewProductData({ ...newProductData, material_properties: properties })}
      />
      
      {/* Size Selection Modal */}
      <SizeModal 
        isOpen={showSizeModal}
        onClose={() => setShowSizeModal(false)}
        selectedSizes={newProductData.sizes}
        onSizeChange={(sizes) => setNewProductData({ ...newProductData, sizes })}
      />
      
      {/* Media Upload Modal */}
      <MediaUploadModal 
        isOpen={showMediaUploadModal}
        onClose={() => setShowMediaUploadModal(false)}
        onCameraSelect={() => setShowCameraCapture(true)}
        onFileSelect={handleFileSelection}
      />
      
      {/* Camera Capture Modal */}
      <CameraCapture 
        isOpen={showCameraCapture}
        onClose={() => setShowCameraCapture(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
}

export default App;