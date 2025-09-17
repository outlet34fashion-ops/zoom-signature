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
  
  // New category states - MUST be declared before useEffect that uses them
  const [newMainCategory, setNewMainCategory] = useState('');
  const [newSubCategory, setNewSubCategory] = useState('');
  const [sortMode, setSortMode] = useState(false);
  const [draggedCategory, setDraggedCategory] = useState(null);
  
  // Handle drag start
  const handleDragStart = (e, category) => {
    setDraggedCategory(category);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  // Handle drop for main categories
  const handleDropMainCategory = async (e, targetCategory) => {
    e.preventDefault();
    if (!draggedCategory || draggedCategory.id === targetCategory.id) return;
    
    // Reorder main categories
    const draggedIndex = mainCategories.findIndex(cat => cat.id === draggedCategory.id);
    const targetIndex = mainCategories.findIndex(cat => cat.id === targetCategory.id);
    
    const newMainCategories = [...mainCategories];
    const [removed] = newMainCategories.splice(draggedIndex, 1);
    newMainCategories.splice(targetIndex, 0, removed);
    
    // Update sort order
    const updatedCategories = newMainCategories.map((cat, index) => ({
      ...cat,
      sort_order: index
    }));
    
    setMainCategories(updatedCategories);
    setDraggedCategory(null);
    
    // OPTIMIZED: Use batch update API for better performance
    try {
      console.log('🔀 Updating main categories sort order:', updatedCategories.map(c => ({ name: c.name, sort_order: c.sort_order })));
      
      const batchUpdateData = {
        category_updates: updatedCategories.map(cat => ({
          id: cat.id,
          sort_order: cat.sort_order
        }))
      };
      
      const endpoints = [
        `${API}/admin/categories/batch-sort-order`,
        `/api/admin/categories/batch-sort-order`,
        `${window.location.origin}/api/admin/categories/batch-sort-order`
      ];
      
      let updateSuccess = false;
      for (const endpoint of endpoints) {
        try {
          const response = await axios.put(endpoint, batchUpdateData, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          });
          console.log('✅ Batch update successful:', response.data);
          updateSuccess = true;
          break;
        } catch (endpointError) {
          console.log('❌ Failed batch update at:', endpoint, endpointError.message);
          continue;
        }
      }
      
      if (!updateSuccess) {
        throw new Error('All batch update endpoints failed');
      }
      
      console.log('✅ Main categories sort order updated successfully');
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('❌ Error updating main categories sort order:', error);
      alert('❌ Fehler beim Speichern der Reihenfolge');
      // Reload categories to reset order
      await loadCategories();
    }
  };
  
  // Handle drop for subcategories
  const handleDropSubCategory = async (e, targetCategory) => {
    e.preventDefault();
    if (!draggedCategory || draggedCategory.id === targetCategory.id) return;
    
    // Reorder subcategories
    const draggedIndex = subCategories.findIndex(cat => cat.id === draggedCategory.id);
    const targetIndex = subCategories.findIndex(cat => cat.id === targetCategory.id);
    
    const newSubCategories = [...subCategories];
    const [removed] = newSubCategories.splice(draggedIndex, 1);
    newSubCategories.splice(targetIndex, 0, removed);
    
    // Update sort order
    const updatedCategories = newSubCategories.map((cat, index) => ({
      ...cat,
      sort_order: index
    }));
    
    setSubCategories(updatedCategories);
    setDraggedCategory(null);
    
    // FIXED: Send API request to update sort order in backend
    try {
      console.log('🔀 Updating subcategories sort order:', updatedCategories.map(c => ({ name: c.name, sort_order: c.sort_order })));
      
      for (const category of updatedCategories) {
        const endpoints = [
          `${API}/admin/categories/${category.id}`,
          `/api/admin/categories/${category.id}`,
          `${window.location.origin}/api/admin/categories/${category.id}`
        ];
        
        let updateSuccess = false;
        for (const endpoint of endpoints) {
          try {
            await axios.put(endpoint, { sort_order: category.sort_order });
            updateSuccess = true;
            break;
          } catch (endpointError) {
            console.log('❌ Failed updating subcategory sort order at:', endpoint, endpointError.message);
            continue;
          }
        }
        
        if (!updateSuccess) {
          console.error('❌ Failed to update sort order for subcategory:', category.name);
        }
      }
      
      console.log('✅ Subcategories sort order updated successfully');
      if (selectedMainCategory) {
        await loadSubCategories(selectedMainCategory.id);
      }
      
    } catch (error) {
      console.error('❌ Error updating subcategories sort order:', error);
      alert('❌ Fehler beim Speichern der Unterkategorien-Reihenfolge');
      // Reload subcategories to reset order
      if (selectedMainCategory) {
        await loadSubCategories(selectedMainCategory.id);
      }
    }
  };
  
  // Debug state for button troubleshooting
  useEffect(() => {
    console.log('🔍 CategoryManagementModal State Debug:', {
      loading,
      newMainCategory: `"${newMainCategory}"`,
      newMainCategoryTrimmed: `"${newMainCategory.trim()}"`,
      newMainCategoryLength: newMainCategory.trim().length,
      newSubCategory: `"${newSubCategory}"`,
      newSubCategoryTrimmed: `"${newSubCategory.trim()}"`,
      newSubCategoryLength: newSubCategory.trim().length,
      selectedMainCategory: selectedMainCategory?.name || 'none',
      mainButtonDisabled: !newMainCategory.trim() || loading,
      subButtonDisabled: !newSubCategory.trim() || !selectedMainCategory || loading
    });
  }, [loading, newMainCategory, newSubCategory, selectedMainCategory]);
  
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

  // Simplified approach - no complex alternative handlers needed

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
        console.log('📋 Setting all categories:', response.data.length, 'items');
        console.log('📋 Categories data:', response.data.slice(0, 3).map(c => ({ id: c.id, name: c.name })));
        setCategories(response.data);
        console.log('📋 Categories state updated');
      } else {
        console.log('❌ No response from categories endpoint');
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
        console.log('📋 Setting main categories:', mainResponse.data.length, 'items');
        console.log('📋 Main categories data:', mainResponse.data.slice(0, 3).map(c => ({ id: c.id, name: c.name })));
        setMainCategories(mainResponse.data);
        console.log('📋 Main categories state updated');
      } else {
        console.log('❌ No response from main categories endpoint');
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
    
    if (loading) {
      console.log('❌ Already loading - preventing duplicate request');
      return;
    }
    
    // Set loading timeout to prevent permanent disabled state
    const loadingTimeout = setTimeout(() => {
      console.log('⚠️ Loading timeout - forcing loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout
    
    try {
      console.log('🔄 Setting loading to true...');
      setLoading(true);
      setError('');
      console.log('📤 Sending API request...');
      
      // FIXED: Calculate proper sort_order based on existing categories
      const nextSortOrder = Math.max(0, ...mainCategories.map(cat => cat.sort_order || 0)) + 1;
      
      const categoryData = {
        name: newMainCategory.trim(),
        description: '',
        icon: '📁',
        image_url: '',
        sort_order: nextSortOrder,
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
          response = await axios.post(endpoint, categoryData, {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 15000  // Increased timeout
          });
          console.log('✅ Success with endpoint:', endpoint);
          break;
        } catch (endpointError) {
          console.log('❌ Failed with endpoint:', endpoint, {
            message: endpointError.message,
            status: endpointError.response?.status,
            data: endpointError.response?.data
          });
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
      
      // FIXED: Proper category reload and state update
      try {
        await loadCategories();
        console.log('✅ Categories reloaded successfully');
      } catch (reloadError) {
        console.error('⚠️ Error reloading categories:', reloadError);
        // Still show success since creation worked
      }
      
      if (onUpdate) {
        try {
          onUpdate();
          console.log('✅ onUpdate callback executed');
        } catch (updateError) {
          console.error('⚠️ Error in onUpdate callback:', updateError);
        }
      }
      
    } catch (error) {
      console.error('❌ Error creating main category:', error);
      console.error('❌ Full error object:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      
      let errorMessage = 'Unbekannter Fehler';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError('Fehler beim Erstellen der Hauptkategorie: ' + errorMessage);
      alert('❌ Fehler beim Erstellen der Hauptkategorie: ' + errorMessage);
    } finally {
      clearTimeout(loadingTimeout);
      console.log('🔄 Setting loading to false...');
      setLoading(false);
      
      // Force re-render to ensure button state updates
      setTimeout(() => {
        console.log('🔄 Post-loading state check:', { loading, newMainCategory });
      }, 100);
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
    
    if (loading) {
      console.log('❌ Already loading - preventing duplicate request');
      return;
    }
    
    // Set loading timeout to prevent permanent disabled state
    const loadingTimeout = setTimeout(() => {
      console.log('⚠️ Loading timeout - forcing loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout
    
    try {
      console.log('🔄 Setting loading to true...');
      setLoading(true);
      setError('');
      console.log('📤 Sending subcategory API request...');
      
      // FIXED: Calculate proper sort_order based on existing subcategories
      const nextSortOrder = Math.max(0, ...subCategories.map(cat => cat.sort_order || 0)) + 1;
      
      const categoryData = {
        name: newSubCategory.trim(),
        description: '',
        icon: '📂',
        image_url: '',
        sort_order: nextSortOrder,
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
          response = await axios.post(endpoint, categoryData, {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 15000  // Increased timeout
          });
          console.log('✅ Success with subcategory endpoint:', endpoint);
          break;
        } catch (endpointError) {
          console.log('❌ Failed with subcategory endpoint:', endpoint, {
            message: endpointError.message,
            status: endpointError.response?.status,
            data: endpointError.response?.data
          });
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
      
      // FIXED: Proper subcategory reload and state update
      try {
        await loadSubCategories(selectedMainCategory.id);
        console.log('✅ Subcategories reloaded successfully');
      } catch (reloadError) {
        console.error('⚠️ Error reloading subcategories:', reloadError);
        // Still show success since creation worked
      }
      
      if (onUpdate) {
        try {
          onUpdate();
          console.log('✅ onUpdate callback executed');
        } catch (updateError) {
          console.error('⚠️ Error in onUpdate callback:', updateError);
        }
      }
      
    } catch (error) {
      console.error('❌ Error creating subcategory:', error);
      console.error('❌ Full subcategory error object:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      
      let errorMessage = 'Unbekannter Fehler';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError('Fehler beim Erstellen der Unterkategorie: ' + errorMessage);
      alert('❌ Fehler beim Erstellen der Unterkategorie: ' + errorMessage);
    } finally {
      clearTimeout(loadingTimeout);
      console.log('🔄 Setting loading to false...');
      setLoading(false);
      
      // Force re-render to ensure button state updates
      setTimeout(() => {
        console.log('🔄 Post-loading state check:', { loading, newSubCategory, selectedMainCategory });
      }, 100);
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
                <p className="text-gray-600">
                  Haupt- und Unterkategorien bearbeiten
                  {sortMode && <span className="text-blue-600 font-medium"> | Sortier-Modus aktiv</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSortMode(!sortMode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2 ${
                  sortMode 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                <span>🔀</span>
                <span>{sortMode ? 'Sortierung beenden' : 'Sortieren'}</span>
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold relative z-20"
                style={{ pointerEvents: 'auto' }}
              >
                ×
              </button>
            </div>
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
                {console.log('🎨 Rendering main categories list:', mainCategories.length, 'items')}
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
                      if (newMainCategory.trim() && !loading) {
                        createMainCategory();
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    console.log('🔵 CREATE BUTTON CLICKED - Main Category');
                    console.log('🔍 Button click state check:', {
                      newMainCategory: `"${newMainCategory}"`,
                      trimmed: `"${newMainCategory.trim()}"`,
                      loading,
                      disabled: !newMainCategory.trim() || loading
                    });
                    
                    if (newMainCategory.trim() && !loading) {
                      console.log('✅ Creating main category:', newMainCategory.trim());
                      createMainCategory();
                    } else if (!newMainCategory.trim()) {
                      console.log('❌ Empty input field');
                      alert('Bitte geben Sie einen Kategorienamen ein.');
                    } else if (loading) {
                      console.log('❌ Currently loading');
                      alert('Bitte warten Sie...');
                    }
                  }}
                  disabled={!newMainCategory.trim() || loading}
                  className={`px-4 py-2 rounded text-sm font-semibold transition-all duration-200 ${
                    !newMainCategory.trim() || loading
                      ? 'bg-gray-300 cursor-not-allowed text-gray-500 border border-gray-300'
                      : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer border border-blue-600 hover:border-blue-700 shadow-sm hover:shadow-md'
                  }`}
                  type="button"
                  title={!newMainCategory.trim() ? 'Bitte geben Sie einen Kategorienamen ein' : loading ? 'Lädt...' : 'Hauptkategorie erstellen'}
                >
                  {loading ? 'Erstelle...' : 'Erstellen'}
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
                  <div 
                    key={category.id} 
                    className={`border rounded-lg p-3 transition-all duration-200 ${
                      sortMode 
                        ? 'cursor-move hover:bg-blue-50 border-blue-200' 
                        : 'hover:bg-gray-50'
                    }`}
                    draggable={sortMode}
                    onDragStart={(e) => sortMode && handleDragStart(e, category)}
                    onDragOver={(e) => sortMode && handleDragOver(e)}
                    onDrop={(e) => sortMode && handleDropMainCategory(e, category)}
                  >
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
                          className="flex-1 cursor-pointer flex items-center space-x-3"
                          onClick={() => {
                            setSelectedMainCategory(category);
                            loadSubCategories(category.id);
                          }}
                        >
                          <div className="flex items-center space-x-2">
                            {sortMode && (
                              <div className="text-gray-400 text-sm">
                                <span className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                                  {category.sort_order}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-800">{category.name}</div>
                              {category.description && (
                                <div className="text-sm text-gray-600">{category.description}</div>
                              )}
                              <div className="text-xs text-gray-500">
                                {category.product_count || 0} Produkte
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-1 ml-2">
                          {sortMode ? (
                            <div className="text-blue-600 text-sm px-2 py-1 bg-blue-50 rounded">
                              🔀 Sortieren
                            </div>
                          ) : (
                            <>
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
                            </>
                          )}
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
                        if (newSubCategory.trim() && selectedMainCategory && !loading) {
                          createSubCategory();
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      console.log('🟢 CREATE BUTTON CLICKED - Sub Category');
                      console.log('🔍 Subcategory button click state check:', {
                        newSubCategory: `"${newSubCategory}"`,
                        trimmed: `"${newSubCategory.trim()}"`,
                        selectedMainCategory: selectedMainCategory?.name || 'none',
                        loading,
                        disabled: !newSubCategory.trim() || !selectedMainCategory || loading
                      });
                      
                      if (newSubCategory.trim() && selectedMainCategory && !loading) {
                        console.log('✅ Creating subcategory:', newSubCategory.trim());
                        createSubCategory();
                      } else if (!selectedMainCategory) {
                        console.log('❌ No main category selected');
                        alert('Bitte wählen Sie zuerst eine Hauptkategorie aus.');
                      } else if (!newSubCategory.trim()) {
                        console.log('❌ Empty subcategory input field');
                        alert('Bitte geben Sie einen Unterkategorienamen ein.');
                      } else if (loading) {
                        console.log('❌ Currently loading');
                        alert('Bitte warten Sie...');
                      }
                    }}
                    disabled={!newSubCategory.trim() || !selectedMainCategory || loading}
                    className={`px-4 py-2 rounded text-sm font-semibold transition-all duration-200 ${
                      !newSubCategory.trim() || !selectedMainCategory || loading
                        ? 'bg-gray-300 cursor-not-allowed text-gray-500 border border-gray-300'
                        : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer border border-green-600 hover:border-green-700 shadow-sm hover:shadow-md'
                    }`}
                    type="button"
                    title={!newSubCategory.trim() ? 'Bitte geben Sie einen Unterkategorienamen ein' : !selectedMainCategory ? 'Bitte wählen Sie zuerst eine Hauptkategorie aus' : loading ? 'Lädt...' : 'Unterkategorie erstellen'}
                  >
                    {loading ? 'Erstelle...' : 'Erstellen'}
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
                      <div 
                        key={category.id} 
                        className={`border rounded-lg p-3 transition-all duration-200 ${
                          sortMode 
                            ? 'cursor-move hover:bg-green-50 border-green-200' 
                            : 'hover:bg-gray-50'
                        }`}
                        draggable={sortMode}
                        onDragStart={(e) => sortMode && handleDragStart(e, category)}
                        onDragOver={(e) => sortMode && handleDragOver(e)}
                        onDrop={(e) => sortMode && handleDropSubCategory(e, category)}
                      >
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
                            <div className="flex-1 flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                {sortMode && (
                                  <div className="text-gray-400 text-sm">
                                    <span className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                                      {category.sort_order}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium text-gray-800">{category.name}</div>
                                  {category.description && (
                                    <div className="text-sm text-gray-600">{category.description}</div>
                                  )}
                                  <div className="text-xs text-gray-500">
                                    {category.product_count || 0} Produkte
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-1 ml-2">
                              {sortMode ? (
                                <div className="text-green-600 text-sm px-2 py-1 bg-green-50 rounded">
                                  🔀 Sortieren
                                </div>
                              ) : (
                                <>
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
                                </>
                              )}
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