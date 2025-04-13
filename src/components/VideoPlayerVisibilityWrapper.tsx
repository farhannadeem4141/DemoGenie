
import React, { useEffect, useState, useRef } from 'react';
import VideoPlayer from './VideoPlayer';

interface VideoPlayerVisibilityWrapperProps {
  videoUrl: string;
  videoName?: string;
  onClose?: () => void;
  onError?: () => void;
}

const VideoPlayerVisibilityWrapper: React.FC<VideoPlayerVisibilityWrapperProps> = ({
  videoUrl,
  videoName,
  onClose,
  onError
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceId = useRef(`player-wrapper-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`);

  // useEffect(() => {
  //   console.log(`[VideoPlayerWrapper:${instanceId.current}] Initializing with URL:`, videoUrl);
    
  //   // Use IntersectionObserver to check if the player is visible
  //   const observer = new IntersectionObserver(
  //     (entries) => {
  //       const isIntersecting = entries[0].isIntersecting;
  //       const isVisible = isIntersecting && entries[0].boundingClientRect.height > 0;
  //       console.log(`[VideoPlayerWrapper:${instanceId.current}] Visibility changed:`, isVisible);
  //       setIsVisible(isVisible);
  //     },
  //     { threshold: 0.1 }
  //   );
    
  //   if (containerRef.current) {
  //     observer.observe(containerRef.current);
  //     console.log(`[VideoPlayerWrapper:${instanceId.current}] Started observing visibility`);
  //   }
    
  //   // Force display check after a timeout to catch any delayed rendering issues
  //   setTimeout(() => {
  //     if (containerRef.current) {
  //       const isDisplayed = window.getComputedStyle(containerRef.current).display !== 'none';
  //       const isVisible = isDisplayed && containerRef.current.getBoundingClientRect().height > 0;
  //       console.log(`[VideoPlayerWrapper:${instanceId.current}] Visibility check after 500ms:`, isVisible);
        
  //       if (!isVisible) {
  //         console.warn(`[VideoPlayerWrapper:${instanceId.current}] Player not visible after timeout!`);
  //         console.log(`[VideoPlayerWrapper:${instanceId.current}] Container style:`, 
  //           containerRef.current ? window.getComputedStyle(containerRef.current) : 'No container');
          
  //         // Force visibility
  //         if (containerRef.current) {
  //           containerRef.current.style.display = 'block';
  //           containerRef.current.style.visibility = 'visible';
  //           containerRef.current.style.opacity = '1';
  //           console.log(`[VideoPlayerWrapper:${instanceId.current}] Forced visibility styles`);
  //         }
  //       }
  //     }
  //   }, 500);
    
  //   return () => {
  //     if (containerRef.current) {
  //       observer.unobserve(containerRef.current);
  //       console.log(`[VideoPlayerWrapper:${instanceId.current}] Stopped observing visibility`);
  //     }
  //   };
  // }, [videoUrl]);

  return (
    <div 
      ref={containerRef}
      className="video-player-container" 
      style={{ 
        display: 'block',
        position: 'relative',
        zIndex: 50,
        width: '100%',
        maxWidth: '560px'
      }}
      data-visible={isVisible}
      data-testid="video-visibility-wrapper"
    >
      <VideoPlayer
        videoUrl={videoUrl}
        videoName={videoName}
        onClose={onClose}
        onError={() => {
          console.error(`[VideoPlayerWrapper:${instanceId.current}] Video error occurred`);
          if (onError) onError();
        }}
        className="z-50"
      />
      
      {!isVisible && (
        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center z-60">
          <span className="bg-black text-white text-xs p-2 rounded">
            Video container not visible!
          </span>
        </div>
      )}
    </div>
  );
};

export default VideoPlayerVisibilityWrapper;
