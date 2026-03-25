import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatINR } from '../utils/helpers';
import {
  Building2, Users, IndianRupee, TrendingUp, Layers, SquareStack
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid
} from 'recharts';

const COLORS = ['#06c4ae', '#379cf9', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#84cc16', '#f97316'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [calcData, setCalcData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/summary'),
      api.get('/calculate'),
    ]).then(([s, c]) => {
      setData(s.data);
      setCalcData(c.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-gray-500">Failed to load dashboard</p>;

  const summary = calcData?.summary;
  const totalMonthly = summary?.totalMonthlyCharges || 0;
  const totalSqft = summary?.totalSqft || 1;
  const perSqftRate = totalMonthly / totalSqft;

  // BHK comparison chart data
  const bhkChartData = summary?.byBHK
    ? Object.entries(summary.byBHK).map(([bhk, v]) => ({
        name: bhk,
        'Sq Ft': v.avgSqft,
        'UDS': v.avgUds,
        'Hybrid': v.avgHybrid,
      }))
    : [];

  // Method summary chart
  const methodData = summary?.methods
    ? [
        { name: 'Sq Ft', min: summary.methods.sqft.min, avg: summary.methods.sqft.avg, max: summary.methods.sqft.max },
        { name: 'UDS', min: summary.methods.uds.min, avg: summary.methods.uds.avg, max: summary.methods.uds.max },
        { name: 'Hybrid', min: summary.methods.hybrid.min, avg: summary.methods.hybrid.avg, max: summary.methods.hybrid.max },
      ]
    : [];

  // Cost distribution pie by service category
  const categoryTotals = {};
  if (summary?.charges) {
    summary.charges.forEach(c => {
      const cat = c.category || 'other';
      const label = cat.charAt(0).toUpperCase() + cat.slice(1);
      categoryTotals[label] = (categoryTotals[label] || 0) + c.monthly_total_cost;
    });
  }
  const costPieData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Block-wise flat count
  const blockCounts = {};
  if (calcData?.results) {
    calcData.results.forEach(r => {
      blockCounts[r.block] = (blockCounts[r.block] || 0) + 1;
    });
  }
  const uniqueBlocks = Object.keys(blockCounts).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Pariwar Wise Palm Springs — Overview for {data.currentMonth} {data.currentYear}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Total Units" value={data.totalFlats} color="brand" sub={`${uniqueBlocks} Blocks (A–I)`} />
        <StatCard icon={IndianRupee} label="Monthly Charges" value={formatINR(totalMonthly)} color="ocean" />
        <StatCard icon={SquareStack} label="Per Sq.Ft Rate" value={`₹${perSqftRate.toFixed(2)}`} color="emerald" sub="Sq Ft Method" />
        <StatCard icon={Layers} label="Total SBA" value={`${(totalSqft).toLocaleString('en-IN')} Sft`} color="amber" sub={`Avg ${Math.round(totalSqft / (data.totalFlats || 1))} Sft/flat`} />
      </div>

      {/* Rate Strip */}
      {summary?.methods && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <RateCard label="Sq Ft Method" avg={summary.methods.sqft.avg} min={summary.methods.sqft.min} max={summary.methods.sqft.max} color="bg-blue-50 border-blue-200" />
          <RateCard label="UDS Method" avg={summary.methods.uds.avg} min={summary.methods.uds.min} max={summary.methods.uds.max} color="bg-amber-50 border-amber-200" />
          <RateCard label="Hybrid (40/30/30)" avg={summary.methods.hybrid.avg} min={summary.methods.hybrid.min} max={summary.methods.hybrid.max} color="bg-emerald-50 border-emerald-200" />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BHK Comparison */}
        <div className="card p-5">
          <h3 className="section-title mb-4">Avg Maintenance by BHK Type</h3>
          {bhkChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={bhkChartData} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Sq Ft" fill="#379cf9" radius={[6, 6, 0, 0]} />
                <Bar dataKey="UDS" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Hybrid" fill="#06c4ae" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="Add flats and charges to see comparison" />
          )}
        </div>

        {/* Cost Distribution Pie */}
        <div className="card p-5">
          <h3 className="section-title mb-4">Cost Distribution by Category</h3>
          {costPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={costPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                >
                  {costPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  formatter={(v) => [formatINR(v), 'Monthly Cost']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="Configure charges to see distribution" />
          )}
        </div>
      </div>

      {/* Method Comparison */}
      <div className="card p-5">
        <h3 className="section-title mb-4">Method Comparison (Min / Avg / Max)</h3>
        {methodData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={methodData} layout="vertical" barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} width={70} />
              <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="min" fill="#bef264" name="Min" radius={[0, 4, 4, 0]} />
              <Bar dataKey="avg" fill="#06c4ae" name="Avg" radius={[0, 4, 4, 0]} />
              <Bar dataKey="max" fill="#f43f5e" name="Max" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState text="Configure charges to view" />
        )}
      </div>

      {/* Service Charges Breakdown */}
      {summary?.charges?.length > 0 && (
        <div className="card p-5">
          <h3 className="section-title mb-4">Service Charges Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {summary.charges.map((c) => {
              const pct = totalMonthly > 0 ? ((c.monthly_total_cost / totalMonthly) * 100).toFixed(1) : '0';
              return (
                <div key={c.id} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 truncate">{c.service_name}</p>
                  <p className="text-base font-display font-bold text-gray-800 mt-1">{formatINR(c.monthly_total_cost)}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[10px] text-gray-400 uppercase">{c.category}</p>
                    <p className="text-[10px] font-semibold text-brand-600">{pct}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, sub }) {
  const colorMap = {
    brand: 'bg-brand-50 text-brand-600',
    ocean: 'bg-ocean-50 text-ocean-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="stat-card">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs text-gray-500 mt-2">{label}</p>
      <p className="text-xl font-display font-bold text-gray-900">{value}</p>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}

function RateCard({ label, avg, min, max, color }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-xs font-medium text-gray-600 mb-2">{label}</p>
      <p className="text-2xl font-display font-bold text-gray-900">{formatINR(avg)}<span className="text-xs font-normal text-gray-500">/flat avg</span></p>
      <div className="flex gap-4 mt-1 text-[11px] text-gray-500">
        <span>Min: {formatINR(min)}</span>
        <span>Max: {formatINR(max)}</span>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
      {text}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-gray-200 rounded-2xl animate-pulse" />
        <div className="h-80 bg-gray-200 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}
