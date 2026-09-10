import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { BtnPrimary } from '../components/Ui.jsx';

const lblCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';
const inputCls = (bad) =>
  `w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${bad ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`;

export default function Login() {
  const { login } = useAuth();
  const { getThemeColor } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-xl p-6">
        <div className="flex flex-col items-center text-center mb-5">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center shadow-sm mb-3"
            style={{ backgroundColor: getThemeColor() }}
          >
            <LogIn className="w-5 h-5 text-white" />
          </div>
          <div className="text-base font-bold text-gray-900 dark:text-white">Neoteric Connect</div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mt-0.5">
            Owner Portfolio System
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="mb-3.5">
            <label htmlFor="login-email" className={lblCls}>Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls(!!error)}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="login-password" className={lblCls}>Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls(!!error)}
              required
            />
          </div>

          {error && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <BtnPrimary type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </BtnPrimary>
        </form>
      </div>
    </div>
  );
}
