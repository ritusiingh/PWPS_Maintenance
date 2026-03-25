import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../utils/helpers';
import {
  Settings as SettingsIcon, Users, Shield, Plus, Edit2, Trash2,
  X, Eye, EyeOff, Save, Check, XCircle, UserPlus, UserMinus, CheckSquare, Square
} from 'lucide-react';

const CATEGORIES = ['security','housekeeping','electricity','lift','garden','water','amenity','other'];

export default function Settings() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('users');

  if (!isAdmin) return (
    <div className="flex flex-col items-center justify-center py-20">
      <Shield className="w-12 h-12 text-gray-300 mb-3" />
      <h2 className="text-lg font-semibold text-gray-600">Admin Access Required</h2>
      <p className="text-sm text-gray-400 mt-1">Contact your administrator for access</p>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-brand-600" />
          Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manage users, charges, and app configuration</p>
      </div>
      <div className="tab-group">
        <button onClick={() => setTab('users')} className={`tab-item ${tab === 'users' ? 'active' : ''}`}>Users</button>
        <button onClick={() => setTab('charges')} className={`tab-item ${tab === 'charges' ? 'active' : ''}`}>Service Charges</button>
        <button onClick={() => setTab('config')} className={`tab-item ${tab === 'config' ? 'active' : ''}`}>Configuration</button>
      </div>
      {tab === 'users' && <UserManagement />}
      {tab === 'charges' && <ChargeManagement />}
      {tab === 'config' && <AppConfig />}
    </div>
  );
}

/* =============================== USER MANAGEMENT =============================== */
function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [flats, setFlats] = useState([]);
  const [selected, setSelected] = useState(new Set());

  const loadData = () => {
    setLoading(true);
    Promise.all([api.get('/auth/users'), api.get('/flats')])
      .then(([u, f]) => { setUsers(u.data); setFlats(f.data); })
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === users.length) setSelected(new Set());
    else setSelected(new Set(users.map(u => u.id)));
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    const adminInSelection = users.filter(u => selected.has(u.id) && u.role === 'admin');
    if (adminInSelection.length > 0) {
      if (!confirm(`Warning: ${adminInSelection.length} admin user(s) selected. Admin users will be deactivated, not deleted. Continue?`)) return;
    } else {
      if (!confirm(`Deactivate ${selected.size} selected user(s)?`)) return;
    }
    try {
      for (const id of selected) {
        const user = users.find(u => u.id === id);
        if (user) await api.put(`/auth/users/${id}`, { ...user, is_active: 0 });
      }
      setSelected(new Set());
      loadData();
    } catch (err) { alert('Failed to update some users'); }
  };

  const handleBulkActivate = async () => {
    if (selected.size === 0) return;
    try {
      for (const id of selected) {
        const user = users.find(u => u.id === id);
        if (user) await api.put(`/auth/users/${id}`, { ...user, is_active: 1 });
      }
      setSelected(new Set());
      loadData();
    } catch (err) { alert('Failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-500">{users.length} users \u00b7 {selected.size} selected</p>
        <div className="flex gap-2 flex-wrap">
          {selected.size > 0 && (
            <>
              <button onClick={handleBulkActivate} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
                <UserPlus className="w-3.5 h-3.5 text-green-600" /> Activate ({selected.size})
              </button>
              <button onClick={handleBulkDelete} className="btn-danger flex items-center gap-1.5 text-xs py-1.5 px-3">
                <UserMinus className="w-3.5 h-3.5" /> Deactivate ({selected.size})
              </button>
            </>
          )}
          <button onClick={() => { setEditUser(null); setShowForm(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th className="w-10">
                  <button onClick={toggleAll} className="p-1">
                    {selected.size === users.length && users.length > 0
                      ? <CheckSquare className="w-4 h-4 text-brand-600" />
                      : <Square className="w-4 h-4 text-gray-400" />}
                  </button>
                </th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th className="hidden sm:table-cell">Flat</th>
                <th>Status</th>
                <th className="w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={selected.has(u.id) ? 'bg-brand-50/40' : ''}>
                  <td>
                    <button onClick={() => toggleSelect(u.id)} className="p-1">
                      {selected.has(u.id)
                        ? <CheckSquare className="w-4 h-4 text-brand-600" />
                        : <Square className="w-4 h-4 text-gray-300" />}
                    </button>
                  </td>
                  <td className="font-medium text-gray-800">{u.name}</td>
                  <td className="text-sm text-gray-500">{u.email}</td>
                  <td>
                    <span className={
                      u.role === 'admin' ? 'badge bg-purple-50 text-purple-700 ring-1 ring-purple-200' :
                      u.role === 'viewer' ? 'badge bg-gray-100 text-gray-600 ring-1 ring-gray-200' :
                      'badge-teal'
                    }>
                      {u.role === 'admin' ? '\ud83d\udd11 Admin' : u.role === 'viewer' ? '\ud83d\udc41 Viewer' : '\ud83c\udfe0 Resident'}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell font-mono text-sm text-gray-500">{u.flat_number || '-'}</td>
                  <td>
                    <span className={u.is_active ? 'badge-green' : 'badge-red'}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditUser(u); setShowForm(true); }} className="btn-ghost p-1.5" title="Edit user">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <UserForm
          user={editUser}
          flats={flats}
          onClose={() => { setShowForm(false); setEditUser(null); }}
          onSaved={loadData}
        />
      )}
    </div>
  );
}

