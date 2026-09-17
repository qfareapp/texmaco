import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AdminApp from './AdminApp';
import NewsPage from './NewsPage';
import PullToRefresh from './PullToRefresh';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PullToRefresh />
    {window.location.pathname.startsWith('/admin') ? <AdminApp /> : window.location.pathname.startsWith('/news') ? <NewsPage /> : <App />}
  </React.StrictMode>,
);
