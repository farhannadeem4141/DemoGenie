
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SpeechRecognitionOptions {
  continuous?: boolean;
  language?: string;
  interimResults?: boolean;
  maxAlternatives?: number;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
  resetTranscript: () => void;
}

// Define the localStorage keys as constants to ensure consistency
const NATIVE_VOICE_INPUT_KEY = 'native_voice_input_history';
const VOICE_INPUT_KEY = 'voice_input_history';

const useSpeechRecognition = (options: SpeechRecognitionOptions = {}): UseSpeechRecognitionReturn => {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isRecognitionSupported = useRef<boolean>(false);

  // Check if speech recognition is supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      isRecognitionSupported.current = !!(
        window.SpeechRecognition || 
        window.webkitSpeechRecognition
      );
      
      if (!isRecognitionSupported.current) {
        console.error('Speech recognition not supported in this browser');
        setError('Speech recognition not supported in this browser');
        toast({
          variant: "destructive",
          title: "Browser Not Supported",
          description: "Speech recognition is not supported in your browser. Try using Chrome, Edge, or Safari.",
          duration: 5000,
        });
      } else {
        console.log("Speech recognition is supported in this browser");
      }
    }
  }, [toast]);

  const saveTranscriptToLocalStorage = useCallback((text: string) => {
    if (!text.trim()) return;
    
    try {
      console.log('[useSpeechRecognition] Saving transcript to localStorage:', text);
      
      // First, save to transcript key for immediate video search
      localStorage.setItem('transcript', text);
      
      // Save to native_voice_input_history
      const nativeInputsStr = localStorage.getItem(NATIVE_VOICE_INPUT_KEY);
      let savedInputs = [];
      
      try {
        if (nativeInputsStr) {
          const parsed = JSON.parse(nativeInputsStr);
          savedInputs = Array.isArray(parsed) ? parsed : [];
        }
      } catch (parseError) {
        console.error('[useSpeechRecognition] Error parsing existing inputs, resetting:', parseError);
        savedInputs = [];
      }
      
      const newInput = {
        text,
        timestamp: Date.now(),
        source: 'native' // Mark this as coming from the native API, not Vapi
      };
      
      localStorage.setItem(
        NATIVE_VOICE_INPUT_KEY, 
        JSON.stringify([newInput, ...savedInputs].slice(0, 50))
      );
      
      // Also save to the standard voice_input_history for compatibility
      const standardInputsStr = localStorage.getItem(VOICE_INPUT_KEY);
      let standardInputs = [];
      
      try {
        if (standardInputsStr) {
          const parsed = JSON.parse(standardInputsStr);
          standardInputs = Array.isArray(parsed) ? parsed : [];
        }
      } catch (parseError) {
        console.error('[useSpeechRecognition] Error parsing standard inputs, resetting:', parseError);
        standardInputs = [];
      }
      
      localStorage.setItem(
        VOICE_INPUT_KEY,
        JSON.stringify([newInput, ...standardInputs].slice(0, 50))
      );
      
      console.log("[useSpeechRecognition] Successfully saved voice input to localStorage:", text);
      console.log("[useSpeechRecognition] Current localStorage keys:", Object.keys(localStorage));
      
      // Dispatch custom event for the system to capture
      window.dispatchEvent(new CustomEvent('voice_input', {
        detail: {
          type: 'voice_input',
          text: text
        }
      }));
    } catch (e) {
      console.error('[useSpeechRecognition] Error saving voice input to localStorage:', e);
    }
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    
    if (!isRecognitionSupported.current) {
      setError('Speech recognition not supported');
      return;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    
    try {
      console.log("[useSpeechRecognition] Starting speech recognition...");
      // Use the correct constructor
      const SpeechRecognitionConstructor = window.SpeechRecognition || 
                                         window.webkitSpeechRecognition;
      
      if (!SpeechRecognitionConstructor) {
        throw new Error('Speech recognition not available');
      }
      
      recognitionRef.current = new SpeechRecognitionConstructor();
      
      // Apply options
      recognitionRef.current.continuous = options.continuous ?? true;
      recognitionRef.current.interimResults = options.interimResults ?? true;
      recognitionRef.current.lang = options.language ?? 'en-US';
      recognitionRef.current.maxAlternatives = options.maxAlternatives ?? 1;
      
      // Initialize empty storage if needed
      try {
        if (!localStorage.getItem(NATIVE_VOICE_INPUT_KEY)) {
          localStorage.setItem(NATIVE_VOICE_INPUT_KEY, '[]');
          console.log("[useSpeechRecognition] Initialized empty native voice input history");
        }
        
        if (!localStorage.getItem(VOICE_INPUT_KEY)) {
          localStorage.setItem(VOICE_INPUT_KEY, '[]');
          console.log("[useSpeechRecognition] Initialized empty standard voice input history");
        }
      } catch (storageError) {
        console.error("[useSpeechRecognition] Error initializing localStorage:", storageError);
      }
      
      // Event handlers
      recognitionRef.current.onstart = () => {
        console.log('[useSpeechRecognition] Native speech recognition started');
        setIsListening(true);
        setTranscript(''); // Clear transcript when starting new recording
        toast({
          title: "Native Recording Started",
          description: "Speak now. Your voice is being recorded.",
          duration: 3000,
        });
      };
      
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let currentTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            // This is an interim result
            currentTranscript += result[0].transcript;
          }
        }
        
        // Update transcript with both final and interim results
        setTranscript(prev => {
          // For final transcripts, append to previous with space
          let newTranscript = prev;
          
          if (finalTranscript) {
            newTranscript = prev ? `${prev} ${finalTranscript}` : finalTranscript;
          }
          
          // For interim results, use the current transcript as-is
          if (currentTranscript) {
            newTranscript = prev ? `${prev} ${currentTranscript}` : currentTranscript;
          }
          
          // Save transcript to localStorage in real-time, even for interim results
          if (newTranscript.trim()) {
            saveTranscriptToLocalStorage(newTranscript);
          }
          
          return newTranscript;
        });
      };
      
      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('[useSpeechRecognition] Speech recognition error:', event.error, event.message);
        setError(`Error: ${event.error} - ${event.message || 'Unknown error'}`);
        toast({
          variant: "destructive",
          title: "Recording Error",
          description: `Error: ${event.error}. Please try again.`,
          duration: 3000,
        });
      };
      
      recognitionRef.current.onend = () => {
        console.log('[useSpeechRecognition] Speech recognition ended');
        setIsListening(false);
        
        toast({
          title: "Recording Stopped",
          description: "Voice recording has been stopped.",
          duration: 3000,
        });
        
        // If we have a transcript, make sure it gets saved and dispatched
        if (transcript.trim()) {
          console.log("[useSpeechRecognition] Saving final transcript on end:", transcript);
          saveTranscriptToLocalStorage(transcript);
        }
      };
      
      recognitionRef.current.start();
      console.log("[useSpeechRecognition] Recognition started successfully");
    } catch (err: any) {
      console.error('[useSpeechRecognition] Failed to start speech recognition:', err);
      setError(`Failed to start: ${err.message || err}`);
      setIsListening(false);
      toast({
        variant: "destructive",
        title: "Recording Failed",
        description: "Could not start speech recognition. Please try again.",
        duration: 3000,
      });
    }
  }, [options, transcript, toast, saveTranscriptToLocalStorage]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      console.log("[useSpeechRecognition] Stopping speech recognition");
      recognitionRef.current.stop();
      setIsListening(false);
      
      // One last save on manual stop
      if (transcript.trim()) {
        console.log("[useSpeechRecognition] Saving transcript on manual stop:", transcript);
        saveTranscriptToLocalStorage(transcript);
      }
      
      toast({
        title: "Recording Stopped",
        description: "Voice recording has been stopped.",
        duration: 3000,
      });
    }
  }, [toast, transcript, saveTranscriptToLocalStorage]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    isSupported: isRecognitionSupported.current,
    resetTranscript
  };
};

export default useSpeechRecognition;
