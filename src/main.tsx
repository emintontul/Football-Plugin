import React from 'react';
import ReactDOM from 'react-dom/client';
import { BridgeProvider } from './bridge';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BridgeProvider>
      <App />
    </BridgeProvider>
  </React.StrictMode>,
);
