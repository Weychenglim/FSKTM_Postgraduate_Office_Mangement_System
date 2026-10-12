import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import App from './App.tsx';
import './index.css';
import { RouteScrollRestoration } from './components/RouteScrollRestoration.tsx';

const router = createBrowserRouter([{ path: '*', element: <><RouteScrollRestoration /><App /></> }]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
