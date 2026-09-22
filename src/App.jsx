import { useState, useEffect, useRef, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Menu, Moon, Sun } from 'lucide-react';
import { useApp } from './context/AppContext.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { useTheme } from './context/ThemeContext.jsx';
import { Skeleton, PageGate } from './components/Ui.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Sidebar from './components/Sidebar.jsx';
import UserMenu from './components/UserMenu.jsx';
import NotificationBell from './components/NotificationBell.jsx';
import Footer from './components/Footer.jsx';
import Login from './pages/Login.jsx';
import { fmtD, TODAY } from './utils/core.js';
import { PAGES, pageById } from './constants/navigation.js';

const MasterPage = pageById('master').Component;

/* Full-shell placeholder for the two top-level loading states */
function ShellSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <div className="hidden lg:flex w-60 h-full flex-col gap-2 p-4 border-r border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50">
        <Skeleton className="h-9 w-full rounded-lg" />
        {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
      </div>
      <div className="flex-1 p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-56 rounded-lg" />
        <PageSkeleton />
      </div>
    </div>
  );
}

/* Lighter placeholder for React.lazy()'s <Suspense> boundary */
function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
    </div>
  );
}

export default function App() {
  const { user, authLoading } = useAuth();
  const { base, loading, loadError, live } = useApp();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const mainRef = useRef(null);

  /* header title/desc, keyed on the first path segment */
  const pageId = location.pathname.split('/').filter(Boolean)[0] || 'command';
  const page = pageById(pageId) ?? PAGES[0];

  /* scroll to top on every navigation — <main> below is the element
     that actually scrolls (overflow-y-auto), not window/body, so
     resetting window.scrollTo() here was a no-op: opening an owner
     (or switching its tabs) kept whatever scrollTop <main> already
     had from wherever you were before, landing you mid-page instead
     of at the top. */
  useEffect(() => { mainRef.current?.scrollTo(0, 0); }, [location.pathname]);

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) setMobileOpen((o) => !o);
    else setCollapsed((c) => !c);
  };

  if (authLoading) return <ShellSkeleton />;

  if (!user) return <Login />;

  if (loading) return <ShellSkeleton />;

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950 px-6">
        <div className="max-w-md text-center bg-white dark:bg-gray-900 p-6 rounded-lg border border-red-200 dark:border-red-900/30 shadow-xl">
          <div className="text-base font-bold text-red-600 dark:text-red-400 mb-2">Could not reach the API</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {loadError} — confirm the backend is running (<code className="font-mono">npm run server</code> or{' '}
            <code className="font-mono">npm run dev:all</code>) and MongoDB is reachable.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-gray-900 print:h-auto print:overflow-visible">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} collapsed={collapsed} />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden print:overflow-visible">
        {/* Sticky Navbar Header */}
        <header className="print:hidden sticky top-0 z-30 flex-shrink-0 px-4 sm:px-6 py-3 bg-slate-50/80 dark:bg-gray-900/80 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 w-full mx-auto px-5 py-2.5 rounded-lg bg-white/95 dark:bg-gray-800/95 border border-gray-200/80 dark:border-slate-800/90 shadow-2xs">
            <div className="flex items-center gap-3.5">
              <button
                onClick={toggleSidebar}
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-150 active:scale-95"
                title="Toggle navigation sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className="min-w-0 flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-400 dark:text-slate-400">
                <span className="hidden sm:inline">Neoteric Properties</span>
                <span className="hidden sm:inline text-gray-300 dark:text-slate-700">/</span>
                <span className="font-bold text-gray-900 dark:text-white tracking-tight">{page.title}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 sm:gap-5">
              <NotificationBell />

              {/* Dark/Light Mode Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                className="w-8 sm:w-9 h-8 sm:h-9 flex-shrink-0 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-slate-700/80 shadow-2xs transition-all active:scale-95"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-700 dark:text-gray-300" />}
              </button>

              <UserMenu />
            </div>
          </div>
        </header>

        {/* Main Content Area with Single Smooth Scrollbar */}
        <main ref={mainRef} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col justify-between print:overflow-visible">
          <div className={`px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8 w-full space-y-6 ${page.id === 'master' ? 'pt-3 sm:pt-4' : 'pt-4 sm:pt-6 lg:pt-8'}`}>
            {/* Prominent Page Header (matching reference screenshots) — the
               Customer Master page skips this: its own sidebar already
               carries the owner's identity, and Nexora's own Lead Detail
               page has no redundant page-title header above it either. */}
            {page.id !== 'master' && (
              <div className="mb-2 space-y-0.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {page.title}
                </h1>
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                  {page.desc}
                </p>
              </div>
            )}

            <ErrorBoundary>
              <Suspense fallback={<PageSkeleton />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/command" replace />} />
                  {PAGES.filter((p) => p.id !== 'master').map((p) => (
                    <Route key={p.id} path={p.path} element={
                      p.capability
                        ? <PageGate capability={p.capability} label={p.label}><p.Component /></PageGate>
                        : <p.Component />
                    } />
                  ))}
                  <Route path="master" element={<MasterPage />} />
                  <Route path="master/:id" element={<MasterPage />} />
                  <Route path="master/:id/:tab" element={<MasterPage />} />
                  <Route path="*" element={<Navigate to="/command" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </div>

          <Footer />
        </main>
      </div>
    </div>
  );
}
