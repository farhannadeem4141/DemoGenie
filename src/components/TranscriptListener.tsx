
import React, { useEffect } from 'react';
import { useConversationHistory } from '@/hooks/useConversationHistory';
import VideoPlayer from './VideoPlayer';
import { cn } from '@/lib/utils';

interface TranscriptListenerProps {
  className?: string;
}

const TranscriptListener: React.FC<TranscriptListenerProps> = ({ className }) => {
  const { addMessage, currentVideo } = useConversationHistory();

  // Listen for messages from the AI assistant via window event
  useEffect(() => {
    // This function will capture the AI messages
    const captureAiMessages = (event: any) => {
      if (event.detail && event.detail.type === 'ai_message' && event.detail.text) {
        addMessage(event.detail.text);
      }
    };

    // Setup event listener
    window.addEventListener('vapi_message', captureAiMessages);

    return () => {
      window.removeEventListener('vapi_message', captureAiMessages);
    };
  }, [addMessage]);

  return (
    <div className={cn("fixed right-4 bottom-24 w-80 transition-all", className)}>
      {currentVideo && currentVideo.video_url && (
        <div className="animate-fade-up mb-4">
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
