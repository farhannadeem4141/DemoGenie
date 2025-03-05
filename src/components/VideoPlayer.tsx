
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  videoUrl: string;
  videoName?: string;
  onEnded?: () => void;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  videoUrl, 
  videoName, 
  onEnded,
  className
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [errorLoading, setErrorLoading] = useState(false);

  useEffect(() => {
    // Reset error state when URL changes
    setErrorLoading(false);
    
    // Reset and play when video URL changes
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(err => {
        console.error("Error playing video:", err);
        setErrorLoading(true);
      });
    }
  }, [videoUrl]);

  // Handle video errors
  const handleVideoError = () => {
    console.error("Video failed to load:", videoUrl);
    setErrorLoading(true);
  };

  return (
    <div className={cn("rounded-lg overflow-hidden shadow-lg", className)}>
      {videoName && (
        <div className="bg-black/80 text-white p-2 text-sm font-medium">
          {videoName}
        </div>
      )}
      {errorLoading ? (
        <div className="bg-red-100 text-red-800 p-4 text-center">
          <p>Failed to load video</p>
          <button 
            className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm"
            onClick={() => {
              setErrorLoading(false);
              if (videoRef.current) {
                videoRef.current.load();
                videoRef.current.play().catch(console.error);
              }
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <video
          ref={videoRef}
          controls
          autoPlay
          className="w-full h-auto"
          onEnded={onEnded}
          onError={handleVideoError}
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}
    </div>
  );
};

export default VideoPlayer;
