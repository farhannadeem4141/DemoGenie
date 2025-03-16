
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
  const [isMuted, setIsMuted] = useState(true);
  const [isVertical, setIsVertical] = useState(false);
  const mountedRef = useRef(true);
  const previousUrlRef = useRef('');
  const loadAttemptRef = useRef(0);
  const hasInitializedRef = useRef(false);
  const [loadCount, setLoadCount] = useState(0);  // Track load attempts for debugging

  useEffect(() => {
    mountedRef.current = true;
    console.log("VideoPlayer mounted with URL:", videoUrl);
    
    return () => {
      console.log("VideoPlayer unmounting, last URL was:", videoUrl);
      mountedRef.current = false;
    };
  }, [videoUrl]);

  useEffect(() => {
    if (!mountedRef.current || !videoUrl) {
      console.log("VideoPlayer: Skipping load - component not mounted or no URL");
      return;
    }
    
    // Skip loading if URL hasn't changed and we've already initialized
    if (previousUrlRef.current === videoUrl && hasInitializedRef.current) {
      console.log("VideoPlayer: Same URL, skipping reload:", videoUrl);
      return;
    }

    console.log("VideoPlayer: Loading new video URL:", videoUrl);
    previousUrlRef.current = videoUrl;
    loadAttemptRef.current = 0;
    hasInitializedRef.current = true;
    
    setErrorLoading(false);
    setIsLoading(true);
    setLoadCount(prev => prev + 1);  // Increment load counter
    
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      
      try {
        console.log("VideoPlayer: Setting video src and loading...");
        videoRef.current.src = videoUrl;
        videoRef.current.load();
      } catch (e) {
        console.error("VideoPlayer: Error setting source or loading:", e);
        setErrorLoading(true);
        setIsLoading(false);
        if (onError) onError();
        return;
      }
      
      const handleLoadedMetadata = () => {
        if (!mountedRef.current) return;
        
        console.log("VideoPlayer: Video metadata loaded successfully");
        
        if (videoRef.current) {
          try {
            const isPortrait = videoRef.current.videoHeight > videoRef.current.videoWidth;
            setIsVertical(isPortrait);
            console.log("VideoPlayer: Video dimensions", {
              width: videoRef.current.videoWidth,
              height: videoRef.current.videoHeight,
              isPortrait
            });
          } catch (e) {
            console.error("VideoPlayer: Error determining video orientation:", e);
          }
        }
        
        setIsLoading(false);
        
        if (videoRef.current) {
          console.log("VideoPlayer: Attempting to play video...");
          videoRef.current.play()
            .then(() => {
              console.log("VideoPlayer: Video started playing successfully");
            })
            .catch(err => {
              console.error("VideoPlayer: Error playing video:", err);
              if (mountedRef.current) {
                setErrorLoading(true);
              }
              if (onError) onError();
            });
        }
      };
      
      const handleLoadError = (e: Event) => {
        console.error("VideoPlayer: Video failed to load event triggered:", e);
        handleVideoError();
      };
      
      videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      videoRef.current.addEventListener('error', handleLoadError);
      
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
          videoRef.current.removeEventListener('error', handleLoadError);
        }
      };
    } else {
      console.error("VideoPlayer: Video reference is null, cannot set up video");
      setErrorLoading(true);
      setIsLoading(false);
      if (onError) onError();
    }
  }, [videoUrl, onError, isMuted]);

  const handleVideoError = () => {
    if (!mountedRef.current) return;
    
    console.error("VideoPlayer: Video failed to load:", videoUrl);
    const currentAttempt = loadAttemptRef.current;
    
    setErrorLoading(true);
    setIsLoading(false);
    
    if (currentAttempt < 2) {
      loadAttemptRef.current += 1;
      console.log(`VideoPlayer: Retry attempt ${loadAttemptRef.current} scheduled`);
      setTimeout(retryLoading, 2000);
    } else if (onError) {
      console.log("VideoPlayer: Max retries reached, calling onError");
      onError();
    }
  };

  const retryLoading = () => {
    if (!mountedRef.current) return;
    
    console.log("VideoPlayer: Retrying video load:", videoUrl);
    setErrorLoading(false);
    setIsLoading(true);
    setLoadCount(prev => prev + 1);  // Increment load counter
    
    if (videoRef.current) {
      try {
        videoRef.current.src = videoUrl;
        videoRef.current.load();
        videoRef.current.play()
          .then(() => console.log("VideoPlayer: Retry play successful"))
          .catch(err => {
            console.error("VideoPlayer: Retry play failed:", err);
            if (mountedRef.current) {
              setErrorLoading(true);
              setIsLoading(false);
              if (onError) onError();
            }
          });
      } catch (e) {
        console.error("VideoPlayer: Error during retry:", e);
        setErrorLoading(true);
        setIsLoading(false);
        if (onError) onError();
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      console.log("VideoPlayer: Mute toggled to:", !isMuted);
    }
  };

  const videoDebugInfo = () => {
    if (!videoRef.current) return "Video element not mounted";
    
    return {
      readyState: videoRef.current.readyState,
      networkState: videoRef.current.networkState,
      error: videoRef.current.error ? videoRef.current.error.code : null,
      srcSet: !!videoRef.current.src,
      actualSrc: videoRef.current.src,
      loadAttempts: loadCount
    };
  };

  // Log debug info when video errors
  useEffect(() => {
    if (errorLoading) {
      console.error("VideoPlayer Debug Info:", videoDebugInfo());
    }
  }, [errorLoading]);

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
          <div className="text-xs mb-2 text-red-600 bg-red-50 p-1 rounded">
            URL: {videoUrl.substring(0, 50)}...
          </div>
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
            onEnded={() => {
              console.log("VideoPlayer: Video playback ended");
              if (onEnded) onEnded();
            }}
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
