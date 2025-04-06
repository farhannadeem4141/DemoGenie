
import React from 'react';

interface VideoDebugOverlayProps {
  videoUrl: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  isVisible: boolean;
}

const VideoDebugOverlay: React.FC<VideoDebugOverlayProps> = ({ 
  videoUrl, 
  videoRef,
  isVisible
}) => {
  const getVideoInfo = () => {
    if (!videoRef.current) return "Video element not available";
    
    return {
      src: videoRef.current.src,
      readyState: videoRef.current.readyState,
      networkState: videoRef.current.networkState,
      error: videoRef.current.error ? `Error: ${videoRef.current.error.code} - ${videoRef.current.error.message}` : "None",
      duration: videoRef.current.duration || 0,
      currentTime: videoRef.current.currentTime || 0,
      paused: videoRef.current.paused,
      muted: videoRef.current.muted,
      isVisible
    };
  };

  return (
    <div className="absolute top-0 left-0 right-0 bg-black/80 text-white p-2 text-xs z-30">
      <div>Debug Mode</div>
      <div className="truncate">URL: {videoUrl.substring(0, 50)}...</div>
      <div>
        <pre className="text-green-400 text-xs">
          {JSON.stringify(getVideoInfo(), null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default VideoDebugOverlay;
