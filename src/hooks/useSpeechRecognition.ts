
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
const TRANSCRIPT_KEY = 'transcript';

// Clean transcript by removing duplicate words
const cleanTranscript = (text: string): string => {
  if (!text) return '';
  
  // Convert to lowercase and trim
  let cleaned = text.toLowerCase().trim();
  
  // Split by spaces
  const words = cleaned.split(/\s+/);
  
  // Remove consecutive duplicate words
  const deduplicatedWords: string[] = [];
  for (let i = 0; i < words.length; i++) {
    // Only add if it's different from the previous word
    if (i === 0 || words[i] !== words[i - 1]) {
      deduplicatedWords.push(words[i]);
    }
  }
  
  return deduplicatedWords.join(' ');
};

// Track processed transcripts across hook instances
const processedTranscripts = new Set<string>();
let lastSaveTimestamp = 0;
const SAVE_DEBOUNCE_TIME = 1000; // 1 second between saves

const useSpeechRecognition = (options: SpeechRecognitionOptions = {}): UseSpeechRecognitionReturn => {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isRecognitionSupported = useRef<boolean>(false);
  const lastSavedTranscriptRef = useRef<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shouldDispatchEventsRef = useRef<boolean>(true);
  const instanceId = useRef<string>(`speech-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

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
        console.log(`[useSpeechRecognition:${instanceId.current}] Speech recognition is supported in this browser`);
      }
    }
    
    return () => {
      // Clean up any event listeners or timers
      shouldDispatchEventsRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [toast]);

  const saveTranscriptToLocalStorage = useCallback((text: string) => {
    if (!text.trim() || !shouldDispatchEventsRef.current) return;
    
    try {
      // Clean the transcript before saving
      const cleanedText = cleanTranscript(text);
      
      // Don't save if it's the same as the last saved transcript
      if (cleanedText === lastSavedTranscriptRef.current) {
        console.log(`[useSpeechRecognition:${instanceId.current}] Skipping duplicate transcript:`, cleanedText);
        return;
      }
      
      // Check if this transcript has been processed recently
      if (processedTranscripts.has(cleanedText)) {
        console.log(`[useSpeechRecognition:${instanceId.current}] Skipping already processed transcript:`, cleanedText);
        return;
      }
      
      // Debounce saving to avoid rapid succession saves
      const now = Date.now();
      if (now - lastSaveTimestamp < SAVE_DEBOUNCE_TIME) {
        console.log(`[useSpeechRecognition:${instanceId.current}] Debouncing transcript save:`, cleanedText);
        
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        
        debounceTimerRef.current = setTimeout(() => {
          if (shouldDispatchEventsRef.current) {
            saveTranscriptToLocalStorage(text);
          }
        }, SAVE_DEBOUNCE_TIME);
        
        return;
      }
      
      lastSaveTimestamp = now;
      lastSavedTranscriptRef.current = cleanedText;
      processedTranscripts.add(cleanedText);
      
      // Remove from processed set after 5 seconds to allow re-processing later
      setTimeout(() => {
        processedTranscripts.delete(cleanedText);
      }, 5000);
      
      console.log(`[useSpeechRecognition:${instanceId.current}] Saving cleaned transcript to localStorage:`, cleanedText);
      
      // First, save to transcript key for immediate video search
      localStorage.setItem(TRANSCRIPT_KEY, cleanedText);
      
      // Save to native_voice_input_history
      const nativeInputsStr = localStorage.getItem(NATIVE_VOICE_INPUT_KEY);
      let savedInputs = [];
      
      try {
        if (nativeInputsStr) {
          const parsed = JSON.parse(nativeInputsStr);
          savedInputs = Array.isArray(parsed) ? parsed : [];
        }
      } catch (parseError) {
        console.error(`[useSpeechRecognition:${instanceId.current}] Error parsing existing inputs, resetting:`, parseError);
        savedInputs = [];
      }
      
      const newInput = {
        text: cleanedText,
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
        console.error(`[useSpeechRecognition:${instanceId.current}] Error parsing standard inputs, resetting:`, parseError);
        standardInputs = [];
      }
      
      localStorage.setItem(
        VOICE_INPUT_KEY,
        JSON.stringify([newInput, ...standardInputs].slice(0, 50))
      );
      
      console.log(`[useSpeechRecognition:${instanceId.current}] Successfully saved voice input to localStorage:`, cleanedText);
      
      // Only dispatch if we're not cleaning up
      if (shouldDispatchEventsRef.current) {
        // Dispatch custom event for the system to capture
        window.dispatchEvent(new CustomEvent('voice_input', {
          detail: {
            type: 'voice_input',
            text: cleanedText
          }
        }));
      }
    } catch (e) {
      console.error(`[useSpeechRecognition:${instanceId.current}] Error saving voice input to localStorage:`, e);
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
      console.log(`[useSpeechRecognition:${instanceId.current}] Starting speech recognition...`);
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
          console.log(`[useSpeechRecognition:${instanceId.current}] Initialized empty native voice input history`);
        }
        
        if (!localStorage.getItem(VOICE_INPUT_KEY)) {
          localStorage.setItem(VOICE_INPUT_KEY, '[]');
          console.log(`[useSpeechRecognition:${instanceId.current}] Initialized empty standard voice input history`);
        }
      } catch (storageError) {
        console.error(`[useSpeechRecognition:${instanceId.current}] Error initializing localStorage:`, storageError);
      }
      
      // Event handlers
      recognitionRef.current.onstart = () => {
        console.log(`[useSpeechRecognition:${instanceId.current}] Native speech recognition started`);
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

        // not updating with old transcript, instead replacing for current speech search
        // Update transcript with both final and interim results
        setTranscript(prev => {
          // For final transcripts, append to previous with space
          let newTranscript = prev;
          
          if (finalTranscript) {
            newTranscript = prev ? `${prev} ${finalTranscript}` : finalTranscript;
            
            // Save final transcripts immediately
            if (newTranscript.trim() && finalTranscript.trim()) {
              saveTranscriptToLocalStorage(finalTranscript);
            }
          }
          
          // For interim results, show but don't save yet
          if (currentTranscript) {
            newTranscript = prev ? `${prev} ${currentTranscript}` : currentTranscript;
          }
          
          return finalTranscript;
        });
      };
      
      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error(`[useSpeechRecognition:${instanceId.current}] Speech recognition error:`, event.error, event.message);
        setError(`Error: ${event.error} - ${event.message || 'Unknown error'}`);
        toast({
          variant: "destructive",
          title: "Recording Error",
          description: `Error: ${event.error}. Please try again.`,
          duration: 3000,
        });
      };
      
      recognitionRef.current.onend = () => {
        console.log(`[useSpeechRecognition:${instanceId.current}] Speech recognition ended`);
        setIsListening(false);
        
        toast({
          title: "Recording Stopped",
          description: "Voice recording has been stopped.",
          duration: 3000,
        });
        
        // If we have a transcript, make sure it gets saved and dispatched
        if (transcript.trim()) {
          console.log(`[useSpeechRecognition:${instanceId.current}] Saving final transcript on end:`, transcript);
          saveTranscriptToLocalStorage(transcript);
        }
      };
      
      recognitionRef.current.start();
      console.log(`[useSpeechRecognition:${instanceId.current}] Recognition started successfully`);
    } catch (err: any) {
      console.error(`[useSpeechRecognition:${instanceId.current}] Failed to start speech recognition:`, err);
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
      console.log(`[useSpeechRecognition:${instanceId.current}] Stopping speech recognition`);
      recognitionRef.current.stop();
      setIsListening(false);
      
      // Cancel any pending debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // One last save on manual stop
      if (transcript.trim()) {
        console.log(`[useSpeechRecognition:${instanceId.current}] Saving transcript on manual stop:`, transcript);
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
    lastSavedTranscriptRef.current = '';
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      shouldDispatchEventsRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
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
