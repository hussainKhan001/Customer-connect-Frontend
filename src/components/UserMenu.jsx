import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, ShieldCheck, User, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useAppNavigation } from '../hooks/useAppNavigation.js';
import { initials } from '../utils/core.js';
import { toast } from '../utils/toast.js';

const DEMO_USERS = [
  { role: 'Super Admin', email: 'admin@neotericgrp.in', name: 'Super Admin' },
  { role: 'Board / CEO', email: 'boardceo@neoteric.test', name: 'Board / CEO' },
  { role: 'GM Sales', email: 'gmsales@neoteric.test', name: 'GM Sales' },
  { role: 'AGM', email: 'agm@neoteric.test', name: 'AGM' },
  { role: 'CRM', email: 'crm@neoteric.test', name: 'CRM' },
  { role: 'Finance', email: 'finance@neoteric.test', name: 'Finance' },
  { role: 'Legal', email: 'legal@neoteric.test', name: 'Legal' },
];

export default function UserMenu() {
  const { user, login, logout } = useAuth();
  const { navigateTo } = useAppNavigation();
  const [open, setOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setRect(triggerRef.current.getBoundingClientRect());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (triggerRef.current?.contains(e.target) || popupRef.current?.contains(e.target)) return;
      setOpen(false);
      setSwitchOpen(false);
    };
    const onScroll = (e) => {
      if (popupRef.current?.contains(e.target)) return;
      setOpen(false);
      setSwitchOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  if (!user) return null;
  const initial = initials(user.name || user.role || 'User').slice(0, 1);

  const handleSwitchUser = async (u) => {
    try {
      await login(u.email, 'Demo@123');
      toast.success('Switched User', `Logged in as ${u.name} (${u.role})`);
      setOpen(false);
      setSwitchOpen(false);
    } catch (err) {
      toast.error('Could not switch user', err.message || 'Check demo user configuration.');
    }
  };

  return (
    <>
      {/* Pill-style Header Button matching screenshot */}
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 pl-3 pr-1 py-1 rounded-full text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-all active:scale-95"
        title="Account & Role Settings"
      >
        <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[140px]">
          {user.name || user.role}
        </span>
        <span className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
          {initial}
        </span>
      </button>

      {open && rect && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[10050] w-[calc(100vw-1.5rem)] sm:w-72 max-w-sm bg-white dark:bg-[#181d28] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/80 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-down "
          style={{ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) }}
        >
          {/* Header Profile Section */}
          <div className="p-3 sm:p-4 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/80 dark:bg-gray-900/40">
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-purple-600 text-white text-sm sm:text-base font-bold flex items-center justify-center shadow-md">
                {initial}
              </div>
              <span className="absolute top-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#181d28]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">{user.name || user.role}</div>
              <div className="text-[11px] sm:text-xs font-semibold text-amber-600 dark:text-amber-500 truncate mt-0.5">{user.role}</div>
              <div className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{user.email}</div>
            </div>
          </div>

          {/* Action Links Section */}
          <div className="p-1.5 sm:p-2 space-y-0.5 border-b border-gray-100 dark:border-gray-700/60">
            <button
              onClick={() => { setOpen(false); navigateTo('/users'); }}
              className="w-full flex items-center gap-2.5 sm:gap-3 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/80 rounded-xl text-left"
            >
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
              <span>{user.role}</span>
            </button>
            <button
              onClick={() => { setOpen(false); navigateTo('/users'); }}
              className="w-full flex items-center gap-2.5 sm:gap-3 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/80 rounded-xl text-left"
            >
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
              <span>My Profile</span>
            </button>
          </div>

          {/* SWITCH USER Dropdown Section */}
          <div className="p-2.5 sm:p-3 space-y-1.5 sm:space-y-2 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-900/20">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-400">
              SWITCH USER
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSwitchOpen((s) => !s)}
                className="w-full flex items-center justify-between gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 text-xs font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-2xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-4 h-4 sm:w-[18px] sm:h-[18px] rounded-full bg-amber-500 text-[9px] sm:text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0">
                    {initial}
                  </span>
                  <span className="truncate text-xs">{user.role} ({user.email.split('@')[0]}…)</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${switchOpen ? 'rotate-180' : ''}`} />
              </button>

              {switchOpen && (
                <div className="mt-1.5 p-1 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl max-h-48 overflow-y-auto custom-scrollbar space-y-0.5">
                  {DEMO_USERS.map((u) => {
                    const isCur = u.role === user.role;
                    return (
                      <button
                        key={u.email}
                        onClick={() => handleSwitchUser(u)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left ${
                          isCur ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <div className="truncate">
                          <div className="font-semibold truncate">{u.name}</div>
                          <div className="text-[10px] text-gray-400 truncate">{u.email}</div>
                        </div>
                        {isCur && <Check className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sign Out Section */}
          <div className="p-1.5 sm:p-2">
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="w-full flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl text-left"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500 dark:text-red-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
