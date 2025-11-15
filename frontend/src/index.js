import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { syncPendingPipes } from './utils/offlineInventory';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Trigger sync when browser comes back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncPendingPipes();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SYNC_PENDING_PIPES') {
        syncPendingPipes();
      }
    });
  }
}

serviceWorkerRegistration.register();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
