import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';

/** Renders the home page to HTML at build time, so search engines see the content without running JavaScript. */
export function render(): string {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
