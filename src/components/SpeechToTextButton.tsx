
import React, { useState } from 'react';
import { Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';

const SpeechToTextButton = () => {
  const [isRecording, setIsRecording] = useState(false);
  const { toast } = useToast();
  const LOCAL_STORAGE_KEY = 'Test Audio 2.0';

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
    language: 'en-US',
    interimResults: true,
  });

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    if (!isSupported) {
      toast({
        variant: "destructive",
        title: "Browser Not Supported",
        description: "Speech recognition is not supported in your browser. Try Chrome, Edge, or Safari.",
        duration: 5000,
      });
      return;
    }
    
    console.log("Starting recording...");
    resetTranscript();
    startListening();
    setIsRecording(true);
    
    toast({
      title: "Recording Started",
      description: "Speak now. Your voice is being recorded.",
      duration: 3000,
    });
  };

  const stopRecording = () => {
    console.log("Stopping recording...");
    stopListening();
    setIsRecording(false);
    
    if (transcript && transcript.trim()) {
      try {
        // Save to local storage
        const audioEntry = {
          text: transcript,
          timestamp: Date.now()
        };
        
        // Get existing entries or create new array
        const existingEntries = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
        
        // Add new entry at the beginning
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify([audioEntry, ...existingEntries])
        );
        
        console.log("Transcript saved to localStorage:", transcript);
        
        // Show success toast
        toast({
          title: "Success",
          description: "Audio text was saved to local storage",
          duration: 3000,
        });
      } catch (e) {
        console.error("Error saving to localStorage:", e);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to save audio text to local storage",
          duration: 5000,
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "No Speech Detected",
        description: "No text was captured during recording",
        duration: 3000,
      });
    }
  };

  // Display errors
  React.useEffect(() => {
    if (error) {
      console.error("Speech recognition error:", error);
      toast({
        variant: "destructive",
        title: "Recording Error",
        description: error,
        duration: 3000,
      });
    }
  }, [error, toast]);

  return (
    <div className="fixed left-1/2 transform -translate-x-1/2" style={{ top: '300px' }}>
      <button
        onClick={toggleRecording}
        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full shadow-lg transition-all ${
          isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
        } text-white font-medium`}
      >
        <Phone className="h-5 w-5" />
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>
      
      {isRecording && (
        <div className="mt-3 text-center text-sm text-gray-600 animate-pulse">
          Recording... {transcript ? `"${transcript}"` : ''}
        </div>
      )}
    </div>
  );
};

export default SpeechToTextButton;
