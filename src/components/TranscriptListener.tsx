
import React, { useEffect, useState } from 'react';
import { useConversationHistory } from '@/hooks/useConversationHistory';
import VideoPlayer from './VideoPlayer';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, X, Mic } from 'lucide-react';
import { queryVideosWithCatalogTag } from '@/services/video';

interface TranscriptListenerProps {
  className?: string;
}

const TranscriptListener: React.FC<TranscriptListenerProps> = ({ className }) => {
  const { addMessage, currentVideo, setCurrentVideo, errorLogs, clearErrorLogs } = useConversationHistory();
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const [showErrorLog, setShowErrorLog] = useState(false);
  const [voiceInputHistory, setVoiceInputHistory] = useState<{text: string, timestamp: number}[]>([]);
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
    const captureVoiceInput = async (event: any) => {
      if (event.detail && event.detail.type === 'voice_input' && event.detail.text) {
        // Save to voice input history for debugging
        const newVoiceInput = {
          text: event.detail.text,
          timestamp: Date.now()
        };
        setVoiceInputHistory(prev => [newVoiceInput, ...prev].slice(0, 20));
        
        // Save to localStorage for persistence
        try {
          const savedInputs = JSON.parse(localStorage.getItem('voice_input_history') || '[]');
          localStorage.setItem('voice_input_history', JSON.stringify([newVoiceInput, ...savedInputs].slice(0, 50)));
        } catch (e) {
          console.error('Error saving voice input to localStorage:', e);
        }
        
        // Enhanced logging for voice input debugging
        console.log("%c [VOICE LOG] ========== NEW VOICE INPUT ==========", "background: #2a9d8f; color: white; padding: 4px; border-radius: 4px; font-weight: bold;");
        console.log("%c [VOICE LOG] Raw voice input: " + event.detail.text, "background: #2a9d8f; color: white; padding: 2px; border-radius: 4px;");
        console.log("%c [VOICE LOG] Timestamp: " + new Date().toISOString(), "background: #2a9d8f; color: white; padding: 2px; border-radius: 4px;");
        console.log("%c [VOICE LOG] Input length: " + event.detail.text.length + " characters", "background: #2a9d8f; color: white; padding: 2px; border-radius: 4px;");
        
        // Log for case sensitivity debugging
        const inputText = event.detail.text;
        console.log("%c [VOICE LOG] Original case: " + inputText, "background: #2a9d8f; color: white; padding: 2px; border-radius: 4px;");
        console.log("%c [VOICE LOG] Lowercase: " + inputText.toLowerCase(), "background: #2a9d8f; color: white; padding: 2px; border-radius: 4px;");
        console.log("%c [VOICE LOG] Uppercase: " + inputText.toUpperCase(), "background: #2a9d8f; color: white; padding: 2px; border-radius: 4px;");
        
        // Check specific keyword matches
        const specificKeywords = ["Business Profile", "business profile", "BUSINESS PROFILE", "Business profile"];
        specificKeywords.forEach(keyword => {
          console.log(`%c [VOICE LOG] Contains "${keyword}"? ${inputText.includes(keyword)}`, 
            "background: #2a9d8f; color: white; padding: 2px; border-radius: 4px;");
          console.log(`%c [VOICE LOG] Contains "${keyword}" (case insensitive)? ${inputText.toLowerCase().includes(keyword.toLowerCase())}`, 
            "background: #2a9d8f; color: white; padding: 2px; border-radius: 4px;");
        });
        
        // Word by word analysis
        const words = inputText.split(/\s+/);
        console.log("%c [VOICE LOG] Words in input: " + words.join(', '), 
          "background: #2a9d8f; color: white; padding: 2px; border-radius: 4px;");
        
        // Special handling for catalog keyword
        if (inputText.toLowerCase().includes('catalog')) {
          console.log("%c [VOICE LOG] Catalog keyword detected, using specialized catalog query", "background: #e76f51; color: white; padding: 2px; border-radius: 4px;");
          try {
            const result = await queryVideosWithCatalogTag();
            console.log("%c [VOICE LOG] Catalog query result: ", "background: #e76f51; color: white; padding: 2px; border-radius: 4px;", result);
            if (result.success && result.data && result.data.length > 0) {
              const catalogVideo = {
                id: result.data[0].id,
                video_url: result.data[0].video_url,
                video_name: result.data[0].video_name || 'Catalog Feature',
                keyword: 'catalog'
              };
              console.log("%c [VOICE LOG] Setting catalog video directly:", "background: #e76f51; color: white; padding: 2px; border-radius: 4px;", catalogVideo);
              setCurrentVideo(catalogVideo);
              
              toast({
                title: "Catalog Video Found",
                description: `Now playing: ${catalogVideo.video_name}`,
                duration: 3000,
              });
              return;
            }
          } catch (error) {
            console.error("%c [VOICE LOG] Error in direct catalog query:", "background: #e63946; color: white; padding: 2px; border-radius: 4px;", error);
          }
        }
        
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
  }, [addMessage, toast, setCurrentVideo]);

  // Load voice input history from localStorage on component mount
  useEffect(() => {
    try {
      const savedInputs = JSON.parse(localStorage.getItem('voice_input_history') || '[]');
      setVoiceInputHistory(savedInputs);
    } catch (e) {
      console.error('Error loading voice input history from localStorage:', e);
    }
  }, []);

  // Handle video error
  const handleVideoError = () => {
    toast({
      variant: "destructive",
      title: "Video Error",
      description: "Failed to load the video. Please try again later.",
      duration: 5000,
    });
  };

  // Handle video close
  const handleVideoClose = () => {
    setIsVideoVisible(false);
    // Give time for the animation to finish before removing the video
    setTimeout(() => {
      setCurrentVideo(null);
    }, 300);
    
    toast({
      title: "Video Closed",
      description: "You can ask me more questions anytime.",
      duration: 3000,
    });
  };

  // Format timestamp for human readability
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  // Simulate voice input for testing purposes
  const simulateVoiceInput = (text: string) => {
    console.log("%c [VOICE LOG] Simulating voice input: " + text, "background: #2a9d8f; color: white; padding: 2px; border-radius: 4px;");
    window.dispatchEvent(new CustomEvent('voice_input', {
      detail: {
        type: 'voice_input',
        text: text
      }
    }));
  };

  // Add test buttons for different inputs
  const testCatalogKeyword = () => {
    console.log("%c [VOICE LOG] Testing catalog keyword specifically", "background: #e76f51; color: white; padding: 2px; border-radius: 4px;");
    simulateVoiceInput("catalog");
  };
  
  // Add a test specifically for Business Profile
  const testBusinessProfile = () => {
    console.log("%c [VOICE LOG] Testing 'Business Profile' keyword specifically", "background: #f4a261; color: white; padding: 2px; border-radius: 4px;");
    simulateVoiceInput("Business Profile");
  };

  return (
    <div className={cn("fixed right-4 bottom-24 w-80 z-50 transition-all", className)}>
      {/* Voice Input History Panel */}
      <div className="mb-3">
        <button 
          onClick={() => setShowErrorLog(!showErrorLog)}
          className={cn(
            "p-2 rounded-lg shadow-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors w-full mb-2",
            showErrorLog && "bg-blue-700"
          )}
        >
          {showErrorLog ? "Hide Voice Input History" : "Show Voice Input History"} ({voiceInputHistory.length})
        </button>
        
        {showErrorLog && voiceInputHistory.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden max-h-96 flex flex-col border border-blue-200 dark:border-blue-900 mb-3">
            <div className="bg-blue-500 text-white p-3 flex justify-between items-center">
              <h3 className="font-bold">Voice Input History</h3>
              <button 
                onClick={() => {
                  setVoiceInputHistory([]);
                  localStorage.removeItem('voice_input_history');
                }}
                className="p-1 rounded hover:bg-blue-600 text-white text-xs"
                title="Clear history"
              >
                Clear
              </button>
            </div>
            <div className="overflow-y-auto max-h-64 p-3 space-y-3">
              {voiceInputHistory.map((input, index) => (
                <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-2 text-sm">
                  <div className="font-medium text-gray-800 dark:text-gray-200 break-words">{input.text}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">{formatTimestamp(input.timestamp)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Test buttons for simulating voice input */}
      <div className="mb-3 flex justify-end gap-2">
        <button 
          onClick={() => simulateVoiceInput("Tell me about the catalog feature")}
          className="p-2 rounded-full shadow-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
          title="Test 'Catalog' voice input"
        >
          <Mic size={20} />
          <span className="sr-only">Test Catalog Voice Input</span>
        </button>
        
        <button 
          onClick={testCatalogKeyword}
          className="p-2 rounded-full shadow-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          title="Test just 'Catalog' keyword"
        >
          <Mic size={20} />
          <span className="sr-only">Test Catalog Keyword</span>
        </button>
        
        <button 
          onClick={testBusinessProfile}
          className="p-2 rounded-full shadow-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors"
          title="Test 'Business Profile' keyword"
        >
          <Mic size={20} />
          <span className="sr-only">Test Business Profile</span>
        </button>
        
        <button 
          onClick={() => simulateVoiceInput("Business profile")}
          className="p-2 rounded-full shadow-lg bg-pink-500 text-white hover:bg-pink-600 transition-colors"
          title="Test 'Business profile' (lowercase p) keyword"
        >
          <Mic size={20} />
          <span className="sr-only">Test Business profile</span>
        </button>
        
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
            onClose={handleVideoClose}
          />
        </div>
      )}
    </div>
  );
};

export default TranscriptListener;
