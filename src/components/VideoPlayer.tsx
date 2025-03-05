
import React, { useEffect, useRef } from 'react';
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

  useEffect(() => {
    // Reset and play when video URL changes
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(err => {
        console.error("Error playing video:", err);
      });
    }
  }, [videoUrl]);

  return (
    <div className={cn("rounded-lg overflow-hidden shadow-lg", className)}>
      {videoName && (
        <div className="bg-black/80 text-white p-2 text-sm font-medium">
          {videoName}
        </div>
      )}
      <video
        ref={videoRef}
        controls
        autoPlay
        className="w-full h-auto"
        onEnded={onEnded}
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoPlayer;
