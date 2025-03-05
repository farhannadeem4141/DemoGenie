
import React, { useEffect, useState, useRef } from 'react';
import { useConversationHistory } from '@/hooks/useConversationHistory';
import VideoPlayer from './VideoPlayer';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface TranscriptListenerProps {
  className?: string;
}

const TranscriptListener: React.FC<TranscriptListenerProps> = ({ className }) => {
  const { addMessage, currentVideo } = useConversationHistory();
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const { toast } = useToast();
  const hasTriggeredInitialTest = useRef(false);

  // Make video visible after a short delay to create a nice animation
  useEffect(() => {
    if (currentVideo) {
      console.log("Video available, preparing to show:", currentVideo);
      // Small delay for animation purposes
      const timer = setTimeout(() => {
        setIsVideoVisible(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setIsVideoVisible(false);
    }
  }, [currentVideo]);

  // Listen for messages from the AI assistant via window event
  useEffect(() => {
    // This function will capture the AI messages
    const captureAiMessages = (event: any) => {
      if (event.detail && event.detail.type === 'ai_message' && event.detail.text) {
        console.log("Received AI message:", event.detail.text);
        
        // Process the message to find matching videos
        addMessage(event.detail.text);
        
        // Show toast notification
        toast({
          title: "Message Received",
          description: "Processing message to find relevant videos...",
          duration: 3000,
        });
      }
    };

    // Set up another event listener specifically for voice input
    const captureVoiceInput = (event: any) => {
      if (event.detail && event.detail.type === 'voice_input' && event.detail.text) {
        console.log("Received voice input:", event.detail.text);
        
        // Process the voice input to find matching videos
        addMessage(event.detail.text);
        
        // Show toast notification
        toast({
          title: "Voice Input Received",
          description: `Processing: "${event.detail.text.substring(0, 30)}${event.detail.text.length > 30 ? '...' : ''}"`,
          duration: 3000,
        });
      }
    };

    // Setup event listeners
    window.addEventListener('vapi_message', captureAiMessages);
    window.addEventListener('voice_input', captureVoiceInput);
    
    console.log("TranscriptListener: Set up event listeners for vapi_message and voice_input");

    // Manually trigger a test for "whatsapp payment" - ONLY ONCE
    if (!hasTriggeredInitialTest.current) {
      hasTriggeredInitialTest.current = true;
      const timer = setTimeout(() => {
        console.log("Manually triggering search for 'whatsapp payment' - ONE TIME ONLY");
        window.dispatchEvent(new CustomEvent('voice_input', {
          detail: {
            type: 'voice_input',
            text: "whatsapp payment"
          }
        }));
      }, 2000);
      
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('vapi_message', captureAiMessages);
      window.removeEventListener('voice_input', captureVoiceInput);
    };
  }, [addMessage, toast]);

  // Handle video error
  const handleVideoError = () => {
    toast({
      variant: "destructive",
      title: "Video Error",
      description: "Failed to load the video. Please try again later.",
      duration: 5000,
    });
  };

  return (
    <div className={cn("fixed right-4 bottom-24 w-80 z-50 transition-all", className)}>
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
          />
        </div>
      )}
    </div>
  );
};

export default TranscriptListener;
