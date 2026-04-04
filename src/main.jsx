import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { AuthProvider as DescopeAuthProvider } from '@descope/react-sdk';

const DESCOPE_PROJECT_ID = import.meta.env.VITE_DESCOPE_PROJECT_ID;

// Disable developer tools if VITE_BLOCK_DEVELOPER_TOOLS is true
// Disable developer tools if VITE_BLOCK_DEVELOPER_TOOLS is true
if (import.meta.env.VITE_BLOCK_DEVELOPER_TOOLS === 'true') {
  // Disable right-click context menu
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  
  // Disable keyboard shortcuts for DevTools
  document.addEventListener('keydown', (e) => {
    // F12 key
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I, J, C, K or Cmd+Option+I, J, C, K
    if ((e.ctrlKey || e.metaKey) && (e.shiftKey || e.altKey) && ['I', 'J', 'C', 'K'].includes(e.key.toUpperCase())) {
      e.preventDefault();
      return false;
    }
    // Ctrl+U or Cmd+U (View Source)
    if ((e.ctrlKey || e.metaKey) && e.key.toUpperCase() === 'U') {
      e.preventDefault();
      return false;
    }
    // Ctrl+S, Ctrl+P or Cmd+S, Cmd+P
    if ((e.ctrlKey || e.metaKey) && (e.key.toUpperCase() === 'S' || e.key.toUpperCase() === 'P')) {
      e.preventDefault();
      return false;
    }
  });

  // Try to prevent console debugging
  const preventConsole = () => {
    try {
      const devtools = /./;
      devtools.toString = function() {
        this.opened = true;
      };
      console.log('%c', devtools);
    } catch (e) {}
  };
  setInterval(preventConsole, 1000);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DescopeAuthProvider projectId={DESCOPE_PROJECT_ID}>
      <App />
    </DescopeAuthProvider>
  </StrictMode>,
)
