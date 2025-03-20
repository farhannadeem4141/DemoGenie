import React, { useEffect, useState, useRef } from 'react';
import { useConversationHistory } from '@/hooks/useConversationHistory';
import VideoPlayer from './VideoPlayer';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { queryVideosWithCatalogTag } from '@/services/video';
import { searchAndPlayVideo } from '@/services/video/searchAndPlay';

interface TranscriptListenerProps {
  className?: string;
  isRecording?: boolean;
  debugLogs?: string[];
}

const TranscriptListener: React.FC<TranscriptListenerProps> = ({ 
  className, 
  isRecording = false,
  debugLogs = []
}) => {
  const { addMessage, currentVideo, setCurrentVideo, messages } = useConversationHistory();
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState(isRecording);
  const { toast } = useToast();
  const [videoKey, setVideoKey] = useState('');
  const [currentVideoId, setCurrentVideoId] = useState<number | null>(null);
  const processingKeywordRef = useRef(false);
  const lastProcessedInputRef = useRef('');
  const [videoRenderAttempts, setVideoRenderAttempts] = useState(0);
  const videoErrorsRef = useRef<string[]>([]);
  const videoVisibilityTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!currentVideo) {
      console.log("TranscriptListener: No current video, hiding player");
      setIsVideoVisible(false);
      setCurrentVideoId(null);
      return;
    }
    
    if (currentVideoId === currentVideo.id && isVideoVisible) {
      console.log("TranscriptListener: Video ID unchanged and already visible, skipping remount");
      return;
    }
    
    console.log("TranscriptListener: New video available, details:", {
      id: currentVideo.id,
      name: currentVideo.video_name,
      url: currentVideo.video_url.substring(0, 50) + '...'
    });
    
    if (!currentVideo.video_url || !currentVideo.video_url.startsWith('http')) {
      console.error("TranscriptListener: Invalid video URL", currentVideo.video_url);
      videoErrorsRef.current.push(`Invalid video URL: ${currentVideo.video_url?.substring(0, 30)}...`);
      toast({
        variant: "destructive",
        title: "Video Error",
        description: "Invalid video URL format",
        duration: 3000,
      });
      return;
    }
    
    setCurrentVideoId(currentVideo.id);
    
    const videoKeyValue = `video-${currentVideo.id}-${Date.now()}-${videoRenderAttempts}`;
    console.log(`TranscriptListener: Setting video key to ${videoKeyValue}`);
    setVideoKey(videoKeyValue);
    
    if (videoVisibilityTimerRef.current) {
      clearTimeout(videoVisibilityTimerRef.current);
    }
    
    setIsVideoVisible(false);
    
    videoVisibilityTimerRef.current = setTimeout(() => {
      console.log("TranscriptListener: Making video visible");
      setIsVideoVisible(true);
    }, 300);
    
    return () => {
      if (videoVisibilityTimerRef.current) {
        clearTimeout(videoVisibilityTimerRef.current);
      }
    };
  }, [currentVideo, toast, videoRenderAttempts, isVideoVisible, currentVideoId]);

  useEffect(() => {
    console.log("TranscriptListener: Recording status prop changed:", isRecording);
    setRecordingStatus(isRecording);
  }, [isRecording]);

  const handleVoiceInput = async (inputText: string) => {
    if (!inputText || inputText.trim() === '') {
      console.log("TranscriptListener: Empty voice input, skipping");
      return;
    }
    
    if (lastProcessedInputRef.current === inputText) {
      console.log("TranscriptListener: Skipping duplicate voice input:", inputText);
      return;
    }
    lastProcessedInputRef.current = inputText;
    
    console.log("TranscriptListener: Processing voice input for search:", inputText);
    
    if (processingKeywordRef.current) {
      console.log("TranscriptListener: Already processing a keyword, skipping this input");
      return;
    }
    
    processingKeywordRef.current = true;
    
    addMessage({
      text: inputText,
      isAiMessage: false,
      timestamp: Date.now()
    });
    
    try {
      const savedInputs = JSON.parse(localStorage.getItem('voice_input_history') || '[]');
      const newInput = {
        text: inputText,
        timestamp: Date.now()
      };
      
      localStorage.setItem('voice_input_history', 
        JSON.stringify([newInput, ...savedInputs].slice(0, 50))
      );
      console.log("TranscriptListener: Saved voice input to local storage");
      
      if (inputText.toLowerCase().includes('catalog')) {
        console.log("TranscriptListener: Catalog keyword detected, using specialized catalog query");
        try {
          const result = await queryVideosWithCatalogTag();
          console.log("TranscriptListener: Catalog query result:", result);
          if (result.success && result.data && result.data.length > 0) {
            const catalogVideo = {
              id: result.data[0].id,
              video_url: result.data[0].video_url,
              video_name: result.data[0].video_name || 'Catalog Feature',
              keyword: 'catalog'
            };
            console.log("TranscriptListener: Setting catalog video directly:", catalogVideo);
            
            if (catalogVideo.video_name) {
              setCurrentVideo(catalogVideo);
              
              toast({
                title: "Catalog Video Found",
                description: `Now playing: ${catalogVideo.video_name}`,
                duration: 3000,
              });
            }
            
            processingKeywordRef.current = false;
            return;
          }
        } catch (error) {
          console.error("TranscriptListener: Error in direct catalog query:", error);
          videoErrorsRef.current.push(`Catalog query error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      toast({
        title: "Searching for Video",
        description: `Looking for video related to: "${inputText.substring(0, 30)}${inputText.length > 30 ? '...' : ''}"`,
        duration: 2000,
      });
      
      try {
        const searchResult = await searchAndPlayVideo(inputText);
        console.log("TranscriptListener: Video search result:", searchResult);
        
        if (searchResult.success && searchResult.video) {
          console.log("TranscriptListener: Setting video from search result:", searchResult.video);
          
          setCurrentVideo({
            id: searchResult.video.id,
            video_url: searchResult.video.video_url,
            video_name: searchResult.video.video_name,
            keyword: searchResult.video.keyword
          });
          
          console.log("TranscriptListener: Video player should now be visible with:", searchResult.video.video_url);
          
          toast({
            title: "Video Found",
            description: `Now playing: ${searchResult.video.video_name}`,
            duration: 3000,
          });
        } else {
          console.error("TranscriptListener: Video search failed:", searchResult.errorDetails);
          useLocalFallbackVideo(inputText);
        }
      } catch (error) {
        console.error("TranscriptListener: Error in video search:", error);
        useLocalFallbackVideo(inputText);
      }
    } catch (error) {
      console.error("TranscriptListener: Error processing voice input:", error);
      videoErrorsRef.current.push(`Voice input processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      toast({
        variant: "destructive",
        title: "Error Processing Voice Input",
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      });
      
      useLocalFallbackVideo(inputText);
    } finally {
      setTimeout(() => {
        processingKeywordRef.current = false;
      }, 1000);
    }
  };

  const useLocalFallbackVideo = (keyword: string) => {
    const fallbackVideoUrl = "https://boncletesuahajikgrrz.supabase.co/storage/v1/object/public/videos//How%20To%20Advertise.mp4";
    console.log("TranscriptListener: Using local fallback video:", fallbackVideoUrl);
    
    setCurrentVideo({
      id: 999,
      video_url: fallbackVideoUrl,
      video_name: "How To Advertise (Fallback)",
      keyword: keyword
    });
    
    toast({
      title: "Using Fallback Video",
      description: "Could not find a specific video, showing default content",
      duration: 3000,
    });
  };

  useEffect(() => {
    const checkForExistingInputs = () => {
      try {
        const voiceInputs = localStorage.getItem('voice_input_history');
        if (voiceInputs) {
          const parsedInputs = JSON.parse(voiceInputs);
          console.log("TranscriptListener: Found existing voice inputs:", parsedInputs.length);
          
          if (Array.isArray(parsedInputs) && parsedInputs.length > 0) {
            const latestInput = parsedInputs[0];
            if (latestInput && latestInput.text) {
              console.log("TranscriptListener: Processing most recent voice input:", latestInput.text);
              if (lastProcessedInputRef.current !== latestInput.text) {
                handleVoiceInput(latestInput.text);
              }
            }
          }
        } else {
          console.log("TranscriptListener: No existing voice inputs found in localStorage");
        }
      } catch (error) {
        console.error("TranscriptListener: Error processing existing voice inputs:", error);
        videoErrorsRef.current.push(`LocalStorage access error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    
    checkForExistingInputs();
    
    const checkForActivationButtons = () => {
      if (window.activateRecording) {
        console.log("TranscriptListener: Found global activateRecording function");
      } else {
        console.log("TranscriptListener: Global activateRecording function not found");
      }
    };
    
    setTimeout(checkForActivationButtons, 1000);
    
    const buttonStateInterval = setInterval(() => {
      const vapiButton = document.querySelector('[id^="vapi-support-btn"]');
      if (vapiButton) {
        if (vapiButton instanceof HTMLElement) {
          const isVisible = 
            vapiButton.style.display !== 'none' && 
            vapiButton.style.visibility !== 'hidden' &&
            !vapiButton.classList.contains('inactive') &&
            vapiButton.getAttribute('aria-hidden') !== 'true';
          
          console.log("TranscriptListener: Vapi button visibility check:", isVisible);
          
          if (!isVisible && recordingStatus) {
            console.log("TranscriptListener: Vapi button is hidden but recording still active - deactivating");
            setRecordingStatus(false);
            
            window.dispatchEvent(new CustomEvent('recording_status_change', {
              detail: { isActive: false }
            }));
          }
        }
      }
    }, 3000);
    
    return () => {
      clearInterval(buttonStateInterval);
    };
  }, []);

  useEffect(() => {
    const captureAiMessages = (event: any) => {
      if (event.detail && event.detail.type === 'ai_message' && event.detail.text) {
        console.log("TranscriptListener: Received AI message:", event.detail.text);
        
        addMessage({
          text: event.detail.text,
          isAiMessage: true,
          timestamp: Date.now()
        });
        
        toast({
          title: "Message Received",
          description: "Processing message to find relevant videos...",
          duration: 3000,
        });
      }
    };

    const captureVoiceInput = async (event: any) => {
      if (event.detail && event.detail.type === 'voice_input' && event.detail.text) {
        const inputText = event.detail.text;
        console.log("TranscriptListener: Voice input captured:", inputText);
        
        await handleVoiceInput(inputText);
      }
    };

    const handleRecordingStatusChange = (event: any) => {
      if (event.detail && typeof event.detail.isActive === 'boolean') {
        console.log("TranscriptListener: Recording status changed to: " + (event.detail.isActive ? "ACTIVE" : "INACTIVE"));
        setRecordingStatus(event.detail.isActive);
        
        if (event.detail.isActive) {
          addMessage({
            text: "Recording started",
            isSystem: true,
            timestamp: Date.now()
          });
        } else {
          addMessage({
            text: "Recording stopped",
            isSystem: true,
            timestamp: Date.now()
          });
        }
        
        toast({
          title: event.detail.isActive ? "Recording Started" : "Recording Stopped",
          description: event.detail.isActive 
            ? "Voice recording is now active" 
            : "Voice recording is now inactive",
          duration: 3000,
        });
      }
    };

    window.addEventListener('vapi_message', captureAiMessages);
    window.addEventListener('voice_input', captureVoiceInput);
    window.addEventListener('recording_status_change', handleRecordingStatusChange);
    
    console.log("TranscriptListener: Set up event listeners for vapi_message, voice_input, and recording_status_change");

    return () => {
      window.removeEventListener('vapi_message', captureAiMessages);
      window.removeEventListener('voice_input', captureVoiceInput);
      window.removeEventListener('recording_status_change', handleRecordingStatusChange);
    };
  }, []);

  const handleVideoError = () => {
    console.error("TranscriptListener: Video error occurred with current video:", currentVideo);
    videoErrorsRef.current.push(`Video playback error for: ${currentVideo?.video_name || 'unknown'}`);
    
    const errorDetails = videoErrorsRef.current.length > 0 
      ? `Last error: ${videoErrorsRef.current[videoErrorsRef.current.length - 1]}`
      : "No additional error details available";
    
    toast({
      variant: "destructive",
      title: "Video Error",
      description: `Failed to load the video. ${errorDetails}`,
      duration: 5000,
    });
    
    if (videoRenderAttempts < 2) {
      setTimeout(() => {
        setVideoRenderAttempts(prev => prev + 1);
      }, 1000);
    } else if (currentVideo) {
      useLocalFallbackVideo(currentVideo.keyword || "");
    }
  };

  const handleVideoClose = () => {
    console.log("TranscriptListener: Video closed by user");
    
    if (videoVisibilityTimerRef.current) {
      clearTimeout(videoVisibilityTimerRef.current);
    }
    
    setIsVideoVisible(false);
    
    setTimeout(() => {
      setCurrentVideo(null);
      setCurrentVideoId(null);
    }, 300);
    
    toast({
      title: "Video Closed",
      description: "You can ask me more questions anytime.",
      duration: 3000,
    });
  };

  useEffect(() => {
    if (currentVideo && isVideoVisible && videoKey) {
      console.log(`TranscriptListener: Video should be visible now. Key: ${videoKey}, Attempt: ${videoRenderAttempts}`);
    }
  }, [currentVideo, isVideoVisible, videoKey, videoRenderAttempts]);

  return (
    <>
      <div className={cn("fixed right-4 bottom-24 w-80 z-50 transition-all", className)}>
        {recordingStatus && (
          <div className="mb-3 flex items-center justify-center bg-red-500 text-white p-2 rounded-lg shadow-lg animate-pulse">
            Recording Active
          </div>
        )}

        {currentVideo && currentVideo.video_url && (
          <div 
            className={cn(
              "mb-4 transform transition-all duration-300 ease-in-out shadow-lg rounded-lg overflow-hidden",
              isVideoVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
            data-testid="video-player-container"
          >
            {isVideoVisible && (
              <VideoPlayer 
                key={videoKey}
                videoUrl={currentVideo.video_url} 
                videoName={currentVideo.video_name || `Video related to "${currentVideo.keyword}"`}
                onEnded={() => console.log("TranscriptListener: Video playback ended")}
                onError={handleVideoError}
                onClose={handleVideoClose}
              />
            )}
          </div>
        )}
        
        {videoErrorsRef.current.length > 0 && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
            <strong>Video Debug Info:</strong>
            <ul className="mt-1 list-disc pl-4">
              {videoErrorsRef.current.slice(-3).map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      <div className="absolute top-[520px] left-0 right-0 flex justify-center items-center pointer-events-none z-40">
        <div className="text-center text-whatsapp font-bold px-4 py-2 bg-white/80 rounded-lg shadow-sm">
          Click for live demo
        </div>
      </div>
    </>
  );
};

export default TranscriptListener;
