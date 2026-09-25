import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Building2, Sun, Moon, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isDark = theme === 'dark';

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
    <div className={`relative min-h-screen w-full flex flex-col justify-between font-sans overflow-hidden select-none transition-colors duration-300 ${
      isDark ? 'bg-[#0b0f19] text-gray-100' : 'bg-[#d7d8dc] text-gray-900'
    }`}>
      {/* Dynamic Theme Switcher Button */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`fixed top-5 right-5 z-30 w-11 h-11 flex items-center justify-center rounded-full backdrop-blur-md shadow-xl transition-all active:scale-95 border ${
          isDark 
            ? 'bg-gray-800/80 text-amber-400 border-amber-500/30 hover:bg-gray-700/80 hover:border-amber-400' 
            : 'bg-white/40 text-gray-900 border-white/40 hover:bg-white/60 hover:border-white'
        }`}
      >
        {isDark ? <Sun className="w-5 h-5 text-amber-300 animate-spin-slow" /> : <Moon className="w-5 h-5 text-gray-900" />}
      </button>

      {/* Canvas Background with Organic Dynamic Wave Split */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <svg
          className="w-full h-full object-cover transition-all duration-500"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Base bottom color */}
          <rect width="1440" height="900" fill={isDark ? "#0b0f19" : "#d7d8dc"} />
          
          {/* Top vibrant burnt-orange / dark orange wave area */}
          <path
            fill={isDark ? "#9a3412" : "#c8471a"}
            className="transition-colors duration-500"
            d="M 0,0 
               L 1440,0 
               L 1440,240 
               C 1340,320 1260,300 1140,430 
               C 1020,560 720,490 520,480 
               C 320,470 120,640 0,660 
               Z"
          />
        </svg>
      </div>

      {/* Main Content Layout */}
      <div className="relative z-10 min-h-screen w-full flex flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-7xl mx-auto">
        {/* Header / Brand Logo */}
        <div className="flex items-center gap-3 animate-fade-in-down">
          <div className={`w-10 h-10 rounded-xl backdrop-blur-md flex items-center justify-center ring-1 shadow-sm ${
            isDark ? 'bg-amber-500/20 ring-amber-500/30' : 'bg-white/20 ring-white/30'
          }`}>
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white drop-shadow-sm">Neoteric Connect</span>
        </div>

        {/* Hero & Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto py-8">
          
          {/* Left Column - Large Creative Headline */}
          <div className="lg:col-span-6 xl:col-span-7 pr-0 lg:pr-8 space-y-4">
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold text-white leading-[1.12] tracking-tight drop-shadow-md max-w-xl">
              Looking to collaborate? <br />
              <span className="text-white/95 font-semibold text-3xl sm:text-4xl xl:text-5xl block mt-2">
                Get in touch to find out how we can help.
              </span>
            </h1>
            <p className="text-white/80 text-base sm:text-lg max-w-md font-normal leading-relaxed pt-2">
              Every owner relationship in one portfolio system. Track trigger dates, contacts, statements, and referrals seamlessly.
            </p>
          </div>

          {/* Right Column - Form Area & Dark Card */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-start lg:items-end">
            <div className="w-full max-w-md">
              
              {/* Header text right above card */}
              <div className="mb-6 text-left space-y-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight drop-shadow-sm">
                  Get Started
                </h2>
                <p className="text-white/85 text-sm sm:text-base font-medium leading-normal max-w-sm">
                  We're here to help. Enter your credentials to access your portfolio system.
                </p>
              </div>

              {/* Form Container (Charcoal in Light, Deep Slate/Black with subtle glow in Dark) */}
              <div className={`w-full rounded-3xl p-7 sm:p-9 shadow-2xl transition-colors duration-300 backdrop-blur-xl border ${
                isDark 
                  ? 'bg-[#111827] text-white border-amber-500/20 shadow-black/80' 
                  : 'bg-[#1e222b] text-white border-white/10 shadow-black/40'
              }`}>
                
                <form onSubmit={submit} className="space-y-5">
                  {/* Email Field */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-300 ml-3">Email Address</label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter a valid email address"
                        className={`w-full px-5 py-3.5 rounded-full text-sm font-medium border transition-all duration-200 shadow-inner focus:outline-none focus:ring-4 ${
                          isDark
                            ? 'bg-[#1f293b] text-white placeholder-gray-400 border-gray-700 focus:border-amber-500 focus:bg-gray-900 focus:ring-amber-500/20'
                            : 'bg-[#c8cbce] text-gray-900 placeholder-gray-600 border-transparent focus:border-orange-500 focus:bg-white focus:ring-orange-500/20'
                        }`}
                      />
                      <Mail className={`w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${
                        isDark ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-300 ml-3">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className={`w-full pl-5 pr-12 py-3.5 rounded-full text-sm font-medium border transition-all duration-200 shadow-inner focus:outline-none focus:ring-4 ${
                          isDark
                            ? 'bg-[#1f293b] text-white placeholder-gray-400 border-gray-700 focus:border-amber-500 focus:bg-gray-900 focus:ring-amber-500/20'
                            : 'bg-[#c8cbce] text-gray-900 placeholder-gray-600 border-transparent focus:border-orange-500 focus:bg-white focus:ring-orange-500/20'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors p-1 ${
                          isDark ? 'text-gray-400 hover:text-amber-400' : 'text-gray-600 hover:text-gray-900'
                        }`}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Error Notification */}
                  {error && (
                    <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-shake">
                      <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className={`w-full py-4 rounded-full font-bold text-sm tracking-wider uppercase text-white transition-all duration-200 shadow-lg flex items-center justify-center gap-2 group disabled:opacity-60 ${
                        isDark
                          ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/50'
                          : 'bg-[#c8471a] hover:bg-[#b33d14] shadow-orange-950/40'
                      }`}
                    >
                      {submitting ? (
                        <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>SUBMIT</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

              </div>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className={`text-xs font-medium text-center sm:text-left flex items-center justify-between pt-4 border-t transition-colors duration-300 ${
          isDark ? 'text-gray-400 border-gray-800' : 'text-gray-600 border-gray-400/30'
        }`}>
          <span>&copy; {new Date().getFullYear()} Neoteric Connect. All rights reserved.</span>
          <span className="hidden sm:inline">Enterprise Owner Portfolio Portal</span>
        </div>
      </div>
    </div>
  );
}


