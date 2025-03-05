
import React, { useEffect, useState } from 'react';
import { useConversationHistory } from '@/hooks/useConversationHistory';
import VideoPlayer from './VideoPlayer';
import { cn } from '@/lib/utils';

interface TranscriptListenerProps {
  className?: string;
}

const TranscriptListener: React.FC<TranscriptListenerProps> = ({ className }) => {
  const { addMessage, currentVideo } = useConversationHistory();
  const [isVideoVisible, setIsVideoVisible] = useState(false);

  // Make video visible after a short delay to create a nice animation
  useEffect(() => {
    if (currentVideo) {
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
        addMessage(event.detail.text);
      }
    };

    // Setup event listener
    window.addEventListener('vapi_message', captureAiMessages);

    return () => {
      window.removeEventListener('vapi_message', captureAiMessages);
    };
  }, [addMessage]);

  console.log("Current video:", currentVideo);

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
          />
        </div>
      )}
    </div>
  );
};

export default TranscriptListener;
