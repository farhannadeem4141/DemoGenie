import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { fixAllVideos, VideoFixer } from './utils/videoFixerUtil';

// Make video fixer available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).fixAllVideos = fixAllVideos;
  (window as any).VideoFixer = VideoFixer;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
