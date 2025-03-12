
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
  const [isVertical, setIsVertical] = useState(false);
  const mountedRef = useRef(true);
  const previousUrlRef = useRef(videoUrl);
  const loadAttemptRef = useRef(0);

  useEffect(() => {
    // Set mounted flag on initial render
    mountedRef.current = true;
    
    // Clean up when component unmounts
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Only reload video when URL actually changes
  useEffect(() => {
    if (!mountedRef.current) return;
    
    // Only reload if URL has changed and is different from the previous one
    if (previousUrlRef.current !== videoUrl) {
      console.log("VideoPlayer: URL changed, reloading video:", videoUrl);
      previousUrlRef.current = videoUrl;
      loadAttemptRef.current = 0; // Reset load attempts on new URL
      
      setErrorLoading(false);
      setIsLoading(true);
      
      // Give a little time for the component to be fully mounted before playing
      const timer = setTimeout(() => {
        if (!mountedRef.current) return;
        
        if (videoRef.current) {
          videoRef.current.muted = isMuted; // Set muted state
          videoRef.current.load();
          
          // Add a event listener for when metadata is loaded
          const handleLoadedMetadata = () => {
            if (!mountedRef.current) return;
            
            // Check if video is vertical (portrait mode)
            if (videoRef.current) {
              const isPortrait = videoRef.current.videoHeight > videoRef.current.videoWidth;
              setIsVertical(isPortrait);
              console.log("Video orientation detected:", isPortrait ? "vertical" : "horizontal");
            }
            
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
    }
  }, [videoUrl, onError, isMuted]);

  // Handle video errors
  const handleVideoError = () => {
    console.error("Video failed to load:", videoUrl);
    const currentAttempt = loadAttemptRef.current;
    
    if (mountedRef.current) {
      setErrorLoading(true);
      setIsLoading(false);
    }
    
    // Prevent infinite reload loops by limiting retries
    if (currentAttempt < 2) { // Allow max 2 automatic retries
      console.log(`Auto-retry attempt ${currentAttempt + 1} for video:`, videoUrl);
      loadAttemptRef.current += 1;
      
      setTimeout(() => {
        if (mountedRef.current) {
          retryLoading();
        }
      }, 2000); // Wait 2 seconds before retry
    } else if (onError) {
      onError();
    }
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
        <div className={cn(
          "relative flex justify-center bg-black",
          isVertical ? "max-h-[70vh] py-2" : ""
        )}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
          )}
          <video
            ref={videoRef}
            controls
            className={cn(
              "w-full h-auto",
              isVertical ? "max-w-[80%] max-h-[65vh] object-contain" : "w-full"
            )}
            onEnded={onEnded}
            onError={handleVideoError}
            preload="auto"
            muted={isMuted}
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
