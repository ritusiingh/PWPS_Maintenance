import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Search, Upload, Download, Edit2, Trash2, X, ChevronLeft, ChevronRight,
  Building2, FileSpreadsheet, AlertCircle, CheckCircle
} from 'lucide-react';

const BHK_TYPES = ['2BHK', '3BHK'];
const BLOCKS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

export default function Units() {
  const { isAdmin } = useAuth();
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editFlat, setEditFlat] = useState(null);
  const [search, setSearch] = useState('');
  const [filterBHK, setFilterBHK] = useState('');
  const [filterBlock, setFilterBlock] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 20;
  const [stats, setStats] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const fileRef = useRef(null);

  const loadFlats = () => {
    setLoading(true);
    api.get('/flats').then(r => setFlats(r.data)).catch(console.error).finally(() => setLoading(false));
    api.get('/flats/stats').then(r => setStats(r.data)).catch(() => {});
  };

  useEffect(() => { loadFlats(); }, []);

  // Derive stats from response - API returns {total, byBHK:[], byBlock:[], totalArea:{carpet,super,uds}}
  const derivedStats = useMemo(() => {
    if (!stats) return null;
    const bhk2 = stats.byBHK?.find(b => b.bhk_type === '2BHK');
    const bhk3 = stats.byBHK?.find(b => b.bhk_type === '3BHK');
    return {
      totalFlats: stats.total || 0,
      totalSBA: Math.round(stats.totalArea?.super || 0),
      bhk2Count: bhk2?.count || 0,
      bhk3Count: bhk3?.count || 0,
    };
  }, [stats]);

  const filtered = useMemo(() => {
    return flats.filter(f => {
      const matchSearch = !search || f.flat_number.toLowerCase().includes(search.toLowerCase()) || (f.block || '').toLowerCase().includes(search.toLowerCase());
      const matchBHK = !filterBHK || f.bhk_type === filterBHK;
      const matchBlock = !filterBlock || f.block === filterBlock;
      return matchSearch && matchBHK && matchBlock;
    });
  }, [flats, search, filterBHK, filterBlock]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleDelete = async (id) => {
    if (!confirm('Delete this flat? This will also remove associated bills.')) return;
    await api.delete(`/flats/${id}`);
    loadFlats();
  };

  const downloadTemplate = () => {
    const headers = 'flat_number,block,floor,bhk_type,carpet_area_sqft,super_buildup_sqft,uds_area_sqft,owner_name,owner_email,owner_phone';
    const example1 = 'A-101,A,1,2BHK,743,1100,491,Rajesh Kumar,rajesh@email.com,9876543210';
    const example2 = 'B-201,B,2,3BHK,1016,1520,678,Priya Sharma,priya@email.com,9876543211';
    const csv = [headers, '# Example rows below (delete these before uploading):', example1, example2].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'pwps_flat_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const exportFlats = () => {
    const headers = 'flat_number,block,floor,bhk_type,carpet_area_sqft,super_buildup_sqft,uds_area_sqft';
    const rows = flats.map(f =>
      `${f.flat_number},${f.block || ''},${f.floor ?? ''},${f.bhk_type},${f.carpet_area_sqft},${f.super_buildup_sqft || ''},${f.uds_area_sqft}`
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'pwps_flats_export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadResult(null);
    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    if (lines.length < 2) { setUploadResult({ error: 'CSV must have a header row and at least one data row.' }); return; }
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const required = ['flat_number', 'bhk_type', 'carpet_area_sqft', 'uds_area_sqft', 'owner_name'];
    const missing = required.filter(r => !header.includes(r));
    if (missing.length > 0) { setUploadResult({ error: `Missing required columns: ${missing.join(', ')}` }); return; }
    const flatsToImport = [], errors = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim());
      if (vals.length < header.length) { errors.push(`Row ${i + 1}: not enough columns`); continue; }
      const row = {}; header.forEach((h, idx) => { row[h] = vals[idx]; });
      if (!row.flat_number || !row.bhk_type || !row.carpet_area_sqft || !row.uds_area_sqft || !row.owner_name) { errors.push(`Row ${i + 1}: missing required fields`); continue; }
      if (!BHK_TYPES.includes(row.bhk_type)) { errors.push(`Row ${i + 1}: invalid bhk_type "${row.bhk_type}" (use 2BHK/3BHK)`); continue; }
      flatsToImport.push({
        flat_number: row.flat_number, block: row.block || null, floor: row.floor ? Number(row.floor) : null,
        bhk_type: row.bhk_type, carpet_area_sqft: Number(row.carpet_area_sqft),
        super_buildup_sqft: row.super_buildup_sqft ? Number(row.super_buildup_sqft) : null,
        uds_area_sqft: Number(row.uds_area_sqft), owner_name: row.owner_name,
        owner_email: row.owner_email || null, owner_phone: row.owner_phone || null,
      });
    }
    if (flatsToImport.length === 0) { setUploadResult({ error: 'No valid rows. Errors: ' + errors.join('; ') }); return; }
    try {
      const { data } = await api.post('/flats/bulk', { flats: flatsToImport });
      setUploadResult({ success: true, message: `${data.inserted} of ${data.total} flats imported.`, errors: errors.length > 0 ? errors : null });
      loadFlats();
    } catch (err) { setUploadResult({ error: err.response?.data?.error || 'Upload failed' }); }
    if (fileRef.current) fileRef.current.value = '';
  };

  const FLOOR_LABELS = { 0: 'Ground', 1: '1st', 2: '2nd', 3: '3rd' };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Units Management</h1>
          <p className="text-sm text-gray-500">{flats.length} units registered across {BLOCKS.length} blocks</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={downloadTemplate} className="btn-secondary flex items-center gap-1.5 text-xs">
              <FileSpreadsheet className="w-3.5 h-3.5" /> CSV Template
            </button>
            <button onClick={exportFlats} className="btn-secondary flex items-center gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <label className="btn-secondary flex items-center gap-1.5 text-xs cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> Import CSV
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
            <button onClick={() => { setEditFlat(null); setShowForm(true); }} className="btn-primary flex items-center gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> Add Unit
            </button>
          </div>
        )}
      </div>

      {uploadResult && (
        <div className={`p-4 rounded-xl border ${uploadResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-start gap-2">
            {uploadResult.success ? <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />}
            <div>
              <p className={`text-sm font-medium ${uploadResult.success ? 'text-green-800' : 'text-red-800'}`}>{uploadResult.message || uploadResult.error}</p>
              {uploadResult.errors && <p className="text-xs text-amber-700 mt-1">Warnings: {uploadResult.errors.join('; ')}</p>}
            </div>
          </div>
          <button onClick={() => setUploadResult(null)} className="mt-2 text-xs text-gray-500 hover:text-gray-700">Dismiss</button>
        </div>
      )}

      {/* Stats cards - using derivedStats with correct field mapping */}
      {derivedStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="stat-card">
            <p className="text-xs text-gray-500">Total Units</p>
            <p className="text-xl font-display font-bold text-gray-900">{derivedStats.totalFlats}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-gray-500">Total SBA</p>
            <p className="text-xl font-display font-bold text-gray-900">{derivedStats.totalSBA.toLocaleString('en-IN')} Sft</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-gray-500">2 BHK</p>
            <p className="text-xl font-display font-bold text-gray-900">{derivedStats.bhk2Count}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-gray-500">3 BHK</p>
            <p className="text-xl font-display font-bold text-gray-900">{derivedStats.bhk3Count}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="input-field pl-9" placeholder="Search flat no, block..." />
        </div>
        <select value={filterBHK} onChange={e => { setFilterBHK(e.target.value); setPage(1); }} className="select-field w-auto">
          <option value="">All BHK</option>
          {BHK_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={filterBlock} onChange={e => { setFilterBlock(e.target.value); setPage(1); }} className="select-field w-auto">
          <option value="">All Blocks</option>
          {BLOCKS.map(b => <option key={b} value={b}>Block {b}</option>)}
        </select>
        <span className="text-xs text-gray-400">{filtered.length} results</span>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Flat</th>
              <th>Block</th>
              <th>Floor</th>
              <th>BHK</th>
              <th>SBA (Sft)</th>
              <th>Carpet (Sft)</th>
              <th>UDS (Sft)</th>
              {isAdmin && <th className="w-20">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginated.map(f => (
              <tr key={f.id}>
                <td className="font-mono font-medium text-gray-900">{f.flat_number}</td>
                <td>{f.block || '-'}</td>
                <td>{FLOOR_LABELS[f.floor] ?? f.floor ?? '-'}</td>
                <td><span className={f.bhk_type === '3BHK' ? 'badge-green' : 'badge-teal'}>{f.bhk_type}</span></td>
                <td className="font-mono">{f.super_buildup_sqft || '-'}</td>
                <td className="font-mono">{f.carpet_area_sqft}</td>
                <td className="font-mono">{f.uds_area_sqft}</td>
                {isAdmin && (
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditFlat(f); setShowForm(true); }} className="btn-ghost p-1.5" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(f.id)} className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={isAdmin ? 8 : 7} className="text-center py-10 text-gray-400">No units found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="btn-ghost p-2 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page + i - 2;
              if (p > totalPages || p < 1) return null;
              return <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>{p}</button>;
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} className="btn-ghost p-2 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {showForm && <FlatForm flat={editFlat} onClose={() => { setShowForm(false); setEditFlat(null); }} onSaved={loadFlats} />}
    </div>
  );
}

function FlatForm({ flat, onClose, onSaved }) {
  const [form, setForm] = useState({
    flat_number: flat?.flat_number || '', block: flat?.block || '', floor: flat?.floor ?? '',
    bhk_type: flat?.bhk_type || '2BHK', carpet_area_sqft: flat?.carpet_area_sqft || '',
    super_buildup_sqft: flat?.super_buildup_sqft || '', uds_area_sqft: flat?.uds_area_sqft || '',
    owner_name: flat?.owner_name || 'Resident', owner_email: flat?.owner_email || '', owner_phone: flat?.owner_phone || '',
    is_occupied: flat?.is_occupied ?? 1, tenant_name: flat?.tenant_name || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (flat) await api.put(`/flats/${flat.id}`, form);
      else await api.post('/flats', form);
      onSaved(); onClose();
    } catch (err) { setError(err.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-5 border-b border-gray-100 rounded-t-2xl">
          <h2 className="section-title">{flat ? 'Edit Unit' : 'Add New Unit'}</h2>
          <button onClick={onClose} className="btn-ghost p-2"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-text">Flat Number *</label><input name="flat_number" value={form.flat_number} onChange={handleChange} required className="input-field" placeholder="A-001" /></div>
            <div><label className="label-text">Block</label>
              <select name="block" value={form.block} onChange={handleChange} className="select-field">
                <option value="">Select</option>
                {['A','B','C','D','E','F','G','H','I'].map(b => <option key={b} value={b}>{b}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-text">Floor</label><input name="floor" type="number" value={form.floor} onChange={handleChange} className="input-field" /></div>
            <div><label className="label-text">BHK Type *</label>
              <select name="bhk_type" value={form.bhk_type} onChange={handleChange} className="select-field">
                {BHK_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
              </select></div>
          </div>
          <div className="p-4 bg-brand-50 rounded-xl border border-brand-200 space-y-3">
            <p className="text-xs font-semibold text-brand-800 uppercase tracking-wide">Area Details (Sft)</p>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="label-text">SBA *</label><input name="super_buildup_sqft" type="number" value={form.super_buildup_sqft} onChange={handleChange} className="input-field" /></div>
              <div><label className="label-text">Carpet *</label><input name="carpet_area_sqft" type="number" value={form.carpet_area_sqft} onChange={handleChange} required className="input-field" /></div>
              <div><label className="label-text">UDS *</label><input name="uds_area_sqft" type="number" value={form.uds_area_sqft} onChange={handleChange} required className="input-field" /></div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : flat ? 'Update' : 'Add Unit'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
