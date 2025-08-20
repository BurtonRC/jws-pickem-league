import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const repoName = import.meta.env.PROD ? '/jws-pickem-league' : '';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter basename={repoName}>
      <App />
    </HashRouter>
  </React.StrictMode>
);
