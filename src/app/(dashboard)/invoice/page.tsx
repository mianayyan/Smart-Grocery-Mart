'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useStoreConfig } from '@/store/storeConfig';
import { FileText, Search, Download, MessageSquare, Printer, ChevronDown, ChevronUp } from 'lucide-react';

export default function InvoicePage() {
  const supabase = createClient();
  const storeConfig = useStoreConfig();
  const [sales, setSales] = useState([]);
  const [saleItems, setSaleItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedSale, setExpandedSale] = useState(null);

  useEffect(function() { loadData(); }, []);

  async function loadData() {
    var u = await supabase.auth.getUser();
    var user = u.data.user;
    if (!user) return;
    var r1 = await supabase.from('sales').select('*, customer:customers(name, phone)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
    var r2 = await supabase.from('sale_items').select('*');
    var r3 = await supabase.from('products').select('id, name, price, selling_price').eq('user_id', user.id);
    setSales(r1.data || []);
    setSaleItems(r2.data || []);
    setProducts(r3.data || []);
    setLoading(false);
  }

  function getItems(saleId) { return saleItems.filter(function(i) { return i.sale_id === saleId; }); }
  function getProduct(pid) { return products.find(function(p) { return p.id === pid; }); }

  function makeBillText(sale) {
    var name = storeConfig.storeName || 'Smart Grocery Mart';
    var items = getItems(sale.id);
    var b = '*' + name + '*' + '\n';
    if (storeConfig.storeAddress) b += storeConfig.storeAddress + '\n';
    if (storeConfig.storePhone) b += storeConfig.storePhone + '\n';
    b += '\nDate: ' + new Date(sale.created_at).toLocaleDateString() + ' ' + new Date(sale.created_at).toLocaleTimeString();
    if (sale.customer && sale.customer.name) b += '\nCustomer: ' + sale.customer.name;
    b += '\n\n*Items:*\n';
    items.forEach(function(it, idx) {
      var prod = getProduct(it.product_id);
      b += (idx + 1) + '. ' + (prod ? prod.name : 'Product') + '\n   ' + it.quantity + ' x Rs.' + (it.price || 0) + ' = Rs.' + (it.total || 0) + '\n';
    });
    b += '\n';
    if (sale.discount > 0) b += 'Discount: -Rs.' + sale.discount + '\n';
    if (sale.tax > 0) b += 'Tax: Rs.' + sale.tax + '\n';
    b += '*TOTAL: Rs.' + (sale.total || 0) + '*\n';
    b += 'Payment: ' + (sale.payment_method || 'cash').toUpperCase() + '\n';
    b += '\nThank you for shopping at ' + name + '!';
    return b;
  }

  function sendWhatsApp(sale) {
    var phone = sale.customer ? sale.customer.phone : null;
    if (!phone) { alert('No phone number for this customer'); return; }
    var clean = phone.replace(/[^0-9]/g, '');
    var full = clean.startsWith('92') ? clean : clean.startsWith('0') ? '92' + clean.slice(1) : '92' + clean;
    window.open('https://wa.me/' + full + '?text=' + encodeURIComponent(makeBillText(sale)), '_blank');
  }

  function printInvoice(sale) {
    var items = getItems(sale.id);
    var name = storeConfig.storeName || 'Smart Grocery Mart';
    var html = '<html><head><title>Invoice</title><style>body{font-family:Arial;max-width:400px;margin:0 auto;padding:20px}h2{text-align:center;margin:0}p{text-align:center;margin:2px 0;color:#666;font-size:12px}table{width:100%;border-collapse:collapse;margin:10px 0}th,td{padding:4px 8px;text-align:left;border-bottom:1px solid #eee;font-size:12px}th{background:#f5f5f5}.total{font-size:16px;font-weight:bold;text-align:right;padding:10px 0}.footer{text-align:center;font-size:11px;color:#999;margin-top:15px}</style></head><body>';
    html += '<h2>' + name + '</h2>';
    if (storeConfig.storeAddress) html += '<p>' + storeConfig.storeAddress + '</p>';
    if (storeConfig.storePhone) html += '<p>' + storeConfig.storePhone + '</p>';
    html += '<hr/>';
    html += '<p style="text-align:left;color:#333"><b>Date:</b> ' + new Date(sale.created_at).toLocaleString() + '</p>';
    if (sale.customer && sale.customer.name) html += '<p style="text-align:left;color:#333"><b>Customer:</b> ' + sale.customer.name + '</p>';
    html += '<table><thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>';
    items.forEach(function(it, idx) {
      var prod = getProduct(it.product_id);
      html += '<tr><td>' + (idx + 1) + '</td><td>' + (prod ? prod.name : 'Product') + '</td><td>' + it.quantity + '</td><td>Rs.' + (it.price || 0) + '</td><td>Rs.' + (it.total || 0) + '</td></tr>';
    });
    html += '</tbody></table>';
    if (sale.discount > 0) html += '<p style="text-align:right">Discount: -Rs.' + sale.discount + '</p>';
    if (sale.tax > 0) html += '<p style="text-align:right">Tax: Rs.' + sale.tax + '</p>';
    html += '<div class="total">Total: Rs.' + (sale.total || 0) + '</div>';
    html += '<p style="text-align:right;font-size:11px">Payment: ' + (sale.payment_method || 'cash').toUpperCase() + '</p>';
    html += '<div class="footer"><p>Thank you!</p><p>' + name + '</p></div></body></html>';
    var w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(function() { w.print(); }, 500); }
  }

  async function downloadPDF(sale) {
    var jsPDFModule = await import('jspdf');
    var doc = new jsPDFModule.default();
    await import('jspdf-autotable');
    var items = getItems(sale.id);
    var name = storeConfig.storeName || 'Smart Grocery Mart';
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text(name, 105, 20, { align: 'center' });
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    if (storeConfig.storeAddress) doc.text(storeConfig.storeAddress, 105, 27, { align: 'center' });
    if (storeConfig.storePhone) doc.text(storeConfig.storePhone, 105, 32, { align: 'center' });
    var y = storeConfig.storeAddress ? 40 : 33;
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 105, y, { align: 'center' }); y += 8;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('Date: ' + new Date(sale.created_at).toLocaleString(), 14, y); y += 5;
    if (sale.customer && sale.customer.name) { doc.text('Customer: ' + sale.customer.name, 14, y); y += 5; }
    if (sale.customer && sale.customer.phone) { doc.text('Phone: ' + sale.customer.phone, 14, y); y += 5; }
    y += 3;
    var tableData = items.map(function(it, idx) {
      var prod = getProduct(it.product_id);
      return [idx + 1, prod ? prod.name : 'Product', it.quantity, 'Rs.' + (it.price || 0), 'Rs.' + (it.total || 0)];
    });
    doc.autoTable({ startY: y, head: [['#', 'Item', 'Qty', 'Price', 'Total']], body: tableData, theme: 'grid', headStyles: { fillColor: [37, 99, 235] }, styles: { fontSize: 9 } });
    y = doc.lastAutoTable.finalY + 10;
    if (sale.discount > 0) { doc.text('Discount: -Rs.' + sale.discount, 196, y, { align: 'right' }); y += 5; }
    if (sale.tax > 0) { doc.text('Tax: Rs.' + sale.tax, 196, y, { align: 'right' }); y += 5; }
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text('TOTAL: Rs.' + (sale.total || 0), 196, y, { align: 'right' }); y += 5;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('Payment: ' + (sale.payment_method || 'cash').toUpperCase(), 196, y, { align: 'right' }); y += 10;
    doc.text('Thank you for shopping at ' + name + '!', 105, y, { align: 'center' });
    doc.save(name.replace(/ /g, '_') + '_Invoice_' + new Date(sale.created_at).toISOString().split('T')[0] + '.pdf');
  }

  var filtered = sales.filter(function(s) {
    var custName = s.customer && s.customer.name ? s.customer.name.toLowerCase() : '';
    var q = search.toLowerCase();
    return custName.includes(q) || (s.payment_method || '').includes(q) || new Date(s.created_at).toLocaleDateString().includes(search);
  });

  if (loading) return (<div className="p-6 flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div>);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2"><FileText className="text-blue-600"/>Invoices</h1>
        <p className="text-gray-500 text-sm mt-1">View, print, download and share invoices via WhatsApp</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
          <input value={search} onChange={function(e) { setSearch(e.target.value); }} placeholder="Search by customer, date, payment method..."
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-8 text-center">
          <FileText size={48} className="mx-auto mb-3 text-gray-300"/>
          <p className="text-gray-500">No invoices found. Complete a sale in POS to see invoices here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(function(sale) {
            var items = getItems(sale.id);
            var isExpanded = expandedSale === sale.id;
            return (
              <div key={sale.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750"
                  onClick={function() { setExpandedSale(isExpanded ? null : sale.id); }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <FileText size={18} className="text-blue-600"/>
                    </div>
                    <div>
                      <p className="font-medium dark:text-white text-sm">{sale.customer ? sale.customer.name : 'Walk-in Customer'}</p>
                      <p className="text-xs text-gray-500">{new Date(sale.created_at).toLocaleDateString()} {new Date(sale.created_at).toLocaleTimeString()} | {items.length} items</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-green-600">Rs. {(sale.total || 0).toLocaleString()}</p>
                      <span className={'text-xs px-2 py-0.5 rounded-full ' + (sale.payment_method === 'cash' ? 'bg-green-100 text-green-700' : sale.payment_method === 'card' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>{sale.payment_method || 'cash'}</span>
                    </div>
                    {isExpanded ? <ChevronUp size={18} className="text-gray-400"/> : <ChevronDown size={18} className="text-gray-400"/>}
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t dark:border-gray-700 p-4">
                    <table className="w-full text-sm mb-4">
                      <thead><tr className="text-gray-500 text-xs"><th className="text-left py-1">#</th><th className="text-left py-1">Item</th><th className="text-center py-1">Qty</th><th className="text-right py-1">Price</th><th className="text-right py-1">Total</th></tr></thead>
                      <tbody>{items.map(function(it, idx) {
                        var prod = getProduct(it.product_id);
                        return (<tr key={it.id} className="dark:text-gray-300 border-b dark:border-gray-700"><td className="py-1">{idx + 1}</td><td>{prod ? prod.name : 'Product'}</td><td className="text-center">{it.quantity}</td><td className="text-right">Rs.{(it.price || 0).toLocaleString()}</td><td className="text-right font-medium">Rs.{(it.total || 0).toLocaleString()}</td></tr>);
                      })}</tbody>
                    </table>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <button onClick={function(e) { e.stopPropagation(); sendWhatsApp(sale); }} className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-lg text-xs hover:bg-green-700"><MessageSquare size={14}/>WhatsApp</button>
                        <button onClick={function(e) { e.stopPropagation(); printInvoice(sale); }} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-xs hover:bg-blue-700"><Printer size={14}/>Print</button>
                        <button onClick={function(e) { e.stopPropagation(); downloadPDF(sale); }} className="flex items-center gap-1 bg-purple-600 text-white px-3 py-2 rounded-lg text-xs hover:bg-purple-700"><Download size={14}/>PDF</button>
                      </div>
                      <p className="font-bold text-lg dark:text-white">Rs. {(sale.total || 0).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}