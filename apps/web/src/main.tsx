import React from 'react';
import ReactDOM from 'react-dom/client';

import '@fontsource/be-vietnam-pro/latin-400.css';
import '@fontsource/be-vietnam-pro/latin-500.css';
import '@fontsource/be-vietnam-pro/latin-600.css';
import '@fontsource/be-vietnam-pro/latin-700.css';
import '@fontsource/be-vietnam-pro/vietnamese-400.css';
import '@fontsource/be-vietnam-pro/vietnamese-500.css';
import '@fontsource/be-vietnam-pro/vietnamese-600.css';
import '@fontsource/be-vietnam-pro/vietnamese-700.css';
import '@fontsource/newsreader/latin-600.css';
import '@fontsource/newsreader/latin-600-italic.css';
import '@fontsource/newsreader/vietnamese-600.css';
import '@fontsource/newsreader/vietnamese-600-italic.css';
import 'antd/dist/reset.css';

import { App } from './app/app';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element is missing');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
