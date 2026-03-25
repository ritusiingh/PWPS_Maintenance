import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatINR, formatINRDecimal, MONTHS, CURRENT_MONTH, CURRENT_YEAR } from '../utils/helpers';
import {
  Calculator, TrendingUp, BarChart3, Search, Download, Send,
  Info, ChevronDown, ChevronUp, Zap, LayoutGrid, Scale, Edit2, Check, X, Trash2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Legend, ScatterChart, Scatter, ZAxis
} from 'recharts';

export default function MaintenanceCalc() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBHK, setFilterBHK] = useState('');
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [showChargeForm, setShowChargeForm] = useState(false);
  const [genMonth, setGenMonth] = useState(CURRENT_MONTH);
  const [genYear, setGenYear] = useState(CURRENT_YEAR);
  const [genMethod, setGenMethod] = useState('hybrid');
  const [generating, setGenerating] = useState(false);
  const [editingCharge, setEditingCharge] = useState(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/calculate'),
      api.get('/charges'),
    ]).then(([calc, chg]) => {
      setData(calc.data);
      setCharges(chg.data);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    if (!data?.results) return [];
    return data.results.filter(r => {
      const matchSearch = !search || r.flat_number.toLowerCase().includes(search.toLowerCase()) || (r.block || '').toLowerCase().includes(search.toLowerCase());
      const matchBHK = !filterBHK || r.bhk_type === filterBHK;
      return matchSearch && matchBHK;
    });
  }, [data, search, filterBHK]);

  const handleGenerateBills = async () => {
    if (!confirm(`Generate bills for ${genMonth} ${genYear} using ${genMethod.toUpperCase()} method?`)) return;
    setGenerating(true);
    try {
      const { data: res } = await api.post('/calculate/generate-bills', { month: genMonth, year: genYear, method: genMethod });
      alert(res.message);
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setGenerating(false); }
  };

  const handleSendReminders = async () => {
    if (!confirm(`Send email reminders for ${genMonth} ${genYear}?`)) return;
    try {
      const { data: res } = await api.post('/bills/send-reminders', { month: genMonth, year: genYear });
      alert(res.message);
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleDeleteCharge = async (id) => {
    if (!confirm('Delete this service charge?')) return;
    try {
      await api.delete(`/charges/${id}`);
      loadData();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleSaveCharge = async (charge) => {
    try {
      await api.put(`/charges/${charge.id}`, charge);
      setEditingCharge(null);
      loadData();
    } catch (err) { alert(err.response?.data?.error || 'Failed to update'); }
  };

  const summary = data?.summary;

  const scatterData = useMemo(() => {
    if (!data?.results) return [];
    return data.results.map(r => ({
      name: r.flat_number, area: r.super_buildup, sqft: r.sqft.total,
      uds: r.uds.total, hybrid: r.hybrid.total, bhk: r.bhk_type,
    }));
  }, [data]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Calculator className="w-6 h-6 text-brand-600" />
            Maintenance Calculator
          </h1>
          <p className="text-sm text-gray-500 mt-1">Compare three calculation methods side by side</p>
        </div>
      </div>

      {/* Method Explanation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MethodCard icon={LayoutGrid} title="Sq Ft Based" color="ocean"
          desc="Charges distributed proportionally based on each flat's super built-up area."
          formula="Flat's Sq Ft ÷ Total Sq Ft × Service Cost"
          avg={summary?.methods?.sqft?.avg} min={summary?.methods?.sqft?.min} max={summary?.methods?.sqft?.max} />
        <MethodCard icon={Scale} title="UDS Based" color="amber"
          desc="Charges distributed based on Undivided Share of land allotted to each flat."
          formula="Flat's UDS ÷ Total UDS × Service Cost"
          avg={summary?.methods?.uds?.avg} min={summary?.methods?.uds?.min} max={summary?.methods?.uds?.max} />
        <MethodCard icon={Zap} title="Hybrid" color="brand"
          desc="Balanced mix: 40% equal share + 30% by Sq Ft + 30% by UDS for fairness."
          formula="40% Equal + 30% Sq Ft + 30% UDS"
          avg={summary?.methods?.hybrid?.avg} min={summary?.methods?.hybrid?.min} max={summary?.methods?.hybrid?.max} recommended />
      </div>

      {/* Service Charges Section - EDITABLE */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">Service & Amenity Charges</h3>
          {isAdmin && (
            <button onClick={() => setShowChargeForm(true)} className="btn-primary text-sm">+ Add Charge</button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {charges.filter(c => c.is_active).map(c => (
            editingCharge === c.id ? (
              <InlineChargeEdit key={c.id} charge={c} onSave={handleSaveCharge} onCancel={() => setEditingCharge(null)} />
            ) : (
              <div key={c.id} className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 border border-gray-100 group relative">
                {isAdmin && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingCharge(c.id)} className="p-1 rounded-md bg-white shadow-sm border border-gray-200 hover:bg-blue-50 hover:border-blue-300" title="Edit charge">
                      <Edit2 className="w-3 h-3 text-blue-600" />
                    </button>
                    <button onClick={() => handleDeleteCharge(c.id)} className="p-1 rounded-md bg-white shadow-sm border border-gray-200 hover:bg-red-50 hover:border-red-300" title="Delete charge">
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                )}
                <div className="flex items-start justify-between pr-14">
                  <p className="text-xs font-medium text-gray-600 leading-tight">{c.service_name}</p>
                </div>
                <span className="inline-block mt-1 text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded-full uppercase font-medium">{c.category}</span>
                <p className="text-base font-display font-bold text-gray-900 mt-2">{formatINR(c.monthly_total_cost)}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">/month total</p>
              </div>
            )
          ))}
        </div>
        {summary && (
          <div className="mt-4 p-3 bg-brand-50 rounded-xl flex items-center gap-2">
            <Info className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <p className="text-sm text-brand-700">
              <strong>Total Monthly Charges: {formatINR(summary.totalMonthlyCharges)}</strong>
              <span className="text-brand-600"> · Distributed across {summary.totalFlats} units · {(summary.totalSqft || 0).toLocaleString('en-IN')} total sq.ft · {(summary.totalUDS || 0).toLocaleString('en-IN')} total UDS</span>
            </p>
          </div>
        )}
      </div>

      {/* Distribution Scatter Chart */}
      {scatterData.length > 0 && (
        <div className="card p-5">
          <h3 className="section-title mb-4">Maintenance vs Flat Area Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="area" name="Super Built-up (sq.ft)" tick={{ fontSize: 11, fill: '#94a3b8' }} label={{ value: 'Super Built-up Area (sq.ft)', position: 'bottom', offset: -5, fontSize: 11, fill: '#94a3b8' }} />
              <YAxis dataKey="hybrid" name="Hybrid Amount" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <ZAxis range={[30, 60]} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                formatter={(v, name) => [name === 'area' ? `${v} sq.ft` : formatINR(v), name]}
                labelFormatter={(v) => `${v} sq.ft`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Scatter name="Sq Ft Method" data={scatterData} fill="#379cf9" dataKey="sqft" />
              <Scatter name="Hybrid Method" data={scatterData} fill="#06c4ae" dataKey="hybrid" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Generate Bills Section */}
      {isAdmin && (
        <div className="card p-5 border-l-4 border-l-brand-500">
          <h3 className="section-title mb-3">Generate Monthly Bills</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="label-text">Month</label>
              <select value={genMonth} onChange={e => setGenMonth(e.target.value)} className="select-field w-36">
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label-text">Year</label>
              <select value={genYear} onChange={e => setGenYear(Number(e.target.value))} className="select-field w-24">
                {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="label-text">Method</label>
              <select value={genMethod} onChange={e => setGenMethod(e.target.value)} className="select-field w-28">
                <option value="hybrid">Hybrid</option>
                <option value="sqft">Sq Ft</option>
                <option value="uds">UDS</option>
              </select>
            </div>
            <button onClick={handleGenerateBills} disabled={generating} className="btn-primary flex items-center gap-2">
              <Download className="w-4 h-4" />
              {generating ? 'Generating...' : 'Generate Bills'}
            </button>
            <button onClick={handleSendReminders} className="btn-secondary flex items-center gap-2">
              <Send className="w-4 h-4" /> Email Reminders
            </button>
          </div>
        </div>
      )}

      {/* Flat-wise Comparison Table - NO Owner column */}
      <div className="card">
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="section-title">Flat-wise Comparison</h3>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 w-48" placeholder="Search flat..." />
              </div>
              <select value={filterBHK} onChange={e => setFilterBHK(e.target.value)} className="select-field w-auto">
                <option value="">All BHK</option>
                <option value="2BHK">2BHK</option>
                <option value="3BHK">3BHK</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Flat</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">BHK</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Block</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">SBA (Sft)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">UDS</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-ocean-600 uppercase">Sq Ft ₹</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-amber-600 uppercase">UDS ₹</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-brand-600 uppercase">Hybrid ₹</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map(r => (
                <React.Fragment key={r.flat_id}>
                  <tr className="border-b border-gray-50 hover:bg-brand-50/20 cursor-pointer" onClick={() => setSelectedFlat(selectedFlat === r.flat_id ? null : r.flat_id)}>
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">{r.flat_number}</td>
                    <td className="px-4 py-3"><span className="badge-teal">{r.bhk_type}</span></td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{r.block || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-600 hidden sm:table-cell">{r.super_buildup}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-600 hidden sm:table-cell">{r.uds_area}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-ocean-700">{formatINR(r.sqft.total)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-amber-700">{formatINR(r.uds.total)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-brand-700">{formatINR(r.hybrid.total)}</td>
                    <td className="px-4 py-3 text-center">
                      {selectedFlat === r.flat_id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </td>
                  </tr>
                  {selectedFlat === r.flat_id && <FlatDetail data={r} />}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 50 && (
          <div className="p-4 text-center text-sm text-gray-500 border-t border-gray-100">
            Showing 50 of {filtered.length} results. Use search to filter.
          </div>
        )}
      </div>

      {showChargeForm && <ChargeForm onClose={() => setShowChargeForm(false)} onSaved={loadData} />}
    </div>
  );
}

/* Inline edit component for a single charge card */
function InlineChargeEdit({ charge, onSave, onCancel }) {
  const [form, setForm] = useState({
    id: charge.id,
    service_name: charge.service_name,
    description: charge.description || '',
    monthly_total_cost: charge.monthly_total_cost,
    category: charge.category,
    is_active: charge.is_active,
  });
  const categories = ['security', 'housekeeping', 'electricity', 'lift', 'garden', 'water', 'amenity', 'other'];

  return (
    <div className="rounded-xl p-3 border-2 border-blue-300 bg-blue-50/30 space-y-2">
      <input value={form.service_name} onChange={e => setForm(p => ({ ...p, service_name: e.target.value }))}
        className="w-full text-xs font-medium px-2 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-400" placeholder="Service name" />
      <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
        className="w-full text-[11px] px-2 py-1 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-400">
        {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
      </select>
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500">₹</span>
        <input type="number" value={form.monthly_total_cost} onChange={e => setForm(p => ({ ...p, monthly_total_cost: Number(e.target.value) }))}
          className="flex-1 text-sm font-bold px-2 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-400" />
      </div>
      <div className="flex gap-1.5 pt-1">
        <button onClick={() => onSave(form)} className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors">
          <Check className="w-3 h-3" /> Save
        </button>
        <button onClick={onCancel} className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors">
          <X className="w-3 h-3" /> Cancel
        </button>
      </div>
    </div>
  );
}

function MethodCard({ icon: Icon, title, color, desc, formula, avg, min, max, recommended }) {
  const colorMap = {
    ocean: { bg: 'bg-ocean-50', text: 'text-ocean-700', icon: 'text-ocean-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-500' },
    brand: { bg: 'bg-brand-50', text: 'text-brand-700', icon: 'text-brand-500' },
  };
  const c = colorMap[color];
  return (
    <div className={`method-card method-${color === 'ocean' ? 'sqft' : color === 'amber' ? 'uds' : 'hybrid'} ${recommended ? 'ring-2 ring-brand-300 ring-offset-2' : ''}`}>
      {recommended && <span className="absolute top-3 right-3 badge-green text-[10px]">Recommended</span>}
      <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${c.icon}`} />
      </div>
      <h4 className="font-display font-bold text-gray-900">{title}</h4>
      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>
      <div className="mt-3 p-2 bg-gray-50 rounded-lg">
        <code className="text-[11px] text-gray-600 font-mono">{formula}</code>
      </div>
      {avg != null && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div><p className="text-[10px] text-gray-400 uppercase">Min</p><p className="text-xs font-bold text-gray-700">{formatINR(min)}</p></div>
          <div><p className="text-[10px] text-gray-400 uppercase">Avg</p><p className={`text-xs font-bold ${c.text}`}>{formatINR(avg)}</p></div>
          <div><p className="text-[10px] text-gray-400 uppercase">Max</p><p className="text-xs font-bold text-gray-700">{formatINR(max)}</p></div>
        </div>
      )}
    </div>
  );
}

function FlatDetail({ data: r }) {
  const chartData = r.hybrid.breakdown.map(b => ({
    service: b.service.length > 15 ? b.service.substring(0, 15) + '...' : b.service,
    sqft: r.sqft.breakdown.find(s => s.service === b.service)?.share || 0,
    uds: r.uds.breakdown.find(s => s.service === b.service)?.share || 0,
    hybrid: b.share || 0,
  }));

  return (
    <tr>
      <td colSpan={9} className="px-4 py-5 bg-gray-50/50">
        <div className="animate-fade-in">
          <h4 className="font-display font-semibold text-gray-800 mb-3">
            Detailed Breakdown — {r.flat_number} ({r.bhk_type} · Block {r.block})
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-500">Service</th>
                    <th className="px-3 py-2 text-right text-ocean-600">Sq Ft ₹</th>
                    <th className="px-3 py-2 text-right text-amber-600">UDS ₹</th>
                    <th className="px-3 py-2 text-right text-brand-600">Hybrid ₹</th>
                  </tr>
                </thead>
                <tbody>
                  {r.hybrid.breakdown.map((b, i) => (
                    <tr key={i} className="border-t border-gray-50">
                      <td className="px-3 py-2 text-gray-700">{b.service}</td>
                      <td className="px-3 py-2 text-right font-mono text-ocean-700">{formatINRDecimal(r.sqft.breakdown[i]?.share)}</td>
                      <td className="px-3 py-2 text-right font-mono text-amber-700">{formatINRDecimal(r.uds.breakdown[i]?.share)}</td>
                      <td className="px-3 py-2 text-right font-mono text-brand-700">{formatINRDecimal(b.share)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-200 font-bold">
                    <td className="px-3 py-2">TOTAL</td>
                    <td className="px-3 py-2 text-right font-mono text-ocean-800">{formatINR(r.sqft.total)}</td>
                    <td className="px-3 py-2 text-right font-mono text-amber-800">{formatINR(r.uds.total)}</td>
                    <td className="px-3 py-2 text-right font-mono text-brand-800">{formatINR(r.hybrid.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `₹${v.toFixed(0)}`} />
                  <YAxis type="category" dataKey="service" tick={{ fontSize: 9, fill: '#64748b' }} width={80} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} formatter={v => formatINRDecimal(v)} />
                  <Bar dataKey="sqft" fill="#379cf9" name="Sq Ft" barSize={5} radius={[0,3,3,0]} />
                  <Bar dataKey="uds" fill="#f59e0b" name="UDS" barSize={5} radius={[0,3,3,0]} />
                  <Bar dataKey="hybrid" fill="#06c4ae" name="Hybrid" barSize={5} radius={[0,3,3,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-3 p-3 bg-brand-50/50 rounded-xl border border-brand-100">
            <p className="text-xs font-semibold text-brand-800 mb-1">Hybrid Method Breakdown for {r.flat_number}</p>
            <div className="flex flex-wrap gap-4 text-xs text-brand-700">
              <span>40% Equal Share: {formatINR(r.hybrid.breakdown.reduce((s, b) => s + (b.equalComponent || 0), 0))}</span>
              <span>30% Sq Ft Share: {formatINR(r.hybrid.breakdown.reduce((s, b) => s + (b.sqftComponent || 0), 0))}</span>
              <span>30% UDS Share: {formatINR(r.hybrid.breakdown.reduce((s, b) => s + (b.udsComponent || 0), 0))}</span>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

function ChargeForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ service_name: '', description: '', monthly_total_cost: '', category: 'other' });
  const [saving, setSaving] = useState(false);
  const categories = ['security', 'housekeeping', 'electricity', 'lift', 'garden', 'water', 'amenity', 'other'];

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
        <div className="p-5 border-b border-gray-100">
          <h2 className="section-title">Add Service Charge</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label-text">Service Name *</label>
            <input value={form.service_name} onChange={e => setForm(p => ({ ...p, service_name: e.target.value }))} required className="input-field" placeholder="e.g. Security Services" />
          </div>
          <div>
            <label className="label-text">Category</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="select-field">
              {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label-text">Monthly Total Cost (₹) *</label>
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
