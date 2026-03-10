'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { t } from '@/i18n';
import { Product, Category } from '@/types';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Package } from 'lucide-react';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '', category_id: '', cost_price: '', selling_price: '',
    stock_quantity: '', min_stock_level: '10', unit: 'piece', sku: '', barcode: '',
  });
  const supabase = createClient();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [productsRes, categoriesRes] = await Promise.all([
      supabase.from('products').select('*, category:categories(name)').order('name'),
      supabase.from('categories').select('*').order('name'),
    ]);
    setProducts(productsRes.data || []);
    setCategories(categoriesRes.data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const productData = {
      user_id: user.id,
      name: formData.name,
      category_id: formData.category_id || null,
      cost_price: Number(formData.cost_price),
      selling_price: Number(formData.selling_price),
      stock_quantity: Number(formData.stock_quantity),
      min_stock_level: Number(formData.min_stock_level),
      unit: formData.unit,
      sku: formData.sku || null,
      barcode: formData.barcode || null,
    };

    if (editProduct) {
      const { error } = await supabase.from('products').update(productData).eq('id', editProduct.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Product updated!');
    } else {
      const { error } = await supabase.from('products').insert(productData);
      if (error) { toast.error(error.message); return; }
      toast.success('Product added!');
    }

    resetForm();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Product deleted!');
    fetchData();
  };

  const handleEdit = (product: Product) => {
    setEditProduct(product);
    setFormData({
      name: product.name, category_id: product.category_id || '',
      cost_price: product.cost_price.toString(), selling_price: product.selling_price.toString(),
      stock_quantity: product.stock_quantity.toString(), min_stock_level: product.min_stock_level.toString(),
      unit: product.unit, sku: product.sku || '', barcode: product.barcode || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditProduct(null);
    setFormData({ name: '', category_id: '', cost_price: '', selling_price: '', stock_quantity: '', min_stock_level: '10', unit: 'piece', sku: '', barcode: '' });
  };

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-white">{t('inventory.title')}</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
          <Plus size={20} /> {t('inventory.addProduct')}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input type="text" placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 dark:text-white">{editProduct ? t('inventory.editProduct') : t('inventory.addProduct')}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="text" placeholder={t('inventory.productName')} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
              <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="">Select Category</option>
                {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder={t('inventory.costPrice')} value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                  className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                <input type="number" placeholder={t('inventory.sellingPrice')} value={formData.selling_price} onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                  className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder={t('inventory.stock')} value={formData.stock_quantity} onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                <input type="number" placeholder={t('inventory.minStock')} value={formData.min_stock_level} onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                  className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder={t('inventory.sku')} value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="piece">Piece</option><option value="kg">KG</option><option value="liter">Liter</option>
                  <option value="pack">Pack</option><option value="dozen">Dozen</option><option value="box">Box</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="flex-1 py-2 border rounded-lg dark:text-white dark:border-gray-600">{t('common.cancel')}</button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left dark:text-gray-300">Product</th>
                <th className="px-4 py-3 text-left dark:text-gray-300 hidden md:table-cell">Category</th>
                <th className="px-4 py-3 text-right dark:text-gray-300">Cost</th>
                <th className="px-4 py-3 text-right dark:text-gray-300">Price</th>
                <th className="px-4 py-3 text-right dark:text-gray-300">Stock</th>
                <th className="px-4 py-3 text-right dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">No products found. Add your first product!</td></tr>
              ) : (
                filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-gray-400" />
                        <span className="font-medium dark:text-white">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{(product.category as any)?.name || '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(product.cost_price)}</td>
                    <td className="px-4 py-3 text-right font-medium dark:text-white">{formatCurrency(product.selling_price)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        product.stock_quantity <= 0 ? 'bg-red-100 text-red-700' :
                        product.stock_quantity <= product.min_stock_level ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {product.stock_quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(product)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"><Edit size={16} className="text-blue-600" /></button>
                        <button onClick={() => handleDelete(product.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"><Trash2 size={16} className="text-red-600" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
