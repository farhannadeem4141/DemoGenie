
import React, { useEffect, useState } from 'react';
import { useConversationHistory } from '@/hooks/useConversationHistory';
import VideoPlayer from './VideoPlayer';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';
import { queryVideosWithCatalogTag } from '@/services/video';

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

  useEffect(() => {
    if (currentVideo) {
      console.log("Video available, preparing to show:", currentVideo);
      const timer = setTimeout(() => {
        setIsVideoVisible(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setIsVideoVisible(false);
    }
  }, [currentVideo]);

  useEffect(() => {
    console.log("Recording status prop changed:", isRecording);
    setRecordingStatus(isRecording);
  }, [isRecording]);

  useEffect(() => {
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
  }, [recordingStatus]);

  useEffect(() => {
    // Load any existing voice inputs from localStorage on component mount
    const loadExistingVoiceInputs = () => {
      try {
        const storedInputs = localStorage.getItem('voice_input_history');
        if (storedInputs) {
          const inputs = JSON.parse(storedInputs);
          if (Array.isArray(inputs) && inputs.length > 0) {
            console.log("Found existing voice inputs in localStorage, processing...");
            
            // Add each voice input to the conversation history
            inputs.forEach(input => {
              if (input && input.text) {
                console.log("Adding voice input from storage:", input.text.substring(0, 50) + "...");
                addMessage({
                  text: input.text,
                  isAiMessage: false,
                  timestamp: input.timestamp || Date.now()
                });
              }
            });
          }
        }
      } catch (error) {
        console.error("Error loading voice inputs from localStorage:", error);
      }
    };
    
    // Call this immediately to load existing inputs
    loadExistingVoiceInputs();
    
    const captureAiMessages = (event: any) => {
      if (event.detail && event.detail.type === 'ai_message' && event.detail.text) {
        console.log("Received AI message:", event.detail.text);
        
        // Always add AI messages to conversation history
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
        
        // Always add user voice input to conversation history
        addMessage({
          text: inputText,
          isAiMessage: false,
          timestamp: Date.now()
        });
        
        // Save the voice input to localStorage directly here as well
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
        } catch (error) {
          console.error("Error saving voice input to localStorage:", error);
        }
        
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
              setCurrentVideo(catalogVideo);
              
              toast({
                title: "Catalog Video Found",
                description: `Now playing: ${catalogVideo.video_name}`,
                duration: 3000,
              });
              return;
            }
          } catch (error) {
            console.error("Error in direct catalog query:", error);
          }
        }
        
        toast({
          title: "Voice Input Received",
          description: `Processing: "${event.detail.text.substring(0, 30)}${event.detail.text.length > 30 ? '...' : ''}"`,
          duration: 3000,
        });
      }
    };

    const handleRecordingStatusChange = (event: any) => {
      if (event.detail && typeof event.detail.isActive === 'boolean') {
        console.log("Recording status changed to: " + (event.detail.isActive ? "ACTIVE" : "INACTIVE"));
        setRecordingStatus(event.detail.isActive);
        
        // Log recording status changes to conversation history
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
    }, 300);
    
    toast({
      title: "Video Closed",
      description: "You can ask me more questions anytime.",
      duration: 3000,
    });
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  return (
    <div className={cn("fixed right-4 bottom-24 w-80 z-50 transition-all", className)}>
      {recordingStatus && (
        <div className="mb-3 flex items-center justify-center bg-red-500 text-white p-2 rounded-lg shadow-lg animate-pulse">
          Recording Active
        </div>
      )}

      {/* Conversation History Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden max-h-96 flex flex-col border border-blue-200 dark:border-blue-900 mb-3">
        <div className="bg-blue-500 text-white p-3 flex justify-between items-center">
          <h3 className="font-bold">Conversation History</h3>
        </div>
        <div className="overflow-y-auto max-h-64 p-3 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
              <p>No conversation recorded yet.</p>
              <p className="text-xs mt-2">Click the green AI Assistant button to start a conversation.</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={cn(
                "pb-2 text-sm border-b border-gray-200 dark:border-gray-700",
                message.isSystem && "italic text-gray-500"
              )}>
                <div className={cn(
                  "font-medium break-words",
                  message.isAiMessage 
                    ? "text-blue-600 dark:text-blue-400" 
                    : message.isSystem 
                      ? "text-gray-500 dark:text-gray-400" 
                      : "text-gray-800 dark:text-gray-200"
                )}>
                  {message.isSystem ? "System: " : message.isAiMessage ? "AI: " : "You: "}
                  {message.text}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {currentVideo && currentVideo.video_url && (
        <div className={cn(
          "mb-4 transform transition-all duration-300 ease-in-out shadow-lg rounded-lg overflow-hidden",
          isVideoVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          <VideoPlayer 
            key={`video-${currentVideo.id}-${Date.now()}`}
            videoUrl={currentVideo.video_url} 
            videoName={currentVideo.video_name || `Video related to "${currentVideo.keyword}"`}
            onEnded={() => console.log("Video playback ended")}
            onError={handleVideoError}
            onClose={handleVideoClose}
          />
        </div>
      )}
    </div>
  );
};

export default TranscriptListener;
