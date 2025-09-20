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
  const [showFavorites, setShowFavorites] = useState(false);
  
  // Admin Katalog States
  const [showCatalogManagement, setShowCatalogManagement] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
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
  // Alternative Category Creation States
  const [showSimpleCategoryModal, setShowSimpleCategoryModal] = useState(false);
  const [simpleCategoryName, setSimpleCategoryName] = useState('');
  const [simpleCategoryLoading, setSimpleCategoryLoading] = useState(false);
  
  // Subcategory Creation States
  const [showSimpleSubcategoryModal, setShowSimpleSubcategoryModal] = useState(false);
  const [simpleSubcategoryName, setSimpleSubcategoryName] = useState('');
  const [simpleSubcategoryLoading, setSimpleSubcategoryLoading] = useState(false);
  const [selectedParentCategory, setSelectedParentCategory] = useState('');

  const createSubcategorySimple = async () => {
    if (!simpleSubcategoryName.trim()) {
      alert('Bitte geben Sie einen Unterkategorienamen ein.');
      return;
    }

    if (!selectedParentCategory) {
      alert('Bitte wählen Sie eine Hauptkategorie aus.');
      return;
    }

    setSimpleSubcategoryLoading(true);
    
    try {
      const categoryData = {
        name: simpleSubcategoryName.trim(),
        description: '',
        icon: '📂',
        image_url: '',
        sort_order: 0, // Will be calculated by backend
        parent_category_id: selectedParentCategory,
        is_main_category: false
      };

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(categoryData)
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Unterkategorie "${simpleSubcategoryName.trim()}" erfolgreich erstellt!`);
        setSimpleSubcategoryName('');
        setSelectedParentCategory('');
        setShowSimpleSubcategoryModal(false);
        await loadCategories();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`❌ Fehler: ${errorData.detail || 'Unbekannter Fehler'}`);
      }
    } catch (error) {
      alert(`❌ Netzwerkfehler: ${error.message}`);
    } finally {
      setSimpleSubcategoryLoading(false);
    }
  };

  const createCategorySimple = async () => {
    if (!simpleCategoryName.trim()) {
      alert('Bitte geben Sie einen Kategorienamen ein.');
      return;
    }

    setSimpleCategoryLoading(true);
    
    try {
      const categoryData = {
        name: simpleCategoryName.trim(),
        description: '',
        icon: '📁',
        image_url: '',
        sort_order: Math.max(0, ...categories.map(cat => cat.sort_order || 0)) + 1,
        is_main_category: true
      };

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(categoryData)
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Kategorie "${simpleCategoryName.trim()}" erfolgreich erstellt!`);
        setSimpleCategoryName('');
        setShowSimpleCategoryModal(false);
        await loadCategories();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`❌ Fehler: ${errorData.detail || 'Unbekannter Fehler'}`);
      }
    } catch (error) {
      alert(`❌ Netzwerkfehler: ${error.message}`);
    } finally {
      setSimpleCategoryLoading(false);
    }
  };

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
      setValidationErrors({}); // Reset validation errors
      
      // Prepare validation errors object
      const errors = {};
      
      // Validate mandatory fields
      if (!newProductData.name.trim()) {
        errors.name = 'Produktname ist erforderlich';
      }
      
      if (!newProductData.main_category_id) {
        errors.main_category_id = 'Hauptkategorie ist erforderlich';
      }

      // Validate sizes (mandatory)
      if (!newProductData.sizes || newProductData.sizes.length === 0) {
        errors.sizes = 'Mindestens eine Größe ist erforderlich';
      }

      // Validate colors (mandatory)
      if (!newProductData.colors || newProductData.colors.length === 0) {
        errors.colors = 'Mindestens eine Farbe ist erforderlich';
      }

      // Validate material (mandatory) - Material-Übersicht
      if (!newProductData.material || !newProductData.material.trim()) {
        errors.material = 'Material-Übersicht ist ein Pflichtfeld';
      }

      // If there are validation errors, show them and stop
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        
        // Create user-friendly error message for immediate alert
        const missingFields = [];
        if (errors.name) missingFields.push('Produktname');
        if (errors.main_category_id) missingFields.push('Hauptkategorie');
        if (errors.sizes) missingFields.push('Größen');
        if (errors.colors) missingFields.push('Farben');
        if (errors.material) missingFields.push('Material-Übersicht');
        
        const errorMessage = `PFLICHTFELDER FEHLEN:\n\n${missingFields.join('\n• ')}`;
        
        // Show prominent alert immediately
        alert(`🚨 FEHLER BEIM ERSTELLEN\n\n${errorMessage}\n\nBitte füllen Sie alle markierten Pflichtfelder aus.`);
        
        setCreatingProduct(false);
        return;
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
      setValidationErrors({}); // Clear validation errors
      
      // Reload products and show them immediately
      console.log('Reloading catalog products...');
      await loadCatalogProducts();
      
      // Force refresh of all product-related data
      await loadCategories();
      
      // Show catalog immediately to display newly created products
      setShowCatalog(true);
      setSelectedCategory(null); // Show all products
      
      console.log('Product created and catalog refreshed. Total products now:', catalogProducts.length);
      
      alert('✅ Produkt erfolgreich erstellt!\n\nDas neue Produkt ist jetzt in der Produktliste sichtbar. Klicken Sie auf "Produkte" um alle Produkte anzuzeigen.');
      
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
                        

    </div>
  );
}

export default App;
