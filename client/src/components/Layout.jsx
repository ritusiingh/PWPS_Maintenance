import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Building2, Calculator,
  Settings, LogOut, Menu, ChevronRight, User, TreePalm
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/units', icon: Building2, label: 'Units' },
  { to: '/maintenance', icon: Calculator, label: 'Maintenance' },
  { to: '/settings', icon: Settings, label: 'Settings', adminOnly: true },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const handleLogout = () => { logout(); navigate('/login'); };
  const filteredNav = navItems.filter(n => !n.adminOnly || isAdmin);

  return (
    <div className="min-h-screen flex bg-gray-50">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen w-[260px] bg-white border-r border-gray-100
        flex flex-col transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo - PWPS Green branding */}
        <div className="p-5 border-b border-gray-100 bg-brand-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg">
              <TreePalm className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h1 className="font-display font-bold text-white text-sm leading-tight">PWPS Maintenance</h1>
              <p className="text-[11px] text-green-200/70 font-medium italic">Inspired by mother nature</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNav.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Icon className="w-[18px] h-[18px]" />
              <span>{label}</span>
              <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-[.active]:opacity-100" />
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center">
              <User className="w-4 h-4 text-brand-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
              <p className="text-[11px] text-gray-400 truncate">{user?.role === 'admin' ? 'Administrator' : 'Resident'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 lg:px-6 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden btn-ghost p-2">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1" />
            <span className="hidden sm:block text-xs font-medium text-brand-800 bg-brand-50 px-3 py-1.5 rounded-full border border-brand-200">
              PWPS {"·"} 328 Units
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
