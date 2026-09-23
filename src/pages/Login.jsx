import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Building2, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const { getThemeColor } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const themeColor = getThemeColor() || '#f97316';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/command', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Ambient background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-amber-500/10 via-orange-600/10 to-indigo-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-600/5 blur-[100px] rounded-full pointer-events-none" />
      
      {/* Subtle Background Mesh Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
      />

      {/* Main Login Card Container */}
      <div className="relative z-10 w-full max-w-md px-4 sm:px-0">
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/80 ring-1 ring-white/5 transition-all">
          
          {/* Header & Branding */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-4 group">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 ring-1 ring-white/20 transition-transform duration-300 group-hover:scale-105"
                style={{ backgroundColor: themeColor }}
              >
                <Building2 className="w-7 h-7 text-white stroke-[2]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-amber-400" />
              </div>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white">
              Neoteric Connect
            </h1>
            
            <div className="mt-1.5 flex items-center gap-2">
              <span className="h-px w-6 bg-slate-800" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400/90">
                Owner Portfolio System
              </span>
              <span className="h-px w-6 bg-slate-800" />
            </div>

            <p className="text-xs text-slate-400 mt-2">
              Sign in to manage client portfolios & financial operations
            </p>
          </div>

          {/* Form Section */}
          <form onSubmit={submit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@neotericgrp.in"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/60 text-slate-100 placeholder-slate-500 text-sm border ${
                    error ? 'border-red-500/80 focus:ring-red-500' : 'border-slate-800 focus:border-amber-500/80 focus:ring-amber-500/20'
                  } focus:outline-none focus:ring-2 transition-all duration-200`}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="login-password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-11 py-3 rounded-xl bg-slate-950/60 text-slate-100 placeholder-slate-500 text-sm border ${
                    error ? 'border-red-500/80 focus:ring-red-500' : 'border-slate-800 focus:border-amber-500/80 focus:ring-amber-500/20'
                  } focus:outline-none focus:ring-2 transition-all duration-200`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded-xl p-3 animate-fadeIn">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full relative group overflow-hidden rounded-xl font-semibold text-sm text-slate-950 transition-all duration-200 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none"
              style={{ backgroundColor: themeColor }}
            >
              <div className="flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:brightness-110 text-slate-950 font-bold transition-all">
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Authenticating…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </div>
            </button>
          </form>

          {/* Footer Security Badge */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>256-Bit SSL Encrypted Enterprise Portal</span>
          </div>
        </div>

        {/* Bottom Copyright Notice */}
        <div className="text-center mt-6 text-xs text-slate-400">
          © {new Date().getFullYear()} Neoteric Group. All rights reserved.
        </div>
      </div>
    </div>
  );
}

