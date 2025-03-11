
import React, { useEffect, useState, useCallback } from 'react';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';
import { cn } from '@/lib/utils';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NativeSpeechRecorderProps {
  className?: string;
}

const NativeSpeechRecorder: React.FC<NativeSpeechRecorderProps> = ({ className }) => {
  const {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    isSupported,
    resetTranscript
  } = useSpeechRecognition({
    continuous: true,
    language: 'en-US'
  });
  
  const [showTranscript, setShowTranscript] = useState(false);
  
  const handleToggleRecording = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  }, [isListening, startListening, stopListening, resetTranscript]);
  
  useEffect(() => {
    if (transcript) {
      setShowTranscript(true);
      
      // Hide transcript after 5 seconds
      const timer = setTimeout(() => {
        setShowTranscript(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [transcript]);
  
  if (!isSupported) {
    return null;
  }
  
  return (
    <div className={cn("fixed bottom-4 left-4 z-50 flex flex-col items-start", className)}>
      {showTranscript && transcript && (
        <div className="mb-2 bg-white rounded-lg p-3 shadow-lg max-w-xs text-sm animate-fade-in">
          <p className="font-medium text-gray-700">Last transcript:</p>
          <p className="text-gray-900">{transcript}</p>
        </div>
      )}
      
      {error && (
        <div className="mb-2 bg-red-50 text-red-700 rounded-lg p-2 shadow-lg text-xs max-w-xs">
          {error}
        </div>
      )}
      
      <Button
        onClick={handleToggleRecording}
        className={cn(
          "p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110",
          isListening 
            ? "bg-red-500 hover:bg-red-600 animate-pulse" 
            : "bg-green-500 hover:bg-green-600"
        )}
        aria-label={isListening ? "Stop recording" : "Start recording"}
      >
        <div className="flex items-center gap-2">
          {isListening ? (
            <>
              <MicOff className="h-5 w-5" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" />
              <span>Record</span>
            </>
          )}
        </div>
      </Button>
      
      <div className="mt-2 text-xs text-gray-600 bg-white/80 rounded px-2 py-1">
        Native Speech API
      </div>
    </div>
  );
};

export default NativeSpeechRecorder;
