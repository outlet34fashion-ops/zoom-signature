import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

console.log('🌐 CategoryManagementModal Environment Debug:');
console.log('   BACKEND_URL:', BACKEND_URL);
console.log('   API URL:', API);
console.log('   Current location:', window.location.href);

const CategoryManagementModal = ({ isOpen, onClose, onUpdate }) => {
  console.log('🟦 CategoryManagementModal render - isOpen:', isOpen);
  
  const [categories, setCategories] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedMainCategory, setSelectedMainCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // New category states
  const [newMainCategory, setNewMainCategory] = useState('');
  const [newSubCategory, setNewSubCategory] = useState('');
  
  // Edit states
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');

  // Load categories when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  // Alternative click handler setup for buttons that might have z-index issues
  useEffect(() => {
    if (isOpen) {
      const handleAlternativeClick = (e) => {
        console.log('🔧 Alternative click handler triggered', e.target);
        
        // Check if clicked element is a plus button or its parent
        const isMainPlusButton = e.target.closest('[data-main-category-button]');
        const isSubPlusButton = e.target.closest('[data-sub-category-button]');
        
        if (isMainPlusButton && newMainCategory.trim() && !loading) {
          console.log('🔧 Alternative main category creation triggered');
          e.preventDefault();
          e.stopPropagation();
          createMainCategory();
        } else if (isSubPlusButton && newSubCategory.trim() && selectedMainCategory && !loading) {
          console.log('🔧 Alternative subcategory creation triggered');
          e.preventDefault();
          e.stopPropagation();
          createSubCategory();
        }
      };

      document.addEventListener('click', handleAlternativeClick, true);
      return () => {
        document.removeEventListener('click', handleAlternativeClick, true);
      };
    }
  }, [isOpen, newMainCategory, newSubCategory, selectedMainCategory, loading]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('📥 Loading categories...');
      
      // Try multiple endpoints for loading categories
      const endpoints = [
        `${API}/categories`,
        '/api/categories',
        `${window.location.origin}/api/categories`
      ];
      
      let response, mainResponse;
      
      // Load all categories
      for (const endpoint of endpoints) {
        try {
          console.log('🌐 Trying categories endpoint:', endpoint);
          response = await axios.get(endpoint);
          console.log('✅ Categories loaded from:', endpoint);
          break;
        } catch (endpointError) {
          console.log('❌ Failed loading categories from:', endpoint, endpointError.message);
          continue;
        }
      }
      
      if (response) {
        setCategories(response.data);
        console.log('📋 Categories loaded:', response.data.length, 'items');
      }
      
      // Load main categories
      const mainEndpoints = [
        `${API}/categories/main`,
        '/api/categories/main',
        `${window.location.origin}/api/categories/main`
      ];
      
      for (const endpoint of mainEndpoints) {
        try {
          console.log('🌐 Trying main categories endpoint:', endpoint);
          mainResponse = await axios.get(endpoint);
          console.log('✅ Main categories loaded from:', endpoint);
          break;
        } catch (endpointError) {
          console.log('❌ Failed loading main categories from:', endpoint, endpointError.message);
          continue;
        }
      }
      
      if (mainResponse) {
        setMainCategories(mainResponse.data);
        console.log('📋 Main categories loaded:', mainResponse.data.length, 'items');
      }
      
    } catch (error) {
      console.error('❌ Error loading categories:', error);
      setError('Fehler beim Laden der Kategorien: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSubCategories = async (mainCategoryId) => {
    try {
      const response = await axios.get(`${API}/categories/sub/${mainCategoryId}`);
      setSubCategories(response.data);
    } catch (error) {
      console.error('Error loading subcategories:', error);
      setError('Fehler beim Laden der Unterkategorien');
    }
  };

  const createMainCategory = async () => {
    console.log('🔵 createMainCategory called with:', { 
      newMainCategory, 
      trimmed: newMainCategory.trim(), 
      length: newMainCategory.trim().length,
      loading 
    });
    
    if (!newMainCategory.trim()) {
      console.log('❌ No category name provided - input is empty');
      alert('Bitte geben Sie einen Kategorienamen ein.');
      return;
    }
    
    try {
      console.log('🔄 Setting loading to true...');
      setLoading(true);
      setError('');
      console.log('📤 Sending API request...');
      
      const categoryData = {
        name: newMainCategory.trim(),
        description: '',
        image_url: '',
        sort_order: mainCategories.length,
        is_main_category: true
      };
      
      console.log('📋 Category data:', categoryData);
      console.log('🔗 API URL:', `${API}/admin/categories`);
      
      // Try multiple API endpoints for maximum compatibility
      let response;
      const endpoints = [
        `${API}/admin/categories`,
        '/api/admin/categories',  // Relative URL fallback
        `${window.location.origin}/api/admin/categories`  // Same-origin fallback
      ];
      
      let lastError;
      for (const endpoint of endpoints) {
        try {
          console.log('🌐 Trying API endpoint:', endpoint);
          response = await axios.post(endpoint, categoryData);
          console.log('✅ Success with endpoint:', endpoint);
          break;
        } catch (endpointError) {
          console.log('❌ Failed with endpoint:', endpoint, endpointError.message);
          lastError = endpointError;
          continue;
        }
      }
      
      if (!response) {
        throw lastError || new Error('All API endpoints failed');
      }
      
      console.log('✅ API Response:', response.data);
      console.log('✅ Response status:', response.status);
      
      // Success feedback
      alert(`✅ Hauptkategorie "${newMainCategory.trim()}" erfolgreich erstellt!`);
      
      setNewMainCategory('');
      await loadCategories();
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('❌ Error creating main category:', error);
      console.error('❌ Full error object:', {
        message: error.message,
        response: error.response,
        request: error.request,
        config: error.config
      });
      
      const errorMessage = error.response?.data?.detail || error.message || 'Unbekannter Fehler';
      setError('Fehler beim Erstellen der Hauptkategorie: ' + errorMessage);
      alert('❌ Fehler beim Erstellen der Hauptkategorie: ' + errorMessage);
    } finally {
      console.log('🔄 Setting loading to false...');
      setLoading(false);
    }
  };

  const createSubCategory = async () => {
    console.log('🟢 createSubCategory called with:', { 
      newSubCategory, 
      trimmed: newSubCategory.trim(), 
      length: newSubCategory.trim().length,
      selectedMainCategory,
      loading 
    });
    
    if (!newSubCategory.trim()) {
      console.log('❌ No subcategory name provided - input is empty');
      alert('Bitte geben Sie einen Unterkategorienamen ein.');
      return;
    }
    
    if (!selectedMainCategory) {
      console.log('❌ No main category selected');
      alert('Bitte wählen Sie zuerst eine Hauptkategorie aus.');
      return;
    }
    
    try {
      console.log('🔄 Setting loading to true...');
      setLoading(true);
      setError('');
      console.log('📤 Sending subcategory API request...');
      
      const categoryData = {
        name: newSubCategory.trim(),
        description: '',
        image_url: '',
        sort_order: subCategories.length,
        parent_category_id: selectedMainCategory.id,
        is_main_category: false
      };
      
      console.log('📋 Subcategory data:', categoryData);
      console.log('🔗 API URL:', `${API}/admin/categories`);
      
      // Try multiple API endpoints for maximum compatibility
      let response;
      const endpoints = [
        `${API}/admin/categories`,
        '/api/admin/categories',  // Relative URL fallback
        `${window.location.origin}/api/admin/categories`  // Same-origin fallback
      ];
      
      let lastError;
      for (const endpoint of endpoints) {
        try {
          console.log('🌐 Trying subcategory API endpoint:', endpoint);
          response = await axios.post(endpoint, categoryData);
          console.log('✅ Success with subcategory endpoint:', endpoint);
          break;
        } catch (endpointError) {
          console.log('❌ Failed with subcategory endpoint:', endpoint, endpointError.message);
          lastError = endpointError;
          continue;
        }
      }
      
      if (!response) {
        throw lastError || new Error('All subcategory API endpoints failed');
      }
      
      console.log('✅ Subcategory API Response:', response.data);
      console.log('✅ Response status:', response.status);
      
      // Success feedback
      alert(`✅ Unterkategorie "${newSubCategory.trim()}" erfolgreich erstellt!`);
      
      setNewSubCategory('');
      await loadSubCategories(selectedMainCategory.id);
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('❌ Error creating subcategory:', error);
      console.error('❌ Full subcategory error object:', {
        message: error.message,
        response: error.response,
        request: error.request,
        config: error.config
      });
      
      const errorMessage = error.response?.data?.detail || error.message || 'Unbekannter Fehler';
      setError('Fehler beim Erstellen der Unterkategorie: ' + errorMessage);
      alert('❌ Fehler beim Erstellen der Unterkategorie: ' + errorMessage);
    } finally {
      console.log('🔄 Setting loading to false...');
      setLoading(false);
    }
  };

  const updateCategory = async () => {
    if (!editingCategory || !editingName.trim()) return;
    
    try {
      setLoading(true);
      setError('');
      
      const updatedData = {
        ...editingCategory,
        name: editingName.trim(),
        description: editingDescription.trim()
      };
      
      await axios.put(`${API}/admin/categories/${editingCategory.id}`, updatedData);
      
      setEditingCategory(null);
      setEditingName('');
      setEditingDescription('');
      
      await loadCategories();
      if (selectedMainCategory) {
        await loadSubCategories(selectedMainCategory.id);
      }
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('Error updating category:', error);
      setError('Fehler beim Aktualisieren der Kategorie');
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (category) => {
    if (!window.confirm(`Sind Sie sicher, dass Sie "${category.name}" löschen möchten?`)) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      await axios.delete(`${API}/admin/categories/${category.id}`);
      
      await loadCategories();
      if (selectedMainCategory && category.parent_id === selectedMainCategory.id) {
        await loadSubCategories(selectedMainCategory.id);
      }
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('Error deleting category:', error);
      setError('Fehler beim Löschen der Kategorie');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (category) => {
    setEditingCategory(category);
    setEditingName(category.name);
    setEditingDescription(category.description || '');
  };

  const cancelEditing = () => {
    setEditingCategory(null);
    setEditingName('');
    setEditingDescription('');
  };

  if (!isOpen) {
    console.log('🟦 CategoryManagementModal: Modal is closed (isOpen = false)');
    return null;
  }

  console.log('🟦 CategoryManagementModal: Rendering modal (isOpen = true)');

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
      style={{ zIndex: '10001 !important' }}
      onClick={(e) => {
        // Only close modal if clicking on the overlay itself, not on the modal content
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden relative"
        style={{ zIndex: '10002 !important' }}
        onClick={(e) => {
          // Prevent modal content clicks from bubbling up to the overlay
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-blue-100 relative z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">🏷️</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Kategorien verwalten</h2>
                <p className="text-gray-600">Haupt- und Unterkategorien bearbeiten</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold relative z-20"
              style={{ pointerEvents: 'auto' }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[600px]">
          {/* Left Panel - Main Categories */}
          <div className="w-1/2 border-r p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <span className="mr-2">📁</span>
                Hauptkategorien ({mainCategories.length})
              </h3>
              
              {/* New Main Category */}
              <div className="flex space-x-2 mb-4">
                <input
                  type="text"
                  value={newMainCategory}
                  onChange={(e) => {
                    console.log('🔍 Main category input change:', e.target.value);
                    setNewMainCategory(e.target.value);
                  }}
                  placeholder="Neue Hauptkategorie..."
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => {
                    console.log('🔍 Main category key pressed:', e.key);
                    if (e.key === 'Enter') {
                      console.log('🔍 Enter pressed - calling createMainCategory');
                      createMainCategory();
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    console.log('🔵 BUTTON CLICK EVENT TRIGGERED!');
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔍 Event object:', e);
                    console.log('🔵 Main category button clicked!');
                    console.log('🔍 Button state:', {
                      newMainCategory,
                      trimmed: newMainCategory.trim(),
                      disabled: !newMainCategory.trim() || loading,
                      loading
                    });
                    
                    if (!newMainCategory.trim()) {
                      console.log('❌ Button disabled - no text entered');
                      alert('Bitte geben Sie einen Kategorienamen ein.');
                      return;
                    }
                    
                    if (loading) {
                      console.log('❌ Button disabled - loading in progress');
                      return;
                    }
                    
                    console.log('✅ Calling createMainCategory...');
                    createMainCategory();
                  }}
                  onMouseDown={(e) => {
                    console.log('🔵 MOUSEDOWN EVENT on main category button');
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onMouseUp={(e) => {
                    console.log('🔵 MOUSEUP EVENT on main category button');
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onTouchStart={(e) => {
                    console.log('🔵 TOUCHSTART EVENT on main category button');
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  disabled={!newMainCategory.trim() || loading}
                  className={`px-4 py-2 rounded text-sm font-semibold min-w-[40px] flex items-center justify-center transition-colors ${
                    !newMainCategory.trim() || loading
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  }`}
                  type="button"
                  style={{ 
                    pointerEvents: 'auto !important', 
                    zIndex: '10003 !important',
                    position: 'relative',
                    isolation: 'isolate',
                    touchAction: 'manipulation'
                  }}
                  tabIndex="0"
                  role="button"
                  aria-label="Hauptkategorie hinzufügen"
                  data-main-category-button="true"
                >
                  {loading ? '⏳' : '➕'}
                </button>
                {/* Backup text button - Alternative solution if plus button fails */}
                <button
                  onClick={(e) => {
                    console.log('🔵 BACKUP BUTTON CLICKED!');
                    e.preventDefault();
                    e.stopPropagation();
                    if (newMainCategory.trim() && !loading) {
                      createMainCategory();
                    } else {
                      alert('Bitte geben Sie einen Kategorienamen ein.');
                    }
                  }}
                  disabled={!newMainCategory.trim() || loading}
                  className={`px-3 py-2 rounded text-xs font-semibold transition-colors ${
                    !newMainCategory.trim() || loading
                      ? 'bg-gray-300 cursor-not-allowed text-gray-600'
                      : 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
                  }`}
                  type="button"
                  style={{ 
                    pointerEvents: 'auto !important', 
                    zIndex: '10003 !important',
                    position: 'relative'
                  }}
                >
                  Erstellen
                </button>
              </div>
            </div>

            {/* Main Categories List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-4">
                  <p className="text-gray-600">Laden...</p>
                </div>
              ) : mainCategories.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-600">Keine Hauptkategorien gefunden</p>
                </div>
              ) : (
                mainCategories.map((category) => (
                  <div key={category.id} className="border rounded-lg p-3 hover:bg-gray-50">
                    {editingCategory?.id === category.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={editingDescription}
                          onChange={(e) => setEditingDescription(e.target.value)}
                          placeholder="Beschreibung (optional)"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={cancelEditing}
                            className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                          >
                            Abbrechen
                          </button>
                          <button
                            onClick={updateCategory}
                            className="px-2 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded"
                          >
                            Speichern
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            setSelectedMainCategory(category);
                            loadSubCategories(category.id);
                          }}
                        >
                          <div className="font-medium text-gray-800">{category.name}</div>
                          {category.description && (
                            <div className="text-sm text-gray-600">{category.description}</div>
                          )}
                          <div className="text-xs text-gray-500">
                            {category.product_count || 0} Produkte
                          </div>
                        </div>
                        <div className="flex space-x-1 ml-2">
                          <button
                            onClick={() => startEditing(category)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Bearbeiten"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteCategory(category)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Löschen"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Panel - Sub Categories */}
          <div className="w-1/2 p-6">
            {selectedMainCategory ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <span className="mr-2">📂</span>
                  Unterkategorien von "{selectedMainCategory.name}" ({subCategories.length})
                </h3>
                
                {/* New Sub Category */}
                <div className="flex space-x-2 mb-4">
                  <input
                    type="text"
                    value={newSubCategory}
                    onChange={(e) => {
                      console.log('🔍 Sub category input change:', e.target.value);
                      setNewSubCategory(e.target.value);
                    }}
                    placeholder="Neue Unterkategorie..."
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    onKeyPress={(e) => {
                      console.log('🔍 Sub category key pressed:', e.key);
                      if (e.key === 'Enter') {
                        console.log('🔍 Enter pressed - calling createSubCategory');
                        createSubCategory();
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      console.log('🟢 SUBCATEGORY BUTTON CLICK EVENT TRIGGERED!');
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔍 Event object:', e);
                      console.log('🟢 Subcategory button clicked!');
                      console.log('🔍 Button state:', {
                        newSubCategory,
                        trimmed: newSubCategory.trim(),
                        selectedMainCategory,
                        disabled: !newSubCategory.trim() || loading,
                        loading
                      });
                      
                      if (!newSubCategory.trim()) {
                        console.log('❌ Subcategory button disabled - no text entered');
                        alert('Bitte geben Sie einen Unterkategorienamen ein.');
                        return;
                      }
                      
                      if (loading) {
                        console.log('❌ Subcategory button disabled - loading in progress');
                        return;
                      }
                      
                      if (!selectedMainCategory) {
                        console.log('❌ Subcategory button disabled - no main category selected');
                        alert('Bitte wählen Sie zuerst eine Hauptkategorie aus.');
                        return;
                      }
                      
                      console.log('✅ Calling createSubCategory...');
                      createSubCategory();
                    }}
                    onMouseDown={(e) => {
                      console.log('🟢 MOUSEDOWN EVENT on subcategory button');
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onMouseUp={(e) => {
                      console.log('🟢 MOUSEUP EVENT on subcategory button');
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onTouchStart={(e) => {
                      console.log('🟢 TOUCHSTART EVENT on subcategory button');
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    disabled={!newSubCategory.trim() || loading}
                    className={`px-4 py-2 rounded text-sm font-semibold min-w-[40px] flex items-center justify-center transition-colors ${
                      !newSubCategory.trim() || loading
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                    }`}
                    type="button"
                    style={{ 
                      pointerEvents: 'auto !important', 
                      zIndex: '10003 !important',
                      position: 'relative',
                      isolation: 'isolate',
                      touchAction: 'manipulation'
                    }}
                    tabIndex="0"
                    role="button"
                    aria-label="Unterkategorie hinzufügen"
                    data-sub-category-button="true"
                  >
                    {loading ? '⏳' : '➕'}
                  </button>
                </div>

                {/* Sub Categories List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {subCategories.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-gray-600">Keine Unterkategorien gefunden</p>
                    </div>
                  ) : (
                    subCategories.map((category) => (
                      <div key={category.id} className="border rounded-lg p-3 hover:bg-gray-50">
                        {editingCategory?.id === category.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                              autoFocus
                            />
                            <input
                              type="text"
                              value={editingDescription}
                              onChange={(e) => setEditingDescription(e.target.value)}
                              placeholder="Beschreibung (optional)"
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={cancelEditing}
                                className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                              >
                                Abbrechen
                              </button>
                              <button
                                onClick={updateCategory}
                                className="px-2 py-1 text-xs bg-green-600 text-white hover:bg-green-700 rounded"
                              >
                                Speichern
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-800">{category.name}</div>
                              {category.description && (
                                <div className="text-sm text-gray-600">{category.description}</div>
                              )}
                              <div className="text-xs text-gray-500">
                                {category.product_count || 0} Produkte
                              </div>
                            </div>
                            <div className="flex space-x-1 ml-2">
                              <button
                                onClick={() => startEditing(category)}
                                className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                                title="Bearbeiten"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => deleteCategory(category)}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Löschen"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-4">📂</div>
                  <p>Wählen Sie eine Hauptkategorie aus, um Unterkategorien zu verwalten</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 border-t bg-red-50 border-red-200">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagementModal;