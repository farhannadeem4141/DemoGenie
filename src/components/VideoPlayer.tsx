import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, RefreshCw, X, Volume2, VolumeX, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { validateVideoUrl, extractFilenameFromUrl } from '@/services/video/videoUrlValidator';

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
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [errorLoading, setErrorLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isVertical, setIsVertical] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string>("");
  
  // Track whether component is mounted
  const isMounted = useRef(true);
  const loadAttemptCount = useRef(0);
  
  // On mount and unmount
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Process video URL and handle loading
  useEffect(() => {
    if (!videoUrl || !isMounted.current) return;
    
    // Reset state for new URL
    setErrorLoading(false);
    setIsLoading(true);
    loadAttemptCount.current = 0;
    
    // Process the URL
    const cleanedUrl = videoUrl.trim().replace(/\n/g, '');
    const validatedUrl = validateVideoUrl(cleanedUrl, true);
    
    const finalUrl = validatedUrl || cleanedUrl;
    setProcessedUrl(finalUrl);
    
    if (!validatedUrl) {
      setErrorDetails(`URL validation issue: The video URL format may not be supported.`);
    }
    
    // Load the video once URL is processed
    const loadVideo = () => {
      if (!videoRef.current || !isMounted.current) return;
      
      try {
        const video = videoRef.current;
        video.muted = isMuted;
        
        // Add cache busting to prevent caching issues
        const cacheBuster = `cb=${Date.now()}`;
        const urlWithCache = finalUrl.includes('?') 
          ? `${finalUrl}&${cacheBuster}`  
          : `${finalUrl}?${cacheBuster}`;
        
        // Clear current source first
        video.removeAttribute('src');
        video.load();
        
        // Brief delay to ensure clean state
        setTimeout(() => {
          if (videoRef.current && isMounted.current) {
            videoRef.current.src = urlWithCache;
            videoRef.current.load();
          }
        }, 50);
      } catch (error) {
        console.error("Error loading video:", error);
        setErrorLoading(true);
        setIsLoading(false);
        setErrorDetails(error instanceof Error ? error.message : "Error loading video");
        if (onError) onError();
      }
    };
    
    // Add a small delay to ensure the DOM is ready
    const timer = setTimeout(() => {
      if (isMounted.current) {
        loadVideo();
      }
    }, 100);
    
    // Cleanup timers
    return () => {
      clearTimeout(timer);
    };
  }, [videoUrl, isMuted, onError]);
  
  // Set up video event listeners
  useEffect(() => {
    if (!videoRef.current || !isMounted.current) return;
    
    const video = videoRef.current;
    
    const handleMetadataLoaded = () => {
      if (!isMounted.current) return;
      
      // Detect vertical videos
      try {
        const isPortrait = video.videoHeight > video.videoWidth;
        setIsVertical(isPortrait);
      } catch (e) {
        console.error("Error determining video dimensions:", e);
      }
      
      setIsLoading(false);
      
      // Attempt to play video
      if (isMounted.current) {
        setTimeout(() => {
          if (video && isMounted.current) {
            video.play().catch(err => {
              // Only treat non-autoplay errors as fatal
              if (err.name !== "NotAllowedError") {
                setErrorLoading(true);
                setErrorDetails(err.message || "Error playing video");
                if (onError) onError();
              }
            });
          }
        }, 300);
      }
    };
    
    const handleError = () => {
      if (!isMounted.current) return;
      
      let errorMsg = "Unknown error";
      if (video.error) {
        switch(video.error.code) {
          case 1: errorMsg = "Video playback aborted"; break;
          case 2: errorMsg = "Network error while loading video"; break;
          case 3: errorMsg = "Video format may be unsupported"; break;
          case 4: errorMsg = "Video format not supported or access denied"; break;
          default: errorMsg = video.error.message || "Unknown video error";
        }
      }
      
      setErrorDetails(errorMsg);
      setErrorLoading(true);
      setIsLoading(false);
      
      if (onError) onError();
    };
    
    // Setup event listeners
    video.addEventListener('loadedmetadata', handleMetadataLoaded);
    video.addEventListener('error', handleError);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleMetadataLoaded);
      video.removeEventListener('error', handleError);
    };
  }, [onError, onEnded]);

  const retryLoading = () => {
    if (!isMounted.current || !videoRef.current || !processedUrl) return;
    
    setErrorLoading(false);
    setIsLoading(true);
    loadAttemptCount.current += 1;
    
    try {
      // Add cache busting with timestamp
      const timestamp = Date.now();
      const cacheBuster = `cache=${timestamp}`;
      const urlWithCacheBuster = processedUrl.includes('?') 
        ? `${processedUrl}&${cacheBuster}`
        : `${processedUrl}?${cacheBuster}`;
      
      // Clear source and reload
      videoRef.current.removeAttribute('src');
      
      setTimeout(() => {
        if (videoRef.current && isMounted.current) {
          videoRef.current.src = urlWithCacheBuster;
          videoRef.current.load();
        }
      }, 100);
      
      toast({
        title: "Retrying video playback",
        description: "Attempting to reload the video",
        duration: 3000,
      });
    } catch (e) {
      setErrorLoading(true);
      setIsLoading(false);
      setErrorDetails(e instanceof Error ? e.message : "Error during retry");
      if (onError) onError();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const openInNewTab = () => {
    if (processedUrl) {
      window.open(processedUrl, '_blank');
    }
  };

  console.log('videoName', videoName)

  return (
    <div className={cn("rounded-lg overflow-hidden shadow-lg bg-black relative", className)} data-testid="video-player-container">
      {/* Header with video name and controls */}
      <div className="bg-black/80 text-white p-2 flex justify-between items-center">
        <div className="text-sm font-medium truncate">
          {videoName || extractFilenameFromUrl(processedUrl) || "Video"}
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
          <p className="text-sm mb-4">{errorDetails || "There was a problem loading the video content"}</p>
          <div className="text-xs mb-2 text-red-600 bg-red-50 p-1 rounded overflow-hidden text-ellipsis">
            URL: {processedUrl.substring(0, 50)}{processedUrl.length > 50 ? "..." : ""}
          </div>
          <div className="flex justify-center gap-2 mt-4">
            <button 
              className="px-4 py-2 bg-red-500 text-white rounded flex items-center"
              onClick={retryLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </button>
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded flex items-center"
              onClick={openInNewTab}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open directly
            </button>
          </div>
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
            playsInline  
            controls
            controlsList="nodownload"
            className={cn(
              "w-full h-auto",
              isVertical ? "max-w-[80%] max-h-[65vh] object-contain" : "w-full"
            )}
            onEnded={() => {
              if (onEnded) onEnded();
            }}
            preload="metadata"
            muted={isMuted}
            crossOrigin="anonymous"
          >
            <source src={processedUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
