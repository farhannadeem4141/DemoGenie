
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, RefreshCw, X, Volume2, VolumeX } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl: string;
  videoName?: string;
  onEnded?: () => void;
  onError?: () => void;
  onClose?: () => void;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  videoUrl, 
  videoName, 
  onEnded,
  onError,
  onClose,
  className
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [errorLoading, setErrorLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true); // Start muted by default
  const mountedRef = useRef(true);

  useEffect(() => {
    // Set mounted flag on initial render
    mountedRef.current = true;
    
    // Clean up when component unmounts
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Reset error state when URL changes
    if (!mountedRef.current) return;
    
    setErrorLoading(false);
    setIsLoading(true);
    console.log("VideoPlayer: Loading video URL:", videoUrl);
    
    // Give a little time for the component to be fully mounted before playing
    const timer = setTimeout(() => {
      if (!mountedRef.current) return;
      
      if (videoRef.current) {
        videoRef.current.muted = isMuted; // Set muted state
        videoRef.current.load();
        
        // Add a event listener for when metadata is loaded
        const handleLoadedMetadata = () => {
          if (!mountedRef.current) return;
          
          setIsLoading(false);
          videoRef.current?.play().catch(err => {
            console.error("Error playing video:", err);
            if (mountedRef.current) {
              setErrorLoading(true);
            }
            if (onError) onError();
          });
        };
        
        videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
        
        // Return cleanup function
        return () => {
          if (videoRef.current) {
            videoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
          }
        };
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [videoUrl, onError, isMuted]);

  // Handle video errors
  const handleVideoError = () => {
    console.error("Video failed to load:", videoUrl);
    if (mountedRef.current) {
      setErrorLoading(true);
      setIsLoading(false);
    }
    if (onError) onError();
  };

  // Retry loading video
  const retryLoading = () => {
    if (!mountedRef.current) return;
    
    setErrorLoading(false);
    setIsLoading(true);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(console.error);
    }
  };

  // Toggle mute state
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  return (
    <div className={cn("rounded-lg overflow-hidden shadow-lg bg-black relative", className)}>
      {/* Header with video name and controls */}
      <div className="bg-black/80 text-white p-2 flex justify-between items-center">
        <div className="text-sm font-medium truncate">
          {videoName || "Video"}
        </div>
        <div className="flex gap-2">
          {/* Mute/Unmute button */}
          <button 
            onClick={toggleMute}
            className="p-1 hover:bg-gray-700 rounded-full transition-colors text-white"
            aria-label={isMuted ? "Unmute video" : "Mute video"}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          {/* Close button */}
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1 hover:bg-gray-700 rounded-full transition-colors text-white"
              aria-label="Close video"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {errorLoading ? (
        <div className="bg-red-100 text-red-800 p-6 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 text-red-500" />
          <p className="font-medium">Failed to load video</p>
          <p className="text-sm mb-4">There was a problem loading the video content</p>
          <button 
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded flex items-center mx-auto"
            onClick={retryLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
      ) : (
        <>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
          )}
          <video
            ref={videoRef}
            controls
            className="w-full h-auto"
            onEnded={onEnded}
            onError={handleVideoError}
            preload="auto"
            muted={isMuted}
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </>
      )}
    </div>
  );
};

export default VideoPlayer;
