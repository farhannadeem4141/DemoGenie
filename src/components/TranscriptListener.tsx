
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

  useEffect(() => {
    if (currentVideo && (!currentVideoId || currentVideoId !== currentVideo.id)) {
      console.log("New video available, preparing to show:", currentVideo);
      
      setCurrentVideoId(currentVideo.id);
      
      const videoKeyValue = `video-${currentVideo.id}-${Date.now()}`;
      setVideoKey(videoKeyValue);
      
      const timer = setTimeout(() => {
        setIsVideoVisible(true);
      }, 300);
      
      return () => clearTimeout(timer);
    } else if (!currentVideo) {
      setIsVideoVisible(false);
      setCurrentVideoId(null);
    }
  }, [currentVideo, currentVideoId]);

  useEffect(() => {
    console.log("Recording status prop changed:", isRecording);
    setRecordingStatus(isRecording);
  }, [isRecording]);

  const handleVoiceInput = async (inputText: string) => {
    if (!inputText || inputText.trim() === '') return;
    
    if (lastProcessedInputRef.current === inputText) {
      console.log("Skipping duplicate voice input:", inputText);
      return;
    }
    lastProcessedInputRef.current = inputText;
    
    console.log("Voice input for search:", inputText);
    
    if (processingKeywordRef.current) {
      console.log("Already processing a keyword, skipping this input");
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
      console.log("Saved voice input to local storage");
      
      if (inputText.toLowerCase().includes('catalog')) {
        console.log("Catalog keyword detected, using specialized catalog query");
        try {
          const result = await queryVideosWithCatalogTag();
          console.log("Catalog query result:", result);
          if (result.success && result.data && result.data.length > 0) {
            const catalogVideo = {
              id: result.data[0].id,
              video_url: result.data[0].video_url,
              video_name: result.data[0].video_name || 'Catalog Feature',
              keyword: 'catalog'
            };
            console.log("Setting catalog video directly:", catalogVideo);
            
            // Ensure video_name is always provided
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
          console.error("Error in direct catalog query:", error);
        }
      }
      
      toast({
        title: "Searching for Video",
        description: `Looking for video related to: "${inputText.substring(0, 30)}${inputText.length > 30 ? '...' : ''}"`,
        duration: 2000,
      });
      
      const searchResult = await searchAndPlayVideo(inputText);
      console.log("Video search result:", searchResult);
      
      if (searchResult.success && searchResult.video) {
        console.log("Setting video from search result:", searchResult.video);
        
        // The video object now has a guaranteed video_name property
        setCurrentVideo({
          id: searchResult.video.id,
          video_url: searchResult.video.video_url,
          video_name: searchResult.video.video_name,
          keyword: searchResult.video.keyword
        });
        
        toast({
          title: "Video Found",
          description: `Now playing: ${searchResult.video.video_name}`,
          duration: 3000,
        });
      } else {
        console.error("Video search failed:", searchResult.errorDetails);
        
        const errorStep = searchResult.errorDetails?.step || 'unknown';
        const errorMessage = searchResult.errorDetails?.message || 'Unknown error during video search';
        
        toast({
          variant: "destructive",
          title: "No Video Found",
          description: `${errorMessage} (Error at: ${errorStep})`,
          duration: 5000,
        });
        
        addMessage({
          text: `No video found for "${inputText}". Error: ${errorMessage}`,
          isSystem: true,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error("Error processing voice input:", error);
      toast({
        variant: "destructive",
        title: "Error Processing Voice Input",
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      });
    } finally {
      setTimeout(() => {
        processingKeywordRef.current = false;
      }, 1000);
    }
  };

  useEffect(() => {
    const checkForExistingInputs = () => {
      try {
        const voiceInputs = localStorage.getItem('voice_input_history');
        if (voiceInputs) {
          const parsedInputs = JSON.parse(voiceInputs);
          console.log("Found existing voice inputs:", parsedInputs.length);
          
          if (Array.isArray(parsedInputs) && parsedInputs.length > 0) {
            const latestInput = parsedInputs[0];
            if (latestInput && latestInput.text) {
              console.log("Processing most recent voice input:", latestInput.text);
              if (lastProcessedInputRef.current !== latestInput.text) {
                handleVoiceInput(latestInput.text);
              }
            }
          }
        } else {
          console.log("No existing voice inputs found in localStorage");
        }
      } catch (error) {
        console.error("Error processing existing voice inputs:", error);
      }
    };
    
    checkForExistingInputs();
    
    const checkForActivationButtons = () => {
      if (window.activateRecording) {
        console.log("Found global activateRecording function");
      } else {
        console.log("Global activateRecording function not found");
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
          
          console.log("Vapi button visibility check:", isVisible);
          
          if (!isVisible && recordingStatus) {
            console.log("Vapi button is hidden but recording still active - deactivating");
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
  }, [recordingStatus, addMessage]);

  useEffect(() => {
    const captureAiMessages = (event: any) => {
      if (event.detail && event.detail.type === 'ai_message' && event.detail.text) {
        console.log("Received AI message:", event.detail.text);
        
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
        console.log("Voice input captured:", inputText);
        
        await handleVoiceInput(inputText);
      }
    };

    const handleRecordingStatusChange = (event: any) => {
      if (event.detail && typeof event.detail.isActive === 'boolean') {
        console.log("Recording status changed to: " + (event.detail.isActive ? "ACTIVE" : "INACTIVE"));
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
  }, [addMessage, toast, setCurrentVideo]);

  const handleVideoError = () => {
    toast({
      variant: "destructive",
      title: "Video Error",
      description: "Failed to load the video. Please try again later.",
      duration: 5000,
    });
  };

  const handleVideoClose = () => {
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

  return (
    <>
      <div className={cn("fixed right-4 bottom-24 w-80 z-50 transition-all", className)}>
        {recordingStatus && (
          <div className="mb-3 flex items-center justify-center bg-red-500 text-white p-2 rounded-lg shadow-lg animate-pulse">
            Recording Active
          </div>
        )}

        {currentVideo && currentVideo.video_url && (
          <div className={cn(
            "mb-4 transform transition-all duration-300 ease-in-out shadow-lg rounded-lg overflow-hidden",
            isVideoVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}>
            <VideoPlayer 
              key={videoKey}
              videoUrl={currentVideo.video_url} 
              videoName={currentVideo.video_name || `Video related to "${currentVideo.keyword}"`}
              onEnded={() => console.log("Video playback ended")}
              onError={handleVideoError}
              onClose={handleVideoClose}
            />
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
