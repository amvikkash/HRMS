import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import '@fontsource-variable/manrope';

// Order matters: customized Bootstrap first, then design tokens (so token
// values can be referenced by anything after), then global resets/utilities.
import './design-system/styles/custom.scss';
import './design-system/styles/tokens.css';
import './design-system/styles/global.css';
import './components/ui/components.css';

import { queryClient } from './api/queryClient';
import { AuthProvider } from './auth/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import App from './App.jsx';

class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="hz-page-loader p-4">
        <div className="hz-state" style={{ maxWidth: 460 }}>
          <div className="hz-state__icon-wrap" aria-hidden="true">!</div>
          <h1 className="hz-state__title">Something went wrong</h1>
          <p className="hz-state__description">The workspace could not render this screen. Reload to try again.</p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Reload workspace</button>
        </div>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>
);
