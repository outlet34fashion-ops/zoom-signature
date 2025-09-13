import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CategoryManagementModal = ({ isOpen, onClose, onUpdate }) => {
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

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load all categories
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
      
      // Load main categories
      const mainResponse = await axios.get(`${API}/categories/main`);
      setMainCategories(mainResponse.data);
      
    } catch (error) {
      console.error('Error loading categories:', error);
      setError('Fehler beim Laden der Kategorien');
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
    console.log('🔵 createMainCategory called:', newMainCategory);
    if (!newMainCategory.trim()) {
      console.log('❌ No category name provided');
      return;
    }
    
    try {
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
      
      const response = await axios.post(`${API}/admin/categories`, categoryData);
      console.log('✅ API Response:', response.data);
      
      setNewMainCategory('');
      await loadCategories();
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('❌ Error creating main category:', error);
      setError('Fehler beim Erstellen der Hauptkategorie: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createSubCategory = async () => {
    console.log('🟢 createSubCategory called:', newSubCategory);
    if (!newSubCategory.trim() || !selectedMainCategory) {
      console.log('❌ Missing subcategory name or main category:', { newSubCategory, selectedMainCategory });
      return;
    }
    
    try {
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
      
      const response = await axios.post(`${API}/admin/categories`, categoryData);
      console.log('✅ Subcategory API Response:', response.data);
      
      setNewSubCategory('');
      await loadSubCategories(selectedMainCategory.id);
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('❌ Error creating subcategory:', error);
      setError('Fehler beim Erstellen der Unterkategorie: ' + error.message);
    } finally {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden relative z-10">
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
                  onChange={(e) => setNewMainCategory(e.target.value)}
                  placeholder="Neue Hauptkategorie..."
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      createMainCategory();
                    }
                  }}
                />
                <button
                  onClick={() => {
                    console.log('🔵 Main category button clicked!');
                    createMainCategory();
                  }}
                  disabled={!newMainCategory.trim() || loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-semibold min-w-[40px] flex items-center justify-center"
                  type="button"
                >
                  {loading ? '...' : '➕'}
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
                    onChange={(e) => setNewSubCategory(e.target.value)}
                    placeholder="Neue Unterkategorie..."
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        createSubCategory();
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      console.log('🟢 Subcategory button clicked!');
                      createSubCategory();
                    }}
                    disabled={!newSubCategory.trim() || loading}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-semibold min-w-[40px] flex items-center justify-center"
                    type="button"
                  >
                    {loading ? '...' : '➕'}
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