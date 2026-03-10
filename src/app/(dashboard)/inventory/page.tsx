'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Product, Category } from '@/types';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, Filter } from 'lucide-react';

export default function InventoryPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStock, setFilterStock] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: '', barcode: '', sku: '', category_id: '', supplier_id: '',
    cost_price: '', selling_price: '', stock_quantity: '', min_stock_level: '10',
    unit: 'piece', description: '', expiry_date: '',
    pack_size: '1', pack_unit: 'piece', pieces_per_pack: '1'
  });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prodData } = await supabase.from('products').select('*').eq('user_id', user.id).order('name');
    const { data: catData } = await supabase.from('categories').select('*').or(`user_id.eq.${user.id},user_id.is.null`).order('name');
    setProducts(prodData || []);
    setCategories(catData || []);
    setLoading(false);
  }

  function openAdd() {
    setEditProduct(null);
    setForm({ name: '', barcode: '', sku: '', category_id: '', supplier_id: '', cost_price: '', selling_price: '', stock_quantity: '', min_stock_level: '10', unit: 'piece', description: '', expiry_date: '', pack_size: '1', pack_unit: 'piece', pieces_per_pack: '1' });
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditProduct(p);
    setForm({
      name: p.name, barcode: p.barcode || '', sku: p.sku || '', category_id: p.category_id || '',
      supplier_id: p.supplier_id || '', cost_price: String(p.cost_price), selling_price: String(p.selling_price),
      stock_quantity: String(p.stock_quantity), min_stock_level: String(p.min_stock_level), unit: p.unit,
      description: p.description || '', expiry_date: (p as any).expiry_date || '',
      pack_size: String((p as any).pack_size || 1), pack_unit: (p as any).pack_unit || 'piece',
      pieces_per_pack: String((p as any).pieces_per_pack || 1)
    });
    setShowForm(true);
  }

  async function saveProduct() {
    if (!form.name || !form.cost_price || !form.selling_price) { toast.error('Name, cost & selling price required'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const productData = {
      user_id: user.id, name: form.name, barcode: form.barcode || null, sku: form.sku || null,
      category_id: form.category_id || null, supplier_id: form.supplier_id || null,
      cost_price: Number(form.cost_price), selling_price: Number(form.selling_price),
      stock_quantity: Number(form.stock_quantity || 0), min_stock_level: Number(form.min_stock_level || 10),
      unit: form.unit, description: form.description || null, is_active: true,
      expiry_date: form.expiry_date || null, pack_size: Number(form.pack_size || 1),
      pack_unit: form.pack_unit, pieces_per_pack: Number(form.pieces_per_pack || 1)
    };

    if (editProduct) {
      const { error } = await supabase.from('products').update(productData).eq('id', editProduct.id);
      if (error) { toast.error('Error: ' + error.message); return; }
      toast.success('Product updated!');
    } else {
      const { error } = await supabase.from('products').insert(productData);
      if (error) { toast.error('Error: ' + error.message); return; }
      toast.success('Product added!');
    }
    setShowForm(false);
    fetchData();
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product?')) return;
    await supabase.from('products').delete().eq('id', id);
    toast.success('Product deleted');
    fetchData();
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search) || p.sku?.includes(search);
    const matchCat = filterCategory === 'all' || p.category_id === filterCategory;
    const matchStock = filterStock === 'all' || (filterStock === 'low' && p.stock_quantity <= p.min_stock_level) || (filterStock === 'out' && p.stock_quantity === 0);
    return matchSearch && matchCat && matchStock;
  });

  const lowStockCount = products.filter(p => p.stock_quantity <= p.min_stock_level && p.stock_quantity > 0).length;
  const outOfStockCount = products.filter(p => p.stock_quantity === 0).length;
  const totalValue = products.reduce((s, p) => s + p.selling_price * p.stock_quantity, 0);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
          <p className="text-gray-500">{products.length} products</p></div>
        <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"><Plus size={18}/>Add Product</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-blue-600 text-sm">Total Products</p><p className="text-2xl font-bold text-blue-700">{products.length}</p></div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <p className="text-green-600 text-sm">Stock Value</p><p className="text-2xl font-bold text-green-700">Rs.{totalValue.toLocaleString()}</p></div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
          <p className="text-yellow-600 text-sm">Low Stock</p><p className="text-2xl font-bold text-yellow-700">{lowStockCount}</p></div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <p className="text-red-600 text-sm">Out of Stock</p><p className="text-2xl font-bold text-red-700">{outOfStockCount}</p></div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, barcode, SKU..." className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"/></div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
          <option value="all">All Categories</option>{categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select>
        <select value={filterStock} onChange={e => setFilterStock(e.target.value)} className="border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
          <option value="all">All Stock</option><option value="low">Low Stock</option><option value="out">Out of Stock</option></select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 dark:bg-gray-750 text-gray-500 border-b dark:border-gray-700">
            <th className="text-left p-3">Product</th><th className="text-left p-3">Category</th><th className="text-left p-3">Barcode</th>
            <th className="text-right p-3">Cost</th><th className="text-right p-3">Price</th><th className="text-right p-3">Stock</th>
            <th className="text-left p-3">Pack Info</th><th className="text-left p-3">Expiry</th><th className="text-center p-3">Actions</th>
          </tr></thead>
          <tbody>{filtered.map(p => {
            const cat = categories.find(c => c.id === p.category_id);
            const isLow = p.stock_quantity <= p.min_stock_level;
            const isExpiring = (p as any).expiry_date && new Date((p as any).expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            return (
              <tr key={p.id} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 ${isLow ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                <td className="p-3"><p className="font-medium dark:text-white">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.unit}</p></td>
                <td className="p-3">{cat ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ backgroundColor: cat.color + '20', color: cat.color }}>{cat.icon} {cat.name}</span> : <span className="text-gray-400">-</span>}</td>
                <td className="p-3 text-xs font-mono dark:text-gray-300">{p.barcode || '-'}</td>
                <td className="p-3 text-right dark:text-gray-300">Rs.{Number(p.cost_price).toLocaleString()}</td>
                <td className="p-3 text-right font-medium dark:text-white">Rs.{Number(p.selling_price).toLocaleString()}</td>
                <td className="p-3 text-right"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {isLow && <AlertTriangle size={12}/>}{p.stock_quantity}</span></td>
                <td className="p-3 text-xs dark:text-gray-300">{(p as any).pieces_per_pack > 1 ? `${(p as any).pieces_per_pack} ${(p as any).pack_unit}/pack` : '-'}</td>
                <td className="p-3 text-xs"><span className={isExpiring ? 'text-red-600 font-medium' : 'dark:text-gray-300'}>{(p as any).expiry_date ? new Date((p as any).expiry_date).toLocaleDateString('en-PK') : '-'}</span></td>
                <td className="p-3 text-center"><div className="flex justify-center gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-blue-100 rounded text-blue-600"><Edit size={16}/></button>
                  <button onClick={() => deleteProduct(p.id)} className="p-1.5 hover:bg-red-100 rounded text-red-600"><Trash2 size={16}/></button></div></td>
              </tr>);})}</tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-gray-500"><Package size={48} className="mx-auto mb-3 opacity-50"/><p>No products found</p></div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 dark:text-white">{editProduct ? 'Edit Product' : 'Add Product'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><label className="block text-sm font-medium mb-1 dark:text-gray-300">Product Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>

              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Barcode</label>
                <input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} placeholder="Scan or type barcode" className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>

              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">SKU</label>
                <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>

              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Category</label>
                <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="">Select category...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></div>

              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Unit</label>
                <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="piece">Piece</option><option value="kg">KG</option><option value="liter">Liter</option><option value="pack">Pack</option><option value="dozen">Dozen</option><option value="box">Box</option><option value="bottle">Bottle</option><option value="bag">Bag</option></select></div>

              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Cost Price (Rs.) *</label>
                <input type="number" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>

              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Selling Price (Rs.) *</label>
                <input type="number" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>

              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Stock Quantity</label>
                <input type="number" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>

              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Min Stock Level</label>
                <input type="number" value={form.min_stock_level} onChange={e => setForm({ ...form, min_stock_level: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>

              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Expiry Date</label>
                <input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>

              <div className="md:col-span-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-blue-700 dark:text-blue-400 mb-3">Pack Tracking</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-xs font-medium mb-1 dark:text-gray-300">Pieces per Pack</label>
                    <input type="number" value={form.pieces_per_pack} onChange={e => setForm({ ...form, pieces_per_pack: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
                  <div><label className="block text-xs font-medium mb-1 dark:text-gray-300">Pack Unit</label>
                    <select value={form.pack_unit} onChange={e => setForm({ ...form, pack_unit: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <option value="piece">Piece</option><option value="liter">Liter</option><option value="kg">KG</option><option value="bottle">Bottle</option><option value="can">Can</option></select></div>
                  <div><label className="block text-xs font-medium mb-1 dark:text-gray-300">Pack Size</label>
                    <input type="number" value={form.pack_size} onChange={e => setForm({ ...form, pack_size: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
                </div>
                <p className="text-xs text-blue-600 mt-2">Example: 1 pack of Olpers = 8 liters. Set pieces=8, unit=liter</p>
              </div>

              <div className="md:col-span-2"><label className="block text-sm font-medium mb-1 dark:text-gray-300">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 border rounded-lg py-2 dark:border-gray-600 dark:text-white">Cancel</button>
              <button onClick={saveProduct} className="flex-1 bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700">{editProduct ? 'Update' : 'Add'} Product</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
