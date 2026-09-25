import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App.tsx';
import './index.css';
import { RouteScrollRestoration } from './components/RouteScrollRestoration.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <RouteScrollRestoration />
      <App />
    </BrowserRouter>
  </StrictMode>,
);
