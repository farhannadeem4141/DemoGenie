
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { fixAllVideos, VideoFixer } from './utils/videoFixerUtil';

// Make video fixer available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).fixAllVideos = fixAllVideos;
  (window as any).VideoFixer = VideoFixer;
  
  // Add localStorage watch helper for transcript debugging
  (window as any).watchTranscript = () => {
    console.log("Starting transcript watcher");
    let lastValue = localStorage.getItem('transcript');
    console.log("Initial transcript value:", lastValue);
    
    // Monitor for changes in localStorage
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      if (key === 'transcript') {
        console.log(`localStorage.setItem('transcript', '${value}')`);
        const event = new Event('transcriptChanged');
        document.dispatchEvent(event);
      }
      originalSetItem.apply(this, [key, value]);
    };
    
    document.addEventListener('transcriptChanged', () => {
      const newValue = localStorage.getItem('transcript');
      console.log("Transcript changed:", newValue);
      if (newValue !== lastValue) {
        console.log(`Transcript value changed from "${lastValue}" to "${newValue}"`);
        lastValue = newValue;
      }
    });
    
    return "Transcript watcher started";
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
