import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider as ReduxProvider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import { store } from './store/store.js';
import { AppProvider } from './context/AppContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { PageHeaderActionProvider } from './context/PageHeaderActionContext.jsx';
import './lib/env.ts';
import './index.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Redux Toolkit store — auth session + UI theme (see store/store.js
       for what's in it and what deliberately isn't yet). Everything
       below still reaches it through useAuth()/useTheme(), not raw
       useSelector/useDispatch, so this is the only file that needed to
       know a store exists. */}
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <ThemeProvider>
              <AppProvider>
                <PageHeaderActionProvider>
                  <App />
                </PageHeaderActionProvider>
              </AppProvider>
            </ThemeProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ReduxProvider>
  </StrictMode>
);
