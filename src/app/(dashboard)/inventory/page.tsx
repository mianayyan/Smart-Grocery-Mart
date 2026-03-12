'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, Filter, X, ArrowUpDown, Barcode } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  sku: string | null;
  category_id: string | null;
  supplier_id: string | null;
  cost_price: number;
  price: number;
  stock: number;
  min_stock_level: number;
  unit: string;
  description: string | null;
  is_active: boolean;
  expiry_date: string | null;
  pack_size: number;
  pack_unit: string;
  pieces_per_pack: number;
  category?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

export default function InventoryPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStock, setFilterStock] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '', barcode: '', sku: '', category_id: '', supplier_id: '',
    cost_price: '', price: '', stock: '', min_stock_level: '10',
    unit: 'piece', description: '', expiry_date: '',
    pack_size: '1', pack_unit: 'piece', pieces_per_pack: '1',
  });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prodData } = await supabase
      .from('products')
      .select('*, category:categories(id, name), supplier:suppliers(id, name)')
      .eq('user_id', user.id)
      .order('name');

    const { data: catData } = await supabase
      .from('categories')
      .select('*')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('name');

    const { data: supData } = await supabase
      .from('suppliers')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    setProducts(prodData || []);
    setCategories(catData || []);
    setSuppliers(supData || []);
    setLoading(false);
  }

  function openAdd() {
    setEditProduct(null);
    setForm({
      name: '', barcode: '', sku: '', category_id: '', supplier_id: '',
      cost_price: '', price: '', stock: '', min_stock_level: '10',
      unit: 'piece', description: '', expiry_date: '',
      pack_size: '1', pack_unit: 'piece', pieces_per_pack: '1',
    });
    setShowForm(true);
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  }

  function openEdit(p: Product) {
    setEditProduct(p);
    setForm({
      name: p.name,
      barcode: p.barcode || '',
      sku: p.sku || '',
      category_id: p.category_id || '',
      supplier_id: p.supplier_id || '',
      cost_price: String(p.cost_price),
      price: String(p.price),
      stock: String(p.stock),
      min_stock_level: String(p.min_stock_level),
      unit: p.unit,
      description: p.description || '',
      expiry_date: (p as any).expiry_date || '',
      pack_size: String((p as any).pack_size || 1),
      pack_unit: (p as any).pack_unit || 'piece',
      pieces_per_pack: String((p as any).pieces_per_pack || 1),
    });
    setShowForm(true);
  }

  async function saveProduct() {
    if (!form.name || !form.cost_price || !form.price) {
      toast.error('Name, cost price and selling price are required');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const productData = {
      user_id: user.id,
      name: form.name.trim(),
      barcode: form.barcode?.trim() || null,
      sku: form.sku?.trim() || null,
      category_id: form.category_id && form.category_id.trim() !== '' ? form.category_id : null,
      supplier_id: form.supplier_id && form.supplier_id.trim() !== '' ? form.supplier_id : null,
      cost_price: Number(form.cost_price) || 0,
      price: Number(form.price) || 0,
      stock: Number(form.stock) || 0,
      min_stock_level: Number(form.min_stock_level) || 10,
      unit: form.unit || 'piece',
      description: form.description?.trim() || null,
      is_active: true,
      expiry_date: form.expiry_date?.trim() || null,
      pack_size: Number(form.pack_size) || 1,
      pack_unit: form.pack_unit || 'piece',
      pieces_per_pack: Number(form.pieces_per_pack) || 1,
    };

    try {
      if (editProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editProduct.id);
        if (error) throw error;
        toast.success('Product updated successfully!');
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);
        if (error) throw error;
        toast.success('Product added successfully!');
      }
      setShowForm(false);
      setEditProduct(null);
      fetchData();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Error: ' + (error.message || 'Failed to save product'));
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast.success('Product deleted!');
      fetchData();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  }

  function handleBarcodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const existing = products.find(p => p.barcode === form.barcode);
      if (existing) {
        openEdit(existing);
        toast.info('Product found! Editing: ' + existing.name);
      } else {
        toast.success('Barcode scanned: ' + form.barcode);
        const nameInput = document.getElementById('product-name-input') as HTMLInputElement;
        if (nameInput) nameInput.focus();
      }
    }
  }

  const filtered = products
    .filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode && p.barcode.includes(search)) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = filterCategory === 'all' || p.category_id === filterCategory;
      const matchStock = filterStock === 'all' ||
        (filterStock === 'low' && p.stock <= p.min_stock_level) ||
        (filterStock === 'out' && p.stock === 0) ||
        (filterStock === 'in' && p.stock > p.min_stock_level);
      return matchSearch && matchCategory && matchStock;
    })
    .sort((a, b) => {
      let valA: any, valB: any;
      switch (sortBy) {
        case 'name': valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break;
        case 'stock': valA = a.stock; valB = b.stock; break;
        case 'price': valA = a.price; valB = b.price; break;
        case 'cost': valA = a.cost_price; valB = b.cost_price; break;
        default: valA = a.name; valB = b.name;
      }
      if (sortOrder === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

  const profitMargin = (cost: number, sell: number) => {
    if (cost === 0) return 0;
    return (((sell - cost) / cost) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Inventory</h1>
          <p className="text-sm text-gray-500">
            {products.length} products | {products.filter(p => p.stock <= p.min_stock_level).length} low stock
          </p>
        </div>
        <button
          onClick={openAdd}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium
                     hover:bg-blue-700 flex items-center gap-2 shadow-lg"
        >
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-6 border dark:border-gray-700 shadow-lg">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, barcode, SKU..."
              className="w-full pl-10 pr-4 py-2.5 border rounded-xl dark:bg-gray-700
                         dark:border-gray-600 dark:text-white"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={filterStock}
            onChange={(e) => setFilterStock(e.target.value)}
            className="px-3 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="all">All Stock</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border dark:border-gray-700 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                {[
                  { key: 'name', label: 'Product' },
                  { key: 'stock', label: 'Stock' },
                  { key: 'cost', label: 'Cost' },
                  { key: 'price', label: 'Sell Price' },
                  { key: 'profit', label: 'Profit %' },
                ].map(col => (
                  <th key={col.key}
                      onClick={() => {
                        if (sortBy === col.key) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        else { setSortBy(col.key); setSortOrder('asc'); }
                      }}
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-500
                                 dark:text-gray-400 uppercase cursor-pointer hover:text-blue-500">
                    <span className="flex items-center gap-1">
                      {col.label} <ArrowUpDown size={12} />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    <Package size={48} className="mx-auto mb-3 opacity-30" />
                    <p>No products found</p>
                    <button onClick={openAdd} className="text-blue-500 mt-2 text-sm hover:underline">
                      + Add your first product
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium dark:text-white">{p.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {p.barcode && (
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                              <Barcode size={10} className="inline mr-1" />{p.barcode}
                            </span>
                          )}
                          {p.category && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700
                                             dark:text-blue-300 px-2 py-0.5 rounded">
                              {typeof p.category === 'object' && p.category !== null ? (p.category as any).name : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${
                          p.stock === 0 ? 'text-red-500' :
                          p.stock <= p.min_stock_level ? 'text-orange-500' :
                          'text-green-500'
                        }`}>
                          {p.stock}
                        </span>
                        <span className="text-xs text-gray-500">/{p.unit}</span>
                        {p.stock <= p.min_stock_level && (
                          <AlertTriangle size={14} className="text-orange-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-gray-300">
                      Rs.{p.cost_price.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium dark:text-white">
                      Rs.{p.price.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${
                        Number(profitMargin(p.cost_price, p.price)) > 20 ? 'text-green-500' :
                        Number(profitMargin(p.cost_price, p.price)) > 10 ? 'text-yellow-500' :
                        'text-red-500'
                      }`}>
                        {profitMargin(p.cost_price, p.price)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg
                                     text-blue-600 transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg
                                     text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Form Header */}
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold dark:text-white">
                {editProduct ? 'Edit Product' : 'Add Product'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditProduct(null); }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X size={20} className="dark:text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Barcode Scanner Input */}
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                  <Barcode size={14} className="inline mr-1" /> Barcode (Scan or Type)
                </label>
                <div className="flex gap-2">
                  <input
                    ref={barcodeInputRef}
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    onKeyDown={handleBarcodeKeyDown}
                    placeholder="Scan barcode with gun or type manually..."
                    className="flex-1 border rounded-lg px-3 py-2 dark:bg-gray-700
                               dark:border-gray-600 dark:text-white
                               focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const existing = products.find(p => p.barcode === form.barcode);
                      if (existing) {
                        openEdit(existing);
                        toast.info('Found: ' + existing.name);
                      } else {
                        toast.info('New product - fill in the details');
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700
                               flex items-center gap-1 text-sm"
                  >
                    <Search size={16} /> Find
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Scanning gun auto-types the barcode and presses Enter
                </p>
              </div>

              {/* Product Name and SKU */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Product Name *</label>
                  <input
                    id="product-name-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter product name"
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">SKU</label>
                  <input
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="SKU code"
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              {/* Category and Supplier */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Category</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select category...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Supplier</label>
                  <select
                    value={form.supplier_id}
                    onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Unit, Stock, Min Stock */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Unit</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="piece">Piece</option>
                    <option value="kg">Kg</option>
                    <option value="gram">Gram</option>
                    <option value="liter">Liter</option>
                    <option value="ml">ML</option>
                    <option value="dozen">Dozen</option>
                    <option value="pack">Pack</option>
                    <option value="box">Box</option>
                    <option value="bag">Bag</option>
                    <option value="bottle">Bottle</option>
                    <option value="can">Can</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Stock Quantity</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    placeholder="0"
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Min Stock Level</label>
                  <input
                    type="number"
                    value={form.min_stock_level}
                    onChange={(e) => setForm({ ...form, min_stock_level: e.target.value })}
                    placeholder="10"
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Cost Price (Rs.) *</label>
                  <input
                    type="number"
                    value={form.cost_price}
                    onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                    placeholder="0"
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Selling Price (Rs.) *</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="0"
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              {/* Profit Preview */}
              {form.cost_price && form.price && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-200 dark:border-green-800">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700 dark:text-green-300">Profit per unit:</span>
                    <span className="font-bold text-green-700 dark:text-green-300">
                      Rs.{(Number(form.price) - Number(form.cost_price)).toLocaleString()}
                      ({profitMargin(Number(form.cost_price), Number(form.price))}%)
                    </span>
                  </div>
                </div>
              )}

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Expiry Date</label>
                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              {/* Pack Tracking */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">Pack Tracking</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 dark:text-gray-300">Pieces per Pack</label>
                    <input
                      type="number"
                      value={form.pieces_per_pack}
                      onChange={(e) => setForm({ ...form, pieces_per_pack: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 dark:text-gray-300">Pack Unit</label>
                    <select
                      value={form.pack_unit}
                      onChange={(e) => setForm({ ...form, pack_unit: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="piece">Piece</option>
                      <option value="kg">Kg</option>
                      <option value="liter">Liter</option>
                      <option value="bottle">Bottle</option>
                      <option value="can">Can</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 dark:text-gray-300">Pack Size</label>
                    <input
                      type="number"
                      value={form.pack_size}
                      onChange={(e) => setForm({ ...form, pack_size: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  Example: 1 pack of Olpers = 8 liters. Set pieces=8, unit=liter
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Optional description..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setShowForm(false); setEditProduct(null); }}
                  className="flex-1 border rounded-lg py-2.5 dark:border-gray-600 dark:text-white
                             hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProduct}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 font-medium
                             hover:bg-blue-700 shadow-lg"
                >
                  {editProduct ? 'Update' : 'Add'} Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
