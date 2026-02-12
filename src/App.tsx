import React, { useState } from 'react';
import Home from './pages/Home';
import Settings from './pages/Settings';
import './styles/global.css';

type Page = 'home' | 'settings';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('home');

  return (
    <div className="app">
      <header className="header">
        <div className="brand">dikstract</div>
        <nav>
          <button
            className={page === 'home' ? 'active' : ''}
            onClick={() => setPage('home')}
          >
            home
          </button>
          <button
            className={page === 'settings' ? 'active' : ''}
            onClick={() => setPage('settings')}
          >
            settings
          </button>
        </nav>
      </header>

      <main className="content">
        {page === 'home' && <Home onOpenSettings={() => setPage('settings')} />}
        {page === 'settings' && <Settings />}
      </main>
    </div>
  );
};

export default App;
