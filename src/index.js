import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initCapacitor } from './capacitor-init';

initCapacitor();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
