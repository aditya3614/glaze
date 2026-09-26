import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Production builds ship prerendered HTML (see scripts/prerender.mjs); dev starts empty.
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
