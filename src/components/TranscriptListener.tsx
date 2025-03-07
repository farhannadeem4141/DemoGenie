import React, { useEffect, useState } from 'react';
import { useConversationHistory } from '@/hooks/useConversationHistory';
import VideoPlayer from './VideoPlayer';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, X, Mic, MicOff, Bug } from 'lucide-react';
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
  const { addMessage, currentVideo, setCurrentVideo, errorLogs, clearErrorLogs } = useConversationHistory();
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const [showErrorLog, setShowErrorLog] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [voiceInputHistory, setVoiceInputHistory] = useState<{text: string, timestamp: number}[]>([]);
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
    
    const handlePossibleAssistantButtonClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      if (target && 
          (target.style.backgroundColor === 'rgb(37, 211, 102)' || 
           target.getAttribute('style')?.includes('rgb(37, 211, 102)') ||
           target.textContent?.includes('AI Assistant'))) {
        console.log("Possible AI Assistant button clicked");
        
        try {
          if (!localStorage.getItem('voice_input_history')) {
            localStorage.setItem('voice_input_history', JSON.stringify([]));
            console.log("Initialized empty voice input history from button click handler");
          }
        } catch (e) {
          console.error("Error checking localStorage:", e);
        }
      }
    };
    
    document.addEventListener('click', handlePossibleAssistantButtonClick);
    
    return () => {
      document.removeEventListener('click', handlePossibleAssistantButtonClick);
      clearInterval(buttonStateInterval);
    };
  }, [recordingStatus]);

  useEffect(() => {
    const captureAiMessages = (event: any) => {
      if (event.detail && event.detail.type === 'ai_message' && event.detail.text) {
        console.log("Received AI message:", event.detail.text);
        
        addMessage(event.detail.text);
        
        toast({
          title: "Message Received",
          description: "Processing message to find relevant videos...",
          duration: 3000,
        });
      }
    };

    const captureVoiceInput = async (event: any) => {
      if (event.detail && event.detail.type === 'voice_input' && event.detail.text) {
        const newVoiceInput = {
          text: event.detail.text,
          timestamp: Date.now()
        };
        setVoiceInputHistory(prev => [newVoiceInput, ...prev].slice(0, 20));
        
        try {
          const savedInputs = JSON.parse(localStorage.getItem('voice_input_history') || '[]');
          localStorage.setItem('voice_input_history', JSON.stringify([newVoiceInput, ...savedInputs].slice(0, 50)));
        } catch (e) {
          console.error('Error saving voice input to localStorage:', e);
        }
        
        console.log("%c [VOICE LOG] ========== NEW VOICE INPUT ==========", "background: #2a9d8f; color: white; padding: 4px; border-radius: 4px; font-weight: bold;");
        console.log("%c [VOICE LOG] Raw voice input: " + event.detail.text, "background: #2a9d8f; color: white; padding: 2px; border-radius: 4px;");
        console.log("%c [VOICE LOG] Timestamp: " + new Date().toISOString(), "background: #2a9d8f; color: white; padding: 2px; border-radius: 4px;");
        console.log("%c [VOICE LOG] Input length: " + event.detail.text.length + " characters", "background: #2a9d8f; color: white; padding: 2px; border-radius: 4px;");
        
        const inputText = event.detail.text;
        console.log("%c [VOICE LOG] Original case: " + inputText, "background: #2a9d8f; color: white; padding: 2px; border-radius: 4px;");
        console.log("%c [VOICE LOG] Lowercase: " + inputText.toLowerCase(), "background: #2a9d8f; color: white; padding: 2px; border-radius: 4px;");
        console.log("%c [VOICE LOG] Uppercase: " + inputText.toUpperCase(), "background: #2a9d8f; color: white; padding: 2px; border-radius: 4px;");
        
        const specificKeywords = ["Business Profile", "business profile", "BUSINESS PROFILE", "Business profile"];
        specificKeywords.forEach(keyword => {
          console.log(`%c [VOICE LOG] Contains "${keyword}"? ${inputText.includes(keyword)}`, 
            "background: #2a9d8f; color: white; padding: 2px; border-radius: 4px;");
          console.log(`%c [VOICE LOG] Contains "${keyword}" (case insensitive)? ${inputText.toLowerCase().includes(keyword.toLowerCase())}`, 
            "background: #2a9d8f; color: white; padding: 2px; border-radius: 4px;");
        });
        
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
        
        addMessage(event.detail.text);
        
        toast({
          title: "Voice Input Received",
          description: `Processing: "${event.detail.text.substring(0, 30)}${event.detail.text.length > 30 ? '...' : ''}"`,
          duration: 3000,
        });
      }
    };

    const handleRecordingStatusChange = (event: any) => {
      if (event.detail && typeof event.detail.isActive === 'boolean') {
        console.log("%c [RECORDING] Status changed to: " + (event.detail.isActive ? "ACTIVE" : "INACTIVE"), 
          "background: #e63946; color: white; padding: 2px; border-radius: 4px;");
        setRecordingStatus(event.detail.isActive);
        
        if (event.detail.isActive) {
          try {
            if (!localStorage.getItem('voice_input_history')) {
              localStorage.setItem('voice_input_history', JSON.stringify([]));
              console.log("Initialized empty voice input history from recording status change");
            }
          } catch (e) {
            console.error('Error initializing voice input history:', e);
          }
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

  useEffect(() => {
    try {
      const savedInputs = JSON.parse(localStorage.getItem('voice_input_history') || '[]');
      if (savedInputs.length > 0) {
        console.log("Loaded voice input history from localStorage:", savedInputs);
      } else {
        console.log("No voice input history found in localStorage");
        localStorage.setItem('voice_input_history', JSON.stringify([]));
      }
      setVoiceInputHistory(savedInputs);
    } catch (e) {
      console.error('Error loading voice input history from localStorage:', e);
      localStorage.setItem('voice_input_history', JSON.stringify([]));
    }
  }, []);

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

  const simulateVoiceInput = (text: string) => {
    console.log("%c [VOICE LOG] Simulating voice input: " + text, "background: #2a9d8f; color: white; padding: 2px; border-radius: 4px;");
    window.dispatchEvent(new CustomEvent('voice_input', {
      detail: {
        type: 'voice_input',
        text: text
      }
    }));
  };

  const testCatalogKeyword = () => {
    console.log("%c [VOICE LOG] Testing catalog keyword specifically", "background: #e76f51; color: white; padding: 2px; border-radius: 4px;");
    simulateVoiceInput("catalog");
  };

  const testBusinessProfile = () => {
    console.log("%c [VOICE LOG] Testing 'Business Profile' keyword specifically", "background: #f4a261; color: white; padding: 2px; border-radius: 4px;");
    simulateVoiceInput("Business Profile");
  };

  const clearVoiceInputHistory = () => {
    setVoiceInputHistory([]);
    localStorage.removeItem('voice_input_history');
    console.log("Voice input history cleared");
    toast({
      title: "History Cleared",
      description: "Voice input history has been cleared",
      duration: 3000,
    });
  };

  const testRecordingStatusEvent = (isActive: boolean) => {
    console.log(`Testing recording status event: ${isActive ? 'ACTIVE' : 'INACTIVE'}`);
    window.dispatchEvent(new CustomEvent('recording_status_change', {
      detail: { isActive }
    }));
  };

  const debugVapiConnection = () => {
    console.log("Debugging Vapi connection...");
    try {
      if (window.vapiInstance) {
        console.log("Found global Vapi instance:", window.vapiInstance);
        toast({
          title: "Vapi Debug",
          description: "Vapi instance found, check console for details",
          duration: 3000,
        });
        
        if (window.activateRecording) {
          console.log("Found global activateRecording function, calling it");
          window.activateRecording();
        }
      } else {
        console.log("No global Vapi instance found");
        toast({
          variant: "destructive",
          title: "Vapi Debug",
          description: "No Vapi instance found",
          duration: 3000,
        });
      }
    } catch (e) {
      console.error("Error debugging Vapi:", e);
    }
  };

  return (
    <div className={cn("fixed right-4 bottom-24 w-80 z-50 transition-all", className)}>
      {recordingStatus && (
        <div className="mb-3 flex items-center justify-center bg-red-500 text-white p-2 rounded-lg shadow-lg animate-pulse">
          <Mic className="mr-2" size={16} /> Recording Active
        </div>
      )}

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
        
        {showErrorLog && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden max-h-96 flex flex-col border border-blue-200 dark:border-blue-900 mb-3">
            <div className="bg-blue-500 text-white p-3 flex justify-between items-center">
              <h3 className="font-bold">Voice Input History</h3>
              <button 
                onClick={clearVoiceInputHistory}
                className="p-1 rounded hover:bg-blue-600 text-white text-xs"
                title="Clear history"
              >
                Clear
              </button>
            </div>
            <div className="overflow-y-auto max-h-64 p-3 space-y-3">
              {voiceInputHistory.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                  <MicOff className="mx-auto mb-2" size={24} />
                  <p>No voice inputs recorded yet.</p>
                  <p className="text-xs mt-2">Click the green AI Assistant button to start recording.</p>
                </div>
              ) : (
                voiceInputHistory.map((input, index) => (
                  <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-2 text-sm">
                    <div className="font-medium text-gray-800 dark:text-gray-200 break-words">{input.text}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">{formatTimestamp(input.timestamp)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mb-3">
        <button 
          onClick={() => setShowDebugPanel(!showDebugPanel)}
          className={cn(
            "p-2 rounded-lg shadow-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors w-full mb-2",
            showDebugPanel && "bg-purple-700"
          )}
        >
          {showDebugPanel ? "Hide Debug Panel" : "Show Debug Panel"}
        </button>
        
        {showDebugPanel && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden max-h-96 flex flex-col border border-purple-200 dark:border-purple-900 mb-3">
            <div className="bg-purple-500 text-white p-3">
              <h3 className="font-bold">Debug Controls</h3>
            </div>
            <div className="p-3 space-y-2">
              <button 
                onClick={() => testRecordingStatusEvent(true)}
                className="bg-green-500 text-white p-2 rounded w-full hover:bg-green-600"
              >
                Test Start Recording
              </button>
              <button 
                onClick={() => testRecordingStatusEvent(false)}
                className="bg-red-500 text-white p-2 rounded w-full hover:bg-red-600"
              >
                Test Stop Recording
              </button>
              <button 
                onClick={debugVapiConnection}
                className="bg-blue-500 text-white p-2 rounded w-full hover:bg-blue-600"
              >
                Debug Vapi Connection
              </button>
              <button 
                onClick={() => window.activateRecording && window.activateRecording()}
                className="bg-green-500 text-white p-2 rounded w-full hover:bg-green-600"
              >
                Activate Recording (Global)
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Current recording status: {recordingStatus ? "ACTIVE" : "INACTIVE"}
              </p>
              <p className="text-xs text-gray-500">
                isRecording prop: {isRecording ? "true" : "false"}
              </p>
              <div className="mt-3">
                <h4 className="font-medium text-sm mb-1">Application Debug Logs:</h4>
                <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded-lg max-h-40 overflow-y-auto text-xs">
                  {debugLogs.length === 0 ? (
                    <p className="text-gray-500">No debug logs available</p>
                  ) : (
                    <ul className="space-y-1">
                      {debugLogs.map((log, i) => (
                        <li key={i} className="text-gray-800 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">{log}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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
          onClick={debugVapiConnection}
          className="p-2 rounded-full shadow-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
          title="Debug Vapi Connection"
        >
          <Bug size={20} />
          <span className="sr-only">Debug Vapi</span>
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
