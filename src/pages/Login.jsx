import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Building2, Sun, Moon, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
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
    <div className={`relative min-h-screen w-full flex flex-col font-sans overflow-x-hidden overflow-y-auto select-none transition-colors duration-500 ${
      isDark ? 'bg-[#0b0f19] text-gray-100' : 'bg-[#d7d8dc] text-gray-900'
    }`}>
      {/* Ambient Floating Glow Orbs for depth */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[10%] left-[15%] w-72 h-72 rounded-full blur-[90px] animate-float-slow opacity-30 ${
          isDark ? 'bg-amber-500/25' : 'bg-orange-400/35'
        }`} />
        <div className={`absolute bottom-[20%] right-[10%] w-80 h-80 rounded-full blur-[110px] animate-float-reverse opacity-25 ${
          isDark ? 'bg-amber-600/30' : 'bg-orange-500/25'
        }`} />
      </div>

      {/* Dynamic Theme Switcher Button */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`fixed top-4 right-4 sm:top-6 sm:right-6 z-30 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full backdrop-blur-md shadow-2xl transition-all duration-300 active:scale-95 border ${
          isDark
            ? 'bg-gray-800/80 text-amber-400 border-amber-500/30 hover:bg-gray-700/90 hover:scale-105 hover:border-amber-400 shadow-amber-500/10'
            : 'bg-white/50 text-gray-900 border-white/60 hover:bg-white/80 hover:scale-105 hover:border-white shadow-black/10'
        }`}
      >
        {isDark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 animate-spin-slow" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-900" />}
      </button>

      {/* Canvas Background with Organic Dynamic Wave Split — `slice` (not
         `none`) so the wave crops to fill instead of stretching
         non-uniformly on a phone's tall/narrow aspect ratio, which this
         viewBox (drawn for a ~1440x900 desktop ratio) would otherwise
         warp badly on. */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <svg
          className="w-full h-full object-cover transition-all duration-700 ease-in-out"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Base bottom color */}
          <rect width="1440" height="900" fill={isDark ? "#0b0f19" : "#d7d8dc"} />
          
          {/* Top vibrant burnt-orange / dark orange wave area */}
          <path
            fill={isDark ? "#9a3412" : "#c8471a"}
            className="animate-wave-slide-down transition-colors duration-700 ease-in-out"
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
      <div className="relative z-10 w-full flex-1 flex flex-col p-3.5 sm:p-8 lg:p-14 2xl:p-20 max-w-[1850px] mx-auto">

        {/* Top Header / Brand Logo & Floating Badge */}
        <div className="flex-shrink-0 flex items-center justify-between gap-2.5 pr-12 sm:pr-0 animate-fade-in-down">
          <div className="flex items-center gap-2 sm:gap-3 2xl:gap-4 group cursor-default min-w-0">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 2xl:w-14 2xl:h-14 flex-shrink-0 rounded-lg sm:rounded-xl 2xl:rounded-2xl backdrop-blur-md flex items-center justify-center ring-1 shadow-md transition-transform duration-300 group-hover:scale-110 ${
              isDark ? 'bg-amber-500/20 ring-amber-500/30' : 'bg-white/25 ring-white/40'
            }`}>
              <Building2 className="w-4 h-4 sm:w-6 sm:h-6 2xl:w-8 2xl:h-8 text-white" />
            </div>
            <span className="text-sm sm:text-xl 2xl:text-3xl font-bold tracking-tight text-white drop-shadow-sm truncate">Neoteric Connect</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 2xl:px-5 2xl:py-2.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs 2xl:text-base font-semibold tracking-wide shadow-sm animate-float-slow">
            <Sparkles className="w-3.5 h-3.5 2xl:w-5 2xl:h-5 text-amber-300 animate-pulse" />
            <span>Enterprise Portfolio System</span>
          </div>
        </div>

        {/* Hero & Form Grid */}
        <div className="flex-1 flex items-center py-4 sm:py-8 2xl:py-12">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-10 2xl:gap-16 items-center">

          {/* Left Column - Large Creative Headline */}
          <div className="lg:col-span-6 xl:col-span-7 pr-0 lg:pr-8 space-y-2.5 sm:space-y-6 2xl:space-y-8 animate-fade-in-left">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-0.5 sm:px-3.5 sm:py-1.5 2xl:px-5 2xl:py-2 rounded-full bg-black/25 backdrop-blur-md text-white/90 text-[10px] sm:text-xs 2xl:text-sm font-semibold border border-white/15 shadow-sm">
              <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 2xl:w-5 2xl:h-5 text-emerald-400" />
              <span>Secure Single Sign-On</span>
            </div>

            <div className="space-y-1 sm:space-y-4 2xl:space-y-6">
              <h1 className="text-xl sm:text-4xl md:text-5xl xl:text-6xl 2xl:text-7xl 3xl:text-8xl font-extrabold text-white leading-[1.15] sm:leading-[1.1] 2xl:leading-[1.05] tracking-tight drop-shadow-md max-w-2xl 2xl:max-w-4xl">
                Looking to collaborate?
              </h1>

              <h2 className="text-white/95 font-semibold text-base sm:text-3xl md:text-4xl xl:text-5xl 2xl:text-6xl leading-snug sm:leading-tight block max-w-2xl 2xl:max-w-4xl">
                Get in touch to find out how we can help.
              </h2>
            </div>

            <p className="text-white/85 text-xs sm:text-base md:text-lg 2xl:text-2xl max-w-md 2xl:max-w-2xl font-normal leading-relaxed pt-0.5 sm:pt-2">
              Every owner relationship in one portfolio system. Track trigger dates, contacts, statements, and referrals seamlessly.
            </p>
          </div>

          {/* Right Column - Form Area */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-start lg:items-end animate-fade-in-right">
            <div className="w-full max-w-md 2xl:max-w-xl">
              
              {/* Header text right above card */}
              <div className="mb-2.5 sm:mb-6 2xl:mb-8 text-left space-y-0.5 sm:space-y-1 2xl:space-y-2">
                <h2 className="text-base sm:text-2xl 2xl:text-4xl font-bold text-white tracking-tight drop-shadow-sm">
                  Get Started
                </h2>
                <p className="text-white/85 text-[11px] sm:text-sm 2xl:text-xl font-medium leading-normal max-w-sm 2xl:max-w-md">
                  We're here to help. Enter your credentials to access your portfolio system.
                </p>
              </div>

              {/* Form Container with Lift Effect & Smooth Shadows */}
              <div className={`w-full rounded-xl sm:rounded-3xl p-4 sm:p-8 2xl:p-12 shadow-2xl transition-all duration-300 hover:-translate-y-1.5 backdrop-blur-xl border ${
                isDark 
                  ? 'bg-[#111827] text-white border-amber-500/20 shadow-black/90 hover:border-amber-500/40 hover:shadow-amber-500/10' 
                  : 'bg-[#1e222b] text-white border-white/10 shadow-black/50 hover:border-white/20'
              }`}>

                <form onSubmit={submit} className="space-y-3 sm:space-y-5 2xl:space-y-7">
                  {/* Email Field */}
                  <div className="space-y-1 2xl:space-y-2">
                    <label className="block text-[11px] sm:text-xs lg:text-sm 2xl:text-base font-medium text-gray-300 ml-3">Email Address</label>
                    <div className="relative group">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter a valid email address"
                        className={`w-full px-3.5 py-2.5 sm:px-5 sm:py-3.5 lg:py-4 2xl:px-7 2xl:py-5 rounded-full text-xs sm:text-sm lg:text-base 2xl:text-lg font-medium border transition-all duration-200 shadow-inner focus:outline-none focus:ring-4 ${
                          isDark
                            ? 'bg-[#1f293b] text-white placeholder-gray-400 border-gray-700 focus:border-amber-500 focus:bg-gray-900 focus:ring-amber-500/20'
                            : 'bg-[#c8cbce] text-gray-900 placeholder-gray-600 border-transparent focus:border-orange-500 focus:bg-white focus:ring-orange-500/20'
                        }`}
                      />
                      <Mail className={`w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-[18px] lg:h-[18px] 2xl:w-6 2xl:h-6 absolute right-3.5 sm:right-4 2xl:right-6 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
                        isDark ? 'text-gray-400 group-focus-within:text-amber-400' : 'text-gray-500 group-focus-within:text-orange-500'
                      }`} />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1 2xl:space-y-2">
                    <label className="block text-[11px] sm:text-xs lg:text-sm 2xl:text-base font-medium text-gray-300 ml-3">Password</label>
                    <div className="relative group">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className={`w-full pl-3.5 pr-9 py-2.5 sm:pl-5 sm:pr-12 sm:py-3.5 lg:py-4 2xl:pl-7 2xl:pr-16 2xl:py-5 rounded-full text-xs sm:text-sm lg:text-base 2xl:text-lg font-medium border transition-all duration-200 shadow-inner focus:outline-none focus:ring-4 ${
                          isDark
                            ? 'bg-[#1f293b] text-white placeholder-gray-400 border-gray-700 focus:border-amber-500 focus:bg-gray-900 focus:ring-amber-500/20'
                            : 'bg-[#c8cbce] text-gray-900 placeholder-gray-600 border-transparent focus:border-orange-500 focus:bg-white focus:ring-orange-500/20'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-3.5 sm:right-4 2xl:right-6 top-1/2 -translate-y-1/2 transition-colors p-1 ${
                          isDark ? 'text-gray-400 hover:text-amber-400' : 'text-gray-600 hover:text-gray-900'
                        }`}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-[18px] lg:h-[18px] 2xl:w-6 2xl:h-6" /> : <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-[18px] lg:h-[18px] 2xl:w-6 2xl:h-6" />}
                      </button>
                    </div>
                  </div>

                  {/* Error Notification */}
                  {error && (
                    <div className="p-3 2xl:p-5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-[11px] sm:text-xs 2xl:text-base flex items-center gap-2">
                      <span className="w-2 h-2 2xl:w-3 2xl:h-3 rounded-full bg-red-400 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={submitting}
                      className={`relative overflow-hidden w-full py-3 sm:py-4 2xl:py-5 rounded-full font-bold text-xs sm:text-sm 2xl:text-lg tracking-wider uppercase text-white transition-all duration-200 shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 2xl:gap-3 group disabled:opacity-60 ${
                        isDark
                          ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/50 hover:shadow-amber-500/30'
                          : 'bg-[#c8471a] hover:bg-[#b33d14] shadow-orange-950/40 hover:shadow-orange-700/30'
                      }`}
                    >
                      {submitting ? (
                        <div className="w-4 h-4 sm:w-5 sm:h-5 2xl:w-7 2xl:h-7 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>SUBMIT</span>
                          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 2xl:w-6 2xl:h-6 group-hover:translate-x-1.5 transition-transform duration-200" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

              </div>
            </div>
          </div>

        </div>
        </div>

        {/* Footer info */}
        <div className={`flex-shrink-0 text-xs font-medium text-center sm:text-left flex items-center justify-between pt-4 border-t transition-colors duration-500 ${
          isDark ? 'text-gray-400 border-gray-800' : 'text-gray-600 border-gray-400/30'
        }`}>
          <span>&copy; {new Date().getFullYear()} Neoteric Connect. All rights reserved.</span>
          <span className="hidden sm:inline">Enterprise Owner Portfolio Portal</span>
        </div>
      </div>
    </div>
  );
}



