
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
  const mountedRef = useRef(true);
  const loadAttemptRef = useRef(0);
  const [loadCount, setLoadCount] = useState(0);
  const [isRefReady, setIsRefReady] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string>("");
  const playAttemptRef = useRef(false);
  const safeToLoadRef = useRef(false);
  const processingUrlRef = useRef(false);
  
  // Log mount/unmount state for debugging
  useEffect(() => {
    console.log("VideoPlayer: Component MOUNTED with URL:", videoUrl);
    console.log("VideoPlayer: videoRef exists?", !!videoRef.current);
    
    mountedRef.current = true;
    safeToLoadRef.current = false;
    
    return () => {
      console.log("VideoPlayer: Component UNMOUNTED");
      mountedRef.current = false;
      safeToLoadRef.current = false;
    };
  }, []);
  
  // Check if video ref is available immediately after mount
  useEffect(() => {
    console.log("VideoPlayer: Initial mount effect with URL:", videoUrl);
    
    mountedRef.current = true;
    console.log("VideoPlayer mounted with URL:", videoUrl);
    
    // Reset state on new video URL
    setErrorLoading(false);
    setIsLoading(true);
    loadAttemptRef.current = 0;
    playAttemptRef.current = false;
    processingUrlRef.current = true;
    
    // Process the URL first - This is important for Supabase URLs
    const cleanedUrl = videoUrl.trim().replace(/\n/g, '');
    console.log("VideoPlayer: Processing URL:", cleanedUrl);
    
    // Use thorough validation to ensure URL is playable
    const validatedUrl = validateVideoUrl(cleanedUrl, true);
    console.log("VideoPlayer: Validated URL:", validatedUrl || "(validation failed)");
    
    setProcessedUrl(validatedUrl || cleanedUrl);
    processingUrlRef.current = false;
    
    if (!validatedUrl) {
      setErrorDetails(`URL validation failed: ${cleanedUrl}`);
    }
    
    // Small delay to ensure DOM is fully rendered before checking ref
    const initTimer = setTimeout(() => {
      if (videoRef.current) {
        console.log("VideoPlayer: Video element reference is ready");
        setIsRefReady(true);
        safeToLoadRef.current = true;
      } else {
        console.error("VideoPlayer: Video element reference is still null after init");
        safeToLoadRef.current = false;
      }
    }, 100);
    
    return () => {
      console.log("VideoPlayer unmounting, last URL was:", videoUrl);
      mountedRef.current = false;
      safeToLoadRef.current = false;
      clearTimeout(initTimer);
    };
  }, [videoUrl]);

  // Main effect to load and play video once we know ref is ready
  useEffect(() => {
    console.log("VideoPlayer: Load effect triggered. Conditions:", {
      mounted: mountedRef.current,
      url: !!processedUrl,
      refReady: isRefReady,
      videoRefExists: !!videoRef.current,
      safeToLoad: safeToLoadRef.current,
      processingUrl: processingUrlRef.current
    });
    
    if (!mountedRef.current || !processedUrl || !isRefReady || !videoRef.current || !safeToLoadRef.current || processingUrlRef.current) {
      console.log("VideoPlayer: Skipping load - component not mounted, no URL, video element not ready, or URL is still being processed");
      return;
    }
    
    console.log("VideoPlayer: Loading new video URL with ready ref:", processedUrl);
    
    setErrorLoading(false);
    setIsLoading(true);
    setLoadCount(prev => prev + 1);
    
    const videoElement = videoRef.current;
    videoElement.muted = isMuted;
    
    try {
      console.log("VideoPlayer: Setting video src and loading...");
      
      // Add cache busting parameter to prevent caching issues
      const cacheBuster = `cb=${Date.now()}`;
      const urlWithCache = processedUrl.includes('?') 
        ? `${processedUrl}&${cacheBuster}`  
        : `${processedUrl}?${cacheBuster}`;
        
      videoElement.src = urlWithCache;
      videoElement.load();
      console.log("VideoPlayer: Video src set and load() called with:", urlWithCache);
      
      // Set a timeout to detect stalled loading
      const loadTimeout = setTimeout(() => {
        if (isLoading && mountedRef.current) {
          console.warn("VideoPlayer: Loading timed out after 15 seconds");
          if (!errorLoading) {
            handleVideoError();
          }
        }
      }, 15000);
      
      return () => {
        clearTimeout(loadTimeout);
      };
    } catch (e) {
      console.error("VideoPlayer: Error setting source or loading:", e);
      setErrorLoading(true);
      setIsLoading(false);
      setErrorDetails(e instanceof Error ? e.message : "Unknown error setting video source");
      if (onError) onError();
      return;
    }
  }, [processedUrl, onError, isMuted, isRefReady, isLoading]);

  useEffect(() => {
    // Skip if not mounted or no video element
    if (!mountedRef.current || !videoRef.current) return;
    
    const videoElement = videoRef.current;
    
    const handleLoadedMetadata = () => {
      if (!mountedRef.current) return;
      
      console.log("VideoPlayer: Video metadata loaded successfully");
      
      try {
        const isPortrait = videoElement.videoHeight > videoElement.videoWidth;
        setIsVertical(isPortrait);
        console.log("VideoPlayer: Video dimensions", {
          width: videoElement.videoWidth,
          height: videoElement.videoHeight,
          isPortrait
        });
      } catch (e) {
        console.error("VideoPlayer: Error determining video orientation:", e);
      }
      
      setIsLoading(false);
      
      // Only attempt to play if we haven't already tried
      if (!playAttemptRef.current) {
        playAttemptRef.current = true;
        console.log("VideoPlayer: Attempting to play video...");
        
        // Small delay before playing to allow for metadata processing
        setTimeout(() => {
          if (videoElement && mountedRef.current) {
            videoElement.play()
              .then(() => {
                console.log("VideoPlayer: Video started playing successfully");
                toast({
                  title: "Video playback started",
                  description: videoName || "Video is now playing",
                  duration: 3000,
                });
              })
              .catch(err => {
                console.error("VideoPlayer: Error playing video:", err);
                if (mountedRef.current) {
                  // Don't set error state for autoplay errors - these are expected on mobile
                  if (err.name === "NotAllowedError") {
                    console.log("VideoPlayer: Autoplay blocked, user needs to click play");
                  } else {
                    setErrorLoading(true);
                    setErrorDetails(err instanceof Error ? err.message : "Unknown error playing video");
                    if (onError) onError();
                  }
                }
              });
          }
        }, 300);
      }
    };
    
    const handleLoadError = (e: Event) => {
      console.error("VideoPlayer: Video failed to load event triggered:", e);
      
      let errorMsg = "Unknown error";
      
      if (videoElement.error) {
        // Map error codes to more helpful messages
        switch(videoElement.error.code) {
          case 1: // MEDIA_ERR_ABORTED
            errorMsg = "Video playback aborted";
            break;
          case 2: // MEDIA_ERR_NETWORK
            errorMsg = "Network error while loading video";
            break;
          case 3: // MEDIA_ERR_DECODE
            errorMsg = "Video decoding error - format may be unsupported";
            break;
          case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
            errorMsg = "Video format not supported or CORS issue";
            break;
          default:
            errorMsg = videoElement.error.message || "Unknown video error";
        }
      }
      
      setErrorDetails(errorMsg);
      handleVideoError();
    };
    
    const handleStalled = () => {
      console.warn("VideoPlayer: Video playback stalled");
      // Only handle if we're still in loading state to avoid interrupting playback
      if (isLoading && mountedRef.current) {
        console.warn("VideoPlayer: Stalled during initial loading, attempting recovery");
        handleVideoError();
      }
    };
    
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('error', handleLoadError);
    videoElement.addEventListener('stalled', handleStalled);
    
    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('error', handleLoadError);
      videoElement.removeEventListener('stalled', handleStalled);
    };
  }, [videoName, toast, onError, processedUrl, isLoading]);

  const handleVideoError = () => {
    if (!mountedRef.current) return;
    
    console.error("VideoPlayer: Video failed to load:", processedUrl);
    const currentAttempt = loadAttemptRef.current;
    
    setErrorLoading(true);
    setIsLoading(false);
    
    // Reset play attempt flag so we'll try again on retry
    playAttemptRef.current = false;
    
    // Check if the URL is a Supabase URL with double slashes - this is a common issue
    const hasDoubleSlash = processedUrl.includes('//storage/v1/object/public/') || 
                            processedUrl.includes('//videos//');
    
    if (hasDoubleSlash && currentAttempt === 0) {
      // Try to fix common Supabase URL issue with double slashes
      const fixedUrl = processedUrl.replace('//storage/v1/object/public/', '/storage/v1/object/public/')
                                    .replace('//videos//', '/videos/');
      
      console.log("VideoPlayer: Detected double slash issue, trying with fixed URL:", fixedUrl);
      loadAttemptRef.current += 1;
      setProcessedUrl(fixedUrl);
      
      toast({
        title: "Fixing video URL",
        description: "Detected formatting issue - attempting to fix",
        duration: 3000,
      });
      
      return;
    }
    
    // If we've tried the original URL and it failed, try another approach
    if (currentAttempt === 0) {
      // Re-validate with thorough option and try again
      const thoroughlyValidatedUrl = validateVideoUrl(processedUrl, true);
      if (thoroughlyValidatedUrl && thoroughlyValidatedUrl !== processedUrl) {
        console.log("VideoPlayer: Trying with more thoroughly validated URL:", thoroughlyValidatedUrl);
        loadAttemptRef.current += 1;
        setProcessedUrl(thoroughlyValidatedUrl);
        
        toast({
          title: "Retry with enhanced URL",
          description: "Attempting to fix video format issues",
          duration: 3000,
        });
        
        return;
      }
    }
    
    // If we're still having issues, try one more time with a cache-buster
    if (currentAttempt < 2) {
      loadAttemptRef.current += 1;
      console.log(`VideoPlayer: Retry attempt ${loadAttemptRef.current} scheduled`);
      setTimeout(retryLoading, 2000);
    } else if (onError) {
      console.log("VideoPlayer: Max retries reached, calling onError");
      
      toast({
        title: "Video playback failed",
        description: "We were unable to play this video after multiple attempts",
        variant: "destructive",
        duration: 5000,
      });
      
      onError();
    }
  };

  const retryLoading = () => {
    if (!mountedRef.current || !videoRef.current) return;
    
    console.log("VideoPlayer: Retrying video load:", processedUrl);
    setErrorLoading(false);
    setIsLoading(true);
    setLoadCount(prev => prev + 1);
    playAttemptRef.current = false; // Reset play attempt flag
    
    try {
      // Try adding a cache-busting parameter to the URL
      const timestamp = Date.now();
      const cacheBuster = `cache=${timestamp}`;
      const urlWithCacheBuster = processedUrl.includes('?') 
        ? `${processedUrl}&${cacheBuster}`
        : `${processedUrl}?${cacheBuster}`;
      
      console.log("VideoPlayer: Retrying with cache buster:", urlWithCacheBuster);
      videoRef.current.src = urlWithCacheBuster;
      videoRef.current.load();
      
      toast({
        title: "Retrying video playback",
        description: "Attempting to reload the video",
        duration: 3000,
      });
    } catch (e) {
      console.error("VideoPlayer: Error during retry:", e);
      setErrorLoading(true);
      setIsLoading(false);
      setErrorDetails(e instanceof Error ? e.message : "Error during retry attempt");
      if (onError) onError();
    }
  };

  // Try a direct link when other methods fail
  const openInNewTab = () => {
    window.open(processedUrl, '_blank');
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
      loadAttempts: loadCount,
      processedUrl,
      originalUrl: videoUrl
    };
  };

  // Log debug info when video errors
  useEffect(() => {
    if (errorLoading) {
      console.error("VideoPlayer Debug Info:", videoDebugInfo());
    }
  }, [errorLoading, videoUrl]);

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
              console.log("VideoPlayer: Video playback ended");
              if (onEnded) onEnded();
            }}
            onError={handleVideoError}
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
