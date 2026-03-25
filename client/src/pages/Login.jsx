import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ArrowRight, TreePalm } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - PWPS branding with green theme */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #14532d 0%, #166534 40%, #15803d 70%, #14532d 100%)' }}>
        {/* Leaf pattern overlay */}
        <div className="absolute inset-0 opacity-[0.07]">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="leaves" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="30" cy="30" r="20" fill="none" stroke="white" strokeWidth="0.5" />
                <path d="M 30 10 Q 40 20 30 30 Q 20 20 30 10" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#leaves)" />
          </svg>
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          {/* Logo area */}
          <div className="mb-8">
            <p className="text-green-300 text-sm font-medium tracking-wider uppercase">Pariwar Wise</p>
            <h1 className="text-5xl font-display font-bold text-amber-400 mt-1" style={{ fontStyle: 'italic' }}>
              Palm Springs
            </h1>
            <p className="text-green-200/70 text-sm italic mt-2">Inspired by mother nature</p>
          </div>

          <div className="w-16 h-[2px] bg-amber-400/50 mb-8" />

          <p className="text-green-100 text-lg max-w-md leading-relaxed">
            Transparent maintenance calculation with three methods — Sq Ft, UDS, and Hybrid — for 328 units across 9 blocks.
          </p>

          <div className="mt-12 flex gap-4">
            <div className="bg-white/10 backdrop-blur rounded-xl px-5 py-3 border border-white/10">
              <p className="text-green-200/60 text-xs">Units</p>
              <p className="text-white text-2xl font-display font-bold">328</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl px-5 py-3 border border-white/10">
              <p className="text-green-200/60 text-xs">Blocks</p>
              <p className="text-white text-2xl font-display font-bold">9</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl px-5 py-3 border border-white/10">
              <p className="text-green-200/60 text-xs">Methods</p>
              <p className="text-white text-2xl font-display font-bold">3</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl px-5 py-3 border border-white/10">
              <p className="text-green-200/60 text-xs">BHK</p>
              <p className="text-white text-2xl font-display font-bold">2 / 3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right - login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-brand-700 flex items-center justify-center">
              <TreePalm className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h1 className="font-display font-bold text-brand-900">PWPS Maintenance</h1>
              <p className="text-xs text-gray-400">Pariwar Wise Palm Springs</p>
            </div>
          </div>

          <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">Welcome back</h2>
          <p className="text-gray-500 mb-8">Sign in to access your maintenance dashboard</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label-text">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-field" placeholder="Enter your email" required />
            </div>
            <div>
              <label className="label-text">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
