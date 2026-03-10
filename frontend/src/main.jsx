import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sileo';
import 'sileo/styles.css';
import App from './App.jsx';
import './index.css';

const root = createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <Toaster position="top-right" theme="light" offset={{ top: 72 }} />
    <App />
  </BrowserRouter>
);