function UserForm({ user, flats, onClose, onSaved }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    phone: user?.phone || '',
    role: user?.role || 'viewer',
    flat_id: user?.flat_id || '',
    is_active: user?.is_active ?? 1,
  });
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        const payload = { ...form, flat_id: form.flat_id ? Number(form.flat_id) : null };
        if (!payload.password) delete payload.password;
        await api.put(`/auth/users/${user.id}`, payload);
      } else {
        if (!form.password) { alert('Password required for new user'); setSaving(false); return; }
        await api.post('/auth/register', { ...form, flat_id: form.flat_id ? Number(form.flat_id) : null });
      }
      onSaved();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="section-title">{isEdit ? 'Edit User' : 'Create User'}</h2>
          <button onClick={onClose} className="btn-ghost p-2"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label-text">Full Name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required className="input-field" />
          </div>
          <div>
            <label className="label-text">Email *</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required className="input-field" />
          </div>
          <div>
            <label className="label-text">{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="input-field pr-10" required={!isEdit} />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label-text">Phone</label>
            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="input-field" />
          </div>

          {/* Role as radio buttons */}
          <div>
            <label className="label-text">Role *</label>
            <div className="flex gap-3 mt-1">
              {[
                { value: 'admin', label: '\ud83d\udd11 Admin', desc: 'Full access, can edit everything' },
                { value: 'resident', label: '\ud83c\udfe0 Resident', desc: 'View + own flat data' },
                { value: 'viewer', label: '\ud83d\udc41 Viewer', desc: 'Read-only access' },
              ].map(r => (
                <label key={r.value} className={`flex-1 cursor-pointer rounded-xl border-2 p-3 transition-all ${form.role === r.value ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="role" value={r.value} checked={form.role === r.value} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="sr-only" />
                  <p className="text-sm font-semibold text-gray-800">{r.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{r.desc}</p>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text">Assigned Flat</label>
              <select value={form.flat_id} onChange={e => setForm(p => ({ ...p, flat_id: e.target.value }))} className="select-field">
                <option value="">None</option>
                {flats.map(f => <option key={f.id} value={f.id}>{f.flat_number} - {f.owner_name}</option>)}
              </select>
            </div>
            {isEdit && (
              <div>
                <label className="label-text">Status</label>
                <div className="flex gap-2 mt-1">
                  <label className={`flex-1 cursor-pointer rounded-lg border-2 p-2 text-center text-xs font-medium transition-all ${form.is_active ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200'}`}>
                    <input type="radio" name="status" checked={form.is_active === 1} onChange={() => setForm(p => ({ ...p, is_active: 1 }))} className="sr-only" /> Active
                  </label>
                  <label className={`flex-1 cursor-pointer rounded-lg border-2 p-2 text-center text-xs font-medium transition-all ${!form.is_active ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200'}`}>
                    <input type="radio" name="status" checked={form.is_active === 0} onChange={() => setForm(p => ({ ...p, is_active: 0 }))} className="sr-only" /> Disabled
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =============================== CHARGE MANAGEMENT (Inline Edit) =============================== */
function ChargeManagement() {
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAdd, setShowAdd] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/charges').then(r => setCharges(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const startEdit = (charge) => {
    setEditId(charge.id);
    setEditForm({
      service_name: charge.service_name,
      description: charge.description || '',
      monthly_total_cost: charge.monthly_total_cost,
      category: charge.category,
      is_active: charge.is_active,
    });
  };

  const cancelEdit = () => { setEditId(null); setEditForm({}); };

  const saveEdit = async (id) => {
    try {
      await api.put(`/charges/${id}`, { ...editForm, monthly_total_cost: Number(editForm.monthly_total_cost) });
      setEditId(null);
      load();
    } catch (err) { alert('Failed to save'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this service charge permanently?')) return;
    await api.delete(`/charges/${id}`);
    load();
  };

  const total = charges.filter(c => c.is_active).reduce((s, c) => s + c.monthly_total_cost, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="p-3 bg-brand-50 rounded-xl flex-1 mr-3">
          <p className="text-sm text-brand-700">
            <strong>Total Active Monthly: {formatINR(total)}</strong>
            <span className="text-brand-600 text-xs ml-2">({charges.filter(c=>c.is_active).length} active services)</span>
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm flex-shrink-0">
          <Plus className="w-4 h-4" /> Add Charge
        </button>
      </div>

      <p className="text-xs text-gray-400">Click the \u270f\ufe0f edit button on any row to modify service name, cost, category, or status inline.</p>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Description</th>
                <th>Category</th>
                <th>Monthly Cost (\u20b9)</th>
                <th>Status</th>
                <th className="w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {charges.map(c => editId === c.id ? (
                /* EDIT ROW */
                <tr key={c.id} className="bg-amber-50/50">
                  <td>
                    <input value={editForm.service_name} onChange={e => setEditForm(p => ({ ...p, service_name: e.target.value }))}
                      className="input-field text-xs py-1.5" />
                  </td>
                  <td>
                    <input value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                      className="input-field text-xs py-1.5" placeholder="Description..." />
                  </td>
                  <td>
                    <select value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}
                      className="select-field text-xs py-1.5">
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
                    </select>
                  </td>
                  <td>
                    <input type="number" value={editForm.monthly_total_cost} onChange={e => setEditForm(p => ({ ...p, monthly_total_cost: e.target.value }))}
                      className="input-field text-xs py-1.5 font-mono w-28" />
                  </td>
                  <td>
                    <select value={editForm.is_active} onChange={e => setEditForm(p => ({ ...p, is_active: Number(e.target.value) }))}
                      className="select-field text-xs py-1.5">
                      <option value={1}>Active</option>
                      <option value={0}>Inactive</option>
                    </select>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => saveEdit(c.id)} className="btn-ghost p-1.5 text-green-600 hover:bg-green-50" title="Save">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={cancelEdit} className="btn-ghost p-1.5 text-gray-400 hover:bg-gray-100" title="Cancel">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                /* DISPLAY ROW */
                <tr key={c.id} className={!c.is_active ? 'opacity-50' : ''}>
                  <td>
                    <p className="font-medium text-gray-800">{c.service_name}</p>
                  </td>
                  <td className="text-xs text-gray-500">{c.description || '-'}</td>
                  <td><span className="badge-blue uppercase text-[10px]">{c.category}</span></td>
                  <td className="font-mono font-semibold">{formatINR(c.monthly_total_cost)}</td>
                  <td>
                    <span className={c.is_active ? 'badge-green' : 'badge-red'}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(c)} className="btn-ghost p-1.5 text-blue-500 hover:bg-blue-50" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddChargeForm onClose={() => setShowAdd(false)} onSaved={load} />}
    </div>
  );
}

function AddChargeForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ service_name: '', description: '', monthly_total_cost: '', category: 'other' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/charges', { ...form, monthly_total_cost: Number(form.monthly_total_cost) });
      onSaved(); onClose();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="section-title">Add Service Charge</h2>
          <button onClick={onClose} className="btn-ghost p-2"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label-text">Service Name *</label>
            <input value={form.service_name} onChange={e => setForm(p => ({ ...p, service_name: e.target.value }))} required className="input-field" placeholder="e.g. Security Services" />
          </div>
          <div>
            <label className="label-text">Category</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="select-field">
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label-text">Monthly Total Cost (\u20b9) *</label>
            <input type="number" value={form.monthly_total_cost} onChange={e => setForm(p => ({ ...p, monthly_total_cost: e.target.value }))} required className="input-field" placeholder="100000" />
          </div>
          <div>
            <label className="label-text">Description</label>
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input-field" placeholder="Brief description..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Add Charge'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =============================== APP CONFIG =============================== */
function AppConfig() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings').then(r => setSettings(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try { await api.put('/settings', settings); alert('Settings saved'); }
    catch { alert('Failed to save'); }
    finally { setSaving(false); }
  };

  const updateSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="card p-5 space-y-4">
        <h3 className="section-title">Society Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="label-text">Society Name</label><input value={settings.society_name || ''} onChange={e => updateSetting('society_name', e.target.value)} className="input-field" /></div>
          <div><label className="label-text">Address</label><input value={settings.society_address || ''} onChange={e => updateSetting('society_address', e.target.value)} className="input-field" /></div>
        </div>
      </div>
      <div className="card p-5 space-y-4">
        <h3 className="section-title">Hybrid Method Weights</h3>
        <p className="text-xs text-gray-500">These weights define how the Hybrid method distributes charges. Must total 1.0 (i.e. 0.4 + 0.3 + 0.3).</p>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="label-text">Equal Share</label><input type="number" step="0.01" value={settings.hybrid_equal_share || '0.4'} onChange={e => updateSetting('hybrid_equal_share', e.target.value)} className="input-field" /></div>
          <div><label className="label-text">Sq Ft Share</label><input type="number" step="0.01" value={settings.hybrid_sqft_share || '0.3'} onChange={e => updateSetting('hybrid_sqft_share', e.target.value)} className="input-field" /></div>
          <div><label className="label-text">UDS Share</label><input type="number" step="0.01" value={settings.hybrid_uds_share || '0.3'} onChange={e => updateSetting('hybrid_uds_share', e.target.value)} className="input-field" /></div>
        </div>
      </div>
      <div className="card p-5 space-y-4">
        <h3 className="section-title">Billing Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="label-text">Default Method</label>
            <select value={settings.active_calculation_method || 'hybrid'} onChange={e => updateSetting('active_calculation_method', e.target.value)} className="select-field">
              <option value="hybrid">Hybrid</option><option value="sqft">Sq Ft</option><option value="uds">UDS</option>
            </select></div>
          <div><label className="label-text">Bill Due Day</label><input type="number" value={settings.due_day || '15'} onChange={e => updateSetting('due_day', e.target.value)} className="input-field" /></div>
          <div><label className="label-text">Apply GST</label>
            <select value={settings.apply_gst || 'false'} onChange={e => updateSetting('apply_gst', e.target.value)} className="select-field">
              <option value="false">No</option><option value="true">Yes ({settings.gst_percentage || 18}%)</option>
            </select></div>
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
