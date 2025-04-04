
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
  const playerLogId = useRef(`player-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`);
  
  // Log mount/unmount state for debugging
  useEffect(() => {
    console.log(`[VideoPlayer:${playerLogId.current}] 🔄 COMPONENT MOUNTED with URL:`, videoUrl);
    console.log(`[VideoPlayer:${playerLogId.current}] Video element reference exists:`, !!videoRef.current);
    
    mountedRef.current = true;
    safeToLoadRef.current = false;
    
    return () => {
      console.log(`[VideoPlayer:${playerLogId.current}] 🛑 COMPONENT UNMOUNTED`);
      mountedRef.current = false;
      safeToLoadRef.current = false;
    };
  }, []);
  
  // Check if video ref is available immediately after mount
  useEffect(() => {
    console.log(`[VideoPlayer:${playerLogId.current}] ⚙️ Initial mount effect with URL:`, videoUrl);
    console.time(`[VideoPlayer:${playerLogId.current}] Total video load and play time`);
    
    mountedRef.current = true;
    console.log(`[VideoPlayer:${playerLogId.current}] Mounted state set to true`);
    
    // Reset state on new video URL
    console.log(`[VideoPlayer:${playerLogId.current}] Resetting player state for new URL`);
    setErrorLoading(false);
    setIsLoading(true);
    loadAttemptRef.current = 0;
    playAttemptRef.current = false;
    processingUrlRef.current = true;
    
    // Process the URL first - This is important for Supabase URLs
    const cleanedUrl = videoUrl.trim().replace(/\n/g, '');
    console.log(`[VideoPlayer:${playerLogId.current}] Processing URL [length: ${cleanedUrl.length}]`);
    console.log(`[VideoPlayer:${playerLogId.current}] URL before validation: ${cleanedUrl.substring(0, 100)}${cleanedUrl.length > 100 ? '...' : ''}`);
    
    // Use thorough validation to ensure URL is playable
    console.time(`[VideoPlayer:${playerLogId.current}] URL validation time`);
    const validatedUrl = validateVideoUrl(cleanedUrl, true);
    console.timeEnd(`[VideoPlayer:${playerLogId.current}] URL validation time`);
    
    if (validatedUrl) {
      console.log(`[VideoPlayer:${playerLogId.current}] ✅ URL validated successfully`);
      console.log(`[VideoPlayer:${playerLogId.current}] URL after validation: ${validatedUrl.substring(0, 100)}${validatedUrl.length > 100 ? '...' : ''}`);
    } else {
      console.error(`[VideoPlayer:${playerLogId.current}] ❌ URL validation failed`);
    }
    
    setProcessedUrl(validatedUrl || cleanedUrl);
    processingUrlRef.current = false;
    
    if (!validatedUrl) {
      setErrorDetails(`URL validation failed: ${cleanedUrl.substring(0, 50)}...`);
    }
    
    // Small delay to ensure DOM is fully rendered before checking ref
    console.log(`[VideoPlayer:${playerLogId.current}] Setting timeout to check video element reference`);
    const initTimer = setTimeout(() => {
      if (videoRef.current) {
        console.log(`[VideoPlayer:${playerLogId.current}] ✅ Video element reference is ready`);
        setIsRefReady(true);
        safeToLoadRef.current = true;
      } else {
        console.error(`[VideoPlayer:${playerLogId.current}] ❌ Video element reference is still null after init`);
        safeToLoadRef.current = false;
      }
    }, 100);
    
    return () => {
      console.log(`[VideoPlayer:${playerLogId.current}] Unmounting, last URL was: ${videoUrl.substring(0, 50)}${videoUrl.length > 50 ? '...' : ''}`);
      console.timeEnd(`[VideoPlayer:${playerLogId.current}] Total video load and play time`);
      mountedRef.current = false;
      safeToLoadRef.current = false;
      clearTimeout(initTimer);
    };
  }, [videoUrl]);

  // Main effect to load and play video once we know ref is ready
  useEffect(() => {
    console.log(`[VideoPlayer:${playerLogId.current}] Load effect triggered. Conditions:`, {
      mounted: mountedRef.current,
      url: !!processedUrl,
      refReady: isRefReady,
      videoRefExists: !!videoRef.current,
      safeToLoad: safeToLoadRef.current,
      processingUrl: processingUrlRef.current
    });
    
    if (!mountedRef.current || !processedUrl || !isRefReady || !videoRef.current || !safeToLoadRef.current || processingUrlRef.current) {
      console.log(`[VideoPlayer:${playerLogId.current}] ⚠️ Skipping load - preconditions not met`);
      return;
    }
    
    console.log(`[VideoPlayer:${playerLogId.current}] 🎬 LOADING VIDEO with URL: ${processedUrl.substring(0, 80)}...`);
    console.time(`[VideoPlayer:${playerLogId.current}] Video load operation`);
    
    setErrorLoading(false);
    setIsLoading(true);
    setLoadCount(prev => prev + 1);
    
    const videoElement = videoRef.current;
    videoElement.muted = isMuted;
    console.log(`[VideoPlayer:${playerLogId.current}] Video muted state:`, isMuted);
    
    try {
      console.log(`[VideoPlayer:${playerLogId.current}] Setting video source and calling load()`);
      
      // Add cache busting parameter to prevent caching issues
      const cacheBuster = `cb=${Date.now()}`;
      const urlWithCache = processedUrl.includes('?') 
        ? `${processedUrl}&${cacheBuster}`  
        : `${processedUrl}?${cacheBuster}`;
      
      console.log(`[VideoPlayer:${playerLogId.current}] Final URL with cache buster: ${urlWithCache.substring(0, 80)}...`);  
      videoElement.src = urlWithCache;
      
      console.log(`[VideoPlayer:${playerLogId.current}] Calling load() method on video element`);
      videoElement.load();
      console.log(`[VideoPlayer:${playerLogId.current}] load() method called`);
      
      // Set a timeout to detect stalled loading
      console.log(`[VideoPlayer:${playerLogId.current}] Setting 15-second timeout for load operation`);
      const loadTimeout = setTimeout(() => {
        if (isLoading && mountedRef.current) {
          console.warn(`[VideoPlayer:${playerLogId.current}] ⏱️ Loading TIMED OUT after 15 seconds`);
          if (!errorLoading) {
            console.log(`[VideoPlayer:${playerLogId.current}] Triggering error handler due to timeout`);
            handleVideoError();
          }
        }
      }, 15000);
      
      return () => {
        console.log(`[VideoPlayer:${playerLogId.current}] Cleaning up load effect, clearing timeout`);
        clearTimeout(loadTimeout);
      };
    } catch (e) {
      console.error(`[VideoPlayer:${playerLogId.current}] ❌ Error setting source or loading:`, e);
      console.timeEnd(`[VideoPlayer:${playerLogId.current}] Video load operation`);
      setErrorLoading(true);
      setIsLoading(false);
      setErrorDetails(e instanceof Error ? e.message : "Unknown error setting video source");
      if (onError) {
        console.log(`[VideoPlayer:${playerLogId.current}] Calling onError callback due to load exception`);
        onError();
      }
      return;
    }
  }, [processedUrl, onError, isMuted, isRefReady, isLoading]);

  useEffect(() => {
    // Skip if not mounted or no video element
    if (!mountedRef.current || !videoRef.current) {
      console.log(`[VideoPlayer:${playerLogId.current}] Skipping media event listeners setup - component not mounted or no video element`);
      return;
    }
    
    const videoElement = videoRef.current;
    
    const handleLoadedMetadata = () => {
      if (!mountedRef.current) return;
      
      console.log(`[VideoPlayer:${playerLogId.current}] ✅ Video metadata loaded successfully`);
      console.timeEnd(`[VideoPlayer:${playerLogId.current}] Video load operation`);
      
      try {
        const isPortrait = videoElement.videoHeight > videoElement.videoWidth;
        setIsVertical(isPortrait);
        console.log(`[VideoPlayer:${playerLogId.current}] Video dimensions detected:`, {
          width: videoElement.videoWidth,
          height: videoElement.videoHeight,
          isPortrait,
          duration: videoElement.duration,
          readyState: videoElement.readyState
        });
      } catch (e) {
        console.error(`[VideoPlayer:${playerLogId.current}] Error determining video dimensions:`, e);
      }
      
      setIsLoading(false);
      
      // Only attempt to play if we haven't already tried
      if (!playAttemptRef.current) {
        playAttemptRef.current = true;
        console.log(`[VideoPlayer:${playerLogId.current}] 🎬 Attempting to play video...`);
        console.time(`[VideoPlayer:${playerLogId.current}] Video play attempt`);
        
        // Small delay before playing to allow for metadata processing
        setTimeout(() => {
          if (videoElement && mountedRef.current) {
            console.log(`[VideoPlayer:${playerLogId.current}] Calling play() method on video element`);
            videoElement.play()
              .then(() => {
                console.log(`[VideoPlayer:${playerLogId.current}] ✅ Video started playing successfully`);
                console.timeEnd(`[VideoPlayer:${playerLogId.current}] Video play attempt`);
                
                toast({
                  title: "Video playback started",
                  description: videoName || "Video is now playing",
                  duration: 3000,
                });
              })
              .catch(err => {
                console.error(`[VideoPlayer:${playerLogId.current}] ❌ Error playing video:`, err);
                console.timeEnd(`[VideoPlayer:${playerLogId.current}] Video play attempt`);
                
                if (mountedRef.current) {
                  // Don't set error state for autoplay errors - these are expected on mobile
                  if (err.name === "NotAllowedError") {
                    console.log(`[VideoPlayer:${playerLogId.current}] Autoplay was blocked by browser, user needs to click play manually`);
                  } else {
                    console.log(`[VideoPlayer:${playerLogId.current}] Setting error state due to play() rejection`);
                    setErrorLoading(true);
                    setErrorDetails(err instanceof Error ? err.message : "Unknown error playing video");
                    if (onError) {
                      console.log(`[VideoPlayer:${playerLogId.current}] Calling onError callback due to play failure`);
                      onError();
                    }
                  }
                }
              });
          }
        }, 300);
      }
    };
    
    const handleLoadError = (e: Event) => {
      console.error(`[VideoPlayer:${playerLogId.current}] ❌ Video failed to load event triggered:`, e);
      console.timeEnd(`[VideoPlayer:${playerLogId.current}] Video load operation`);
      
      let errorMsg = "Unknown error";
      
      if (videoElement.error) {
        // Map error codes to more helpful messages
        console.log(`[VideoPlayer:${playerLogId.current}] Video error code:`, videoElement.error.code);
        console.log(`[VideoPlayer:${playerLogId.current}] Video error message:`, videoElement.error.message);
        
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
      
      console.log(`[VideoPlayer:${playerLogId.current}] Setting error details:`, errorMsg);
      setErrorDetails(errorMsg);
      handleVideoError();
    };
    
    const handleStalled = () => {
      console.warn(`[VideoPlayer:${playerLogId.current}] ⚠️ Video playback STALLED`);
      console.log(`[VideoPlayer:${playerLogId.current}] Video network state:`, videoElement.networkState);
      console.log(`[VideoPlayer:${playerLogId.current}] Video ready state:`, videoElement.readyState);
      
      // Only handle if we're still in loading state to avoid interrupting playback
      if (isLoading && mountedRef.current) {
        console.warn(`[VideoPlayer:${playerLogId.current}] Stalled during initial loading, attempting recovery`);
        handleVideoError();
      }
    };
    
    const handleTimeUpdate = () => {
      // Only log occasionally to avoid flooding the console
      if (videoElement.currentTime % 5 < 0.1) { // Log roughly every 5 seconds
        console.log(`[VideoPlayer:${playerLogId.current}] Video playback progress: ${Math.round(videoElement.currentTime)}s / ${Math.round(videoElement.duration)}s`);
      }
    };
    
    const handlePlay = () => {
      console.log(`[VideoPlayer:${playerLogId.current}] ▶️ Video PLAY event`);
    };
    
    const handlePause = () => {
      console.log(`[VideoPlayer:${playerLogId.current}] ⏸️ Video PAUSE event`);
    };
    
    const handleSeeking = () => {
      console.log(`[VideoPlayer:${playerLogId.current}] 🔍 Video SEEKING to ${videoElement.currentTime}s`);
    };
    
    const handleVolumeChange = () => {
      console.log(`[VideoPlayer:${playerLogId.current}] 🔊 Volume changed: ${videoElement.volume}, muted: ${videoElement.muted}`);
    };
    
    const handleWaiting = () => {
      console.log(`[VideoPlayer:${playerLogId.current}] ⌛ Video WAITING/BUFFERING`);
    };
    
    const handleCanPlay = () => {
      console.log(`[VideoPlayer:${playerLogId.current}] ✅ Video CAN PLAY event (enough data to start playback)`);
    };
    
    console.log(`[VideoPlayer:${playerLogId.current}] Setting up video element event listeners`);
    
    // Basic loading events
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('error', handleLoadError);
    videoElement.addEventListener('stalled', handleStalled);
    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('waiting', handleWaiting);
    
    // Playback state events
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('seeking', handleSeeking);
    videoElement.addEventListener('volumechange', handleVolumeChange);
    
    return () => {
      console.log(`[VideoPlayer:${playerLogId.current}] Removing video element event listeners`);
      
      // Clean up all event listeners
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('error', handleLoadError);
      videoElement.removeEventListener('stalled', handleStalled);
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('waiting', handleWaiting);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('seeking', handleSeeking);
      videoElement.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [videoName, toast, onError, processedUrl, isLoading]);

  const handleVideoError = () => {
    if (!mountedRef.current) return;
    
    console.error(`[VideoPlayer:${playerLogId.current}] ❌ Video failed to load: ${processedUrl.substring(0, 50)}...`);
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
      
      console.log(`[VideoPlayer:${playerLogId.current}] 🔧 Detected double slash issue, trying with fixed URL: ${fixedUrl.substring(0, 50)}...`);
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
        console.log(`[VideoPlayer:${playerLogId.current}] 🔄 Retry with more thoroughly validated URL: ${thoroughlyValidatedUrl.substring(0, 50)}...`);
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
      console.log(`[VideoPlayer:${playerLogId.current}] 🔄 Retry attempt ${loadAttemptRef.current} scheduled`);
      setTimeout(retryLoading, 2000);
    } else if (onError) {
      console.log(`[VideoPlayer:${playerLogId.current}] ❌ Max retries reached, calling onError`);
      
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
    
    console.log(`[VideoPlayer:${playerLogId.current}] 🔄 RETRYING video load: ${processedUrl.substring(0, 50)}...`);
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
      
      console.log(`[VideoPlayer:${playerLogId.current}] Retrying with cache buster: ${urlWithCacheBuster.substring(0, 80)}...`);
      videoRef.current.src = urlWithCacheBuster;
      
      console.log(`[VideoPlayer:${playerLogId.current}] Calling load() method for retry`);
      videoRef.current.load();
      
      toast({
        title: "Retrying video playback",
        description: "Attempting to reload the video",
        duration: 3000,
      });
    } catch (e) {
      console.error(`[VideoPlayer:${playerLogId.current}] ❌ Error during retry:`, e);
      setErrorLoading(true);
      setIsLoading(false);
      setErrorDetails(e instanceof Error ? e.message : "Error during retry attempt");
      if (onError) {
        console.log(`[VideoPlayer:${playerLogId.current}] Calling onError callback due to retry exception`);
        onError();
      }
    }
  };

  // Try a direct link when other methods fail
  const openInNewTab = () => {
    console.log(`[VideoPlayer:${playerLogId.current}] Opening video in new tab: ${processedUrl.substring(0, 50)}...`);
    window.open(processedUrl, '_blank');
  };

  const toggleMute = () => {
    console.log(`[VideoPlayer:${playerLogId.current}] Toggling mute state from ${isMuted} to ${!isMuted}`);
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const videoDebugInfo = () => {
    if (!videoRef.current) return "Video element not mounted";
    
    return {
      readyState: videoRef.current.readyState,
      networkState: videoRef.current.networkState,
      error: videoRef.current.error ? videoRef.current.error.code : null,
      errorMessage: videoRef.current.error ? videoRef.current.error.message : null,
      srcSet: !!videoRef.current.src,
      actualSrc: videoRef.current.src,
      loadAttempts: loadCount,
      processedUrl,
      originalUrl: videoUrl,
      currentTime: videoRef.current.currentTime,
      duration: videoRef.current.duration,
      paused: videoRef.current.paused,
      ended: videoRef.current.ended,
      muted: videoRef.current.muted,
      volume: videoRef.current.volume
    };
  };

  // Log debug info when video errors
  useEffect(() => {
    if (errorLoading) {
      console.error(`[VideoPlayer:${playerLogId.current}] 📊 VIDEO DEBUG INFO:`, videoDebugInfo());
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
              console.log(`[VideoPlayer:${playerLogId.current}] 🏁 Video playback ENDED`);
              if (onEnded) {
                console.log(`[VideoPlayer:${playerLogId.current}] Calling onEnded callback`);
                onEnded();
              }
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
