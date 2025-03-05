
import React, { useEffect, useState } from 'react';
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
          title: "AI Message Received",
          description: "Processing message to find relevant videos...",
          duration: 3000,
        });
      }
    };

    // Setup event listener
    window.addEventListener('vapi_message', captureAiMessages);
    console.log("TranscriptListener: Set up vapi_message event listener");

    return () => {
      window.removeEventListener('vapi_message', captureAiMessages);
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
    <div className={cn("fixed right-4 bottom-24 w-80 transition-all", className)}>
      {currentVideo && currentVideo.video_url && (
        <div className={cn(
          "mb-4 transform transition-all duration-300 ease-in-out",
          isVideoVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          <VideoPlayer 
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
