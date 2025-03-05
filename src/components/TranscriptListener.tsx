
import React, { useEffect, useState } from 'react';
import { useConversationHistory } from '@/hooks/useConversationHistory';
import VideoPlayer from './VideoPlayer';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, X } from 'lucide-react';

interface TranscriptListenerProps {
  className?: string;
}

const TranscriptListener: React.FC<TranscriptListenerProps> = ({ className }) => {
  const { addMessage, currentVideo, errorLogs, clearErrorLogs } = useConversationHistory();
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const [showErrorLog, setShowErrorLog] = useState(false);
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

  // Format timestamp for human readability
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  return (
    <div className={cn("fixed right-4 bottom-24 w-80 z-50 transition-all", className)}>
      {/* Error log toggle button */}
      <div className="mb-3 flex justify-end">
        <button 
          onClick={() => setShowErrorLog(!showErrorLog)}
          className={cn(
            "p-2 rounded-full shadow-lg transition-colors",
            showErrorLog 
              ? "bg-red-600 text-white hover:bg-red-700" 
              : "bg-amber-500 text-white hover:bg-amber-600",
            errorLogs.length === 0 && "opacity-50 cursor-not-allowed"
          )}
          disabled={errorLogs.length === 0}
          title={showErrorLog ? "Hide error log" : "Show error log"}
        >
          <AlertTriangle size={20} />
        </button>
      </div>

      {/* Error log panel */}
      {showErrorLog && errorLogs.length > 0 && (
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden max-h-96 flex flex-col border border-red-200 dark:border-red-900">
          <div className="bg-red-500 text-white p-3 flex justify-between items-center">
            <h3 className="font-bold">Video Search Error Log</h3>
            <div className="flex gap-2">
              <button 
                onClick={clearErrorLogs}
                className="p-1 rounded hover:bg-red-600 text-white text-xs"
                title="Clear all logs"
              >
                Clear
              </button>
              <button 
                onClick={() => setShowErrorLog(false)}
                className="p-1 rounded hover:bg-red-600 text-white"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-64 p-3 space-y-3">
            {errorLogs.map((log, index) => (
              <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-2 text-sm">
                <div className="font-semibold text-red-600 dark:text-red-400">{log.message}</div>
                <div className="text-gray-600 dark:text-gray-300">Keyword: "{log.keyword}"</div>
                <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">{formatTimestamp(log.timestamp)}</div>
                <div className="text-gray-800 dark:text-gray-200 text-xs mt-1 bg-gray-100 dark:bg-gray-700 p-1 rounded">
                  {log.details}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video player */}
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
