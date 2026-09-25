import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Building2, ArrowRight, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const { theme, toggleTheme, getThemeColor } = useTheme();
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
    <div className="relative min-h-screen w-full flex bg-white dark:bg-gray-950 font-sans">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="fixed top-5 right-5 z-20 w-9 h-9 flex items-center justify-center rounded-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 shadow-sm transition-all active:scale-95"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Left — brand panel over a real photo. Placeholder image (Picsum,
         a stable seeded-photo service built for exactly this — dropping
         in a real image during development without needing an asset
         yet) — swap PANEL_IMAGE for an actual property photo (e.g.
         uploaded the same way Documents already uses Cloudinary) any
         time; nothing else here depends on where the image comes from.
         Hidden below lg: the form is what matters on a phone-width
         screen, not the artwork beside it. */}
      <div className="hidden lg:flex relative w-1/2 flex-col justify-between overflow-hidden p-10 xl:p-14 text-white">
        <img
          src="https://picsum.photos/seed/neoteric-connect-login/1200/1600"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* dark wash for text legibility over an arbitrary photo, plus a
           touch of the theme colour so it still reads as this app's own
           login rather than a generic stock-photo splash screen */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />
        <div className="absolute inset-0 mix-blend-multiply opacity-40" style={{ backgroundColor: themeColor }} />

        {/* ambient drifting glow — a bit of extra depth over the photo */}
        <div className="absolute -top-16 -left-10 w-72 h-72 rounded-full blur-[90px] pointer-events-none animate-float-slow" style={{ backgroundColor: `${themeColor}44` }} />

        <div className="relative flex items-center gap-2.5 animate-fade-in-up">
          <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center ring-1 ring-white/25">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">Neoteric Connect</span>
        </div>

        <div className="relative">
          <h2 className="text-3xl xl:text-4xl font-bold tracking-tight leading-tight max-w-md animate-fade-in-up [animation-delay:120ms]">
            Every owner relationship, in one portfolio system.
          </h2>
          <p className="text-sm text-white/70 mt-4 max-w-sm leading-relaxed animate-fade-in-up [animation-delay:240ms]">
            Trigger dates, contact gates, statements and referrals — the one place the whole team works
            from, instead of a dozen spreadsheets that all say something different.
          </p>
        </div>
      </div>

      {/* Right — the actual form, lifted off the page on a soft card
         instead of floating directly on flat white */}
      <div
        className="relative flex-1 flex items-center justify-center px-6 py-12 sm:px-10 bg-gray-50/60 dark:bg-gray-950"
        style={{ backgroundImage: `radial-gradient(${theme === 'dark' ? '#ffffff0d' : '#00000009'} 1px, transparent 1px)`, backgroundSize: '26px 26px' }}
      >
        <div
          className="absolute w-80 h-80 rounded-full blur-[110px] opacity-[0.15] pointer-events-none animate-float-slow"
          style={{ backgroundColor: themeColor, top: '10%', right: '10%' }}
        />

        <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-gray-900/[0.06] dark:shadow-black/40 border border-gray-100 dark:border-gray-800 p-8 sm:p-9 animate-fade-in-up">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeColor }}>
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Neoteric Connect</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Welcome back</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 mb-8">Sign in to your Owner Portfolio System account.</p>

          <form onSubmit={submit} className="space-y-4">
            <div className="animate-fade-in-up [animation-delay:160ms]">
              <label htmlFor="login-email" className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@neotericgrp.in"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm border ${
                    error ? 'border-red-400 focus:ring-red-200 dark:focus:ring-red-900/40' : 'border-gray-300 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500 focus:ring-gray-200 dark:focus:ring-gray-700/60'
                  } focus:outline-none focus:ring-4 focus:-translate-y-px transition-all duration-200`}
                  required
                />
              </div>
            </div>

            <div className="animate-fade-in-up [animation-delay:240ms]">
              <label htmlFor="login-password" className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-11 py-2.5 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm border ${
                    error ? 'border-red-400 focus:ring-red-200 dark:focus:ring-red-900/40' : 'border-gray-300 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500 focus:ring-gray-200 dark:focus:ring-gray-700/60'
                  } focus:outline-none focus:ring-4 focus:-translate-y-px transition-all duration-200`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg p-3 animate-fade-in-down">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="group w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-white hover:shadow-lg hover:shadow-gray-900/20 dark:hover:shadow-black/40 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none animate-fade-in-up [animation-delay:320ms]"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 dark:border-gray-900/30 border-t-white dark:border-t-gray-900 rounded-full animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Login</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* No "Register" / social sign-in below — this app has neither a
             public sign-up flow (accounts are created from User Management
             by an admin) nor Google/Facebook OAuth wired up, so a button
             for either would just be decorative and not actually work. */}
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-2 text-[11px] text-gray-400 dark:text-gray-500 animate-fade-in-up [animation-delay:400ms]">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>256-bit SSL encrypted enterprise portal</span>
          </div>
        </div>
      </div>
    </div>
  );
}
