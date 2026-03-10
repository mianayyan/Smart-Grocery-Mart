'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Users, Shield, ShieldOff, Phone, Mail, Clock } from 'lucide-react';

interface Employee {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier' | 'stock_keeper';
  salary: number;
  join_date: string;
  is_active: boolean;
  permissions: string[];
  created_at: string;
}

const ROLES = [
  { id: 'admin', name: 'Admin', color: '#EF4444', description: 'Full access to everything' },
  { id: 'manager', name: 'Manager', color: '#8B5CF6', description: 'Can manage inventory, sales, and reports' },
  { id: 'cashier', name: 'Cashier', color: '#3B82F6', description: 'Can process sales and view products' },
  { id: 'stock_keeper', name: 'Stock Keeper', color: '#10B981', description: 'Can manage inventory only' },
];

const ALL_PERMISSIONS = [
  { id: 'pos', name: 'Point of Sale', icon: '🛒' },
  { id: 'inventory', name: 'Inventory Management', icon: '📦' },
  { id: 'customers', name: 'Customer Management', icon: '👥' },
  { id: 'credit_book', name: 'Credit Book', icon: '💳' },
  { id: 'expenses', name: 'Expense Tracking', icon: '🧾' },
  { id: 'analytics', name: 'Analytics & Reports', icon: '📊' },
  { id: 'marketing', name: 'Marketing', icon: '📣' },
  { id: 'suppliers', name: 'Supplier Management', icon: '🚛' },
  { id: 'settings', name: 'Store Settings', icon: '⚙️' },
  { id: 'employees', name: 'Employee Management', icon: '👷' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ALL_PERMISSIONS.map(p => p.id),
  manager: ['pos', 'inventory', 'customers', 'credit_book', 'expenses', 'analytics', 'suppliers'],
  cashier: ['pos', 'customers'],
  stock_keeper: ['inventory', 'suppliers'],
};

export default function EmployeesPage() {
  const supabase = createClient();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '', phone: '', email: '', role: 'cashier' as string,
    salary: '', join_date: new Date().toISOString().slice(0, 10),
    is_active: true, permissions: ['pos', 'customers'] as string[]
  });

  useEffect(() => { fetchEmployees(); }, []);

  async function fetchEmployees() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('employees').select('*').eq('user_id', user.id).order('name');
    setEmployees(data || []);
    setLoading(false);
  }

  function openAdd() {
    setEditEmployee(null);
    setForm({ name: '', phone: '', email: '', role: 'cashier', salary: '', join_date: new Date().toISOString().slice(0, 10), is_active: true, permissions: ROLE_PERMISSIONS['cashier'] });
    setShowForm(true);
  }

  function openEdit(emp: Employee) {
    setEditEmployee(emp);
    setForm({
      name: emp.name, phone: emp.phone || '', email: emp.email || '',
      role: emp.role, salary: String(emp.salary || ''),
      join_date: emp.join_date || '', is_active: emp.is_active,
      permissions: emp.permissions || ROLE_PERMISSIONS[emp.role]
    });
    setShowForm(true);
  }

  function handleRoleChange(role: string) {
    setForm({ ...form, role, permissions: ROLE_PERMISSIONS[role] || [] });
  }

  function togglePermission(permId: string) {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId]
    }));
  }

  async function saveEmployee() {
    if (!form.name) { toast.error('Please enter employee name'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const empData = {
      user_id: user.id, name: form.name, phone: form.phone, email: form.email,
      role: form.role, salary: Number(form.salary) || 0, join_date: form.join_date,
      is_active: form.is_active, permissions: form.permissions
    };

    if (editEmployee) {
      const { error } = await supabase.from('employees').update(empData).eq('id', editEmployee.id);
      if (error) { toast.error('Error: ' + error.message); return; }
      toast.success('Employee updated successfully');
    } else {
      const { error } = await supabase.from('employees').insert(empData);
      if (error) { toast.error('Error: ' + error.message); return; }
      toast.success('Employee added successfully');
    }
    setShowForm(false);
    fetchEmployees();
  }

  async function deleteEmployee(id: string) {
    if (!confirm('Are you sure you want to remove this employee?')) return;
    await supabase.from('employees').delete().eq('id', id);
    toast.success('Employee removed');
    fetchEmployees();
  }

  async function toggleActive(emp: Employee) {
    await supabase.from('employees').update({ is_active: !emp.is_active }).eq('id', emp.id);
    toast.success(emp.is_active ? 'Employee deactivated' : 'Employee activated');
    fetchEmployees();
  }

  const filtered = employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.phone?.includes(search) || e.role.includes(search.toLowerCase()));
  const activeCount = employees.filter(e => e.is_active).length;
  const totalSalary = employees.filter(e => e.is_active).reduce((s, e) => s + (e.salary || 0), 0);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Management</h1>
          <p className="text-gray-500">Manage staff accounts and permissions</p></div>
        <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"><Plus size={18}/>Add Employee</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-blue-600 text-sm font-medium">Total Employees</p>
          <p className="text-2xl font-bold text-blue-700">{employees.length}</p></div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <p className="text-green-600 text-sm font-medium">Active</p>
          <p className="text-2xl font-bold text-green-700">{activeCount}</p></div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <p className="text-red-600 text-sm font-medium">Inactive</p>
          <p className="text-2xl font-bold text-red-700">{employees.length - activeCount}</p></div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
          <p className="text-purple-600 text-sm font-medium">Monthly Salary</p>
          <p className="text-2xl font-bold text-purple-700">Rs.{totalSalary.toLocaleString()}</p></div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"/></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500"><Users size={48} className="mx-auto mb-3 opacity-50"/><p>No employees yet</p></div>
        ) : (
          filtered.map(emp => {
            const role = ROLES.find(r => r.id === emp.role);
            return (
              <div key={emp.id} className={`bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 ${!emp.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: role?.color || '#6B7280' }}>
                      {emp.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold dark:text-white">{emp.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: role?.color }}>{role?.name}</span>
                    </div>
                  </div>
                  <button onClick={() => toggleActive(emp)} className={`p-1.5 rounded-lg ${emp.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-100'}`}>
                    {emp.is_active ? <Shield size={18}/> : <ShieldOff size={18}/>}
                  </button>
                </div>

                <div className="space-y-1.5 text-sm mb-3">
                  {emp.phone && <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><Phone size={14}/>{emp.phone}</p>}
                  {emp.email && <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><Mail size={14}/>{emp.email}</p>}
                  {emp.join_date && <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><Clock size={14}/>Joined: {new Date(emp.join_date).toLocaleDateString('en-PK')}</p>}
                  {emp.salary > 0 && <p className="text-gray-600 dark:text-gray-400">Salary: <span className="font-medium text-green-600">Rs.{emp.salary.toLocaleString()}</span>/month</p>}
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {(emp.permissions || []).slice(0, 4).map(p => {
                    const perm = ALL_PERMISSIONS.find(ap => ap.id === p);
                    return perm ? <span key={p} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded dark:text-gray-300">{perm.icon} {perm.name}</span> : null;
                  })}
                  {(emp.permissions || []).length > 4 && <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded dark:text-gray-300">+{emp.permissions.length - 4} more</span>}
                </div>

                <div className="flex gap-2 border-t dark:border-gray-700 pt-3">
                  <button onClick={() => openEdit(emp)} className="flex-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 py-1.5 rounded-lg flex items-center justify-center gap-1"><Edit size={14}/>Edit</button>
                  <button onClick={() => deleteEmployee(emp.id)} className="flex-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 py-1.5 rounded-lg flex items-center justify-center gap-1"><Trash2 size={14}/>Remove</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 dark:text-white">{editEmployee ? 'Edit Employee' : 'Add Employee'}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Full Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="03XX-XXXXXXX" className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Email</label>
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Monthly Salary (Rs.)</label>
                  <input type="number" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Join Date</label>
                  <input type="date" value={form.join_date} onChange={e => setForm({ ...form, join_date: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Status</label>
                  <select value={form.is_active ? 'active' : 'inactive'} onChange={e => setForm({ ...form, is_active: e.target.value === 'active' })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <option value="active">Active</option><option value="inactive">Inactive</option></select></div>
              </div>

              <div><label className="block text-sm font-medium mb-2 dark:text-gray-300">Role</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {ROLES.map(role => (
                    <button key={role.id} onClick={() => handleRoleChange(role.id)}
                      className={`p-3 rounded-lg border text-center text-sm ${form.role === role.id ? 'border-2 ring-2 ring-offset-1' : 'border-gray-200 dark:border-gray-700'}`}
                      style={form.role === role.id ? { borderColor: role.color, ringColor: role.color } : {}}>
                      <div className="w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: role.color }}>{role.name[0]}</div>
                      <p className="font-medium dark:text-white">{role.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div><label className="block text-sm font-medium mb-2 dark:text-gray-300">Permissions</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {ALL_PERMISSIONS.map(perm => (
                    <label key={perm.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${form.permissions.includes(perm.id) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                      <input type="checkbox" checked={form.permissions.includes(perm.id)} onChange={() => togglePermission(perm.id)} className="rounded"/>
                      <span className="text-sm dark:text-gray-300">{perm.icon} {perm.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 border rounded-lg py-2 dark:border-gray-600 dark:text-white">Cancel</button>
                <button onClick={saveEmployee} className="flex-1 bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700">{editEmployee ? 'Update' : 'Add'} Employee</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
