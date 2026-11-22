import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    navigator.serviceWorker.register('/firebase-messaging-sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  } catch (e) {
    console.warn('Service worker registration error at startup:', e);
  }
}

createRoot(document.getElementById('root')!).render(<App />);
