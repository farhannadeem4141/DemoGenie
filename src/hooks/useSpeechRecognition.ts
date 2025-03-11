
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
        (window as any).SpeechRecognition || 
        (window as any).webkitSpeechRecognition
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
      }
    }
  }, [toast]);

  const saveTranscriptToLocalStorage = useCallback((text: string) => {
    if (!text.trim()) return;
    
    try {
      const savedInputs = JSON.parse(localStorage.getItem('native_voice_input_history') || '[]');
      const newInput = {
        text,
        timestamp: Date.now(),
        source: 'native' // Mark this as coming from the native API, not Vapi
      };
      
      localStorage.setItem(
        'native_voice_input_history', 
        JSON.stringify([newInput, ...savedInputs].slice(0, 50))
      );
      
      // Also save to the standard voice_input_history for compatibility
      const standardInputs = JSON.parse(localStorage.getItem('voice_input_history') || '[]');
      localStorage.setItem(
        'voice_input_history',
        JSON.stringify([newInput, ...standardInputs].slice(0, 50))
      );
      
      console.log("Saved native voice input to localStorage:", text);
    } catch (e) {
      console.error('Error saving native voice input to localStorage:', e);
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
      // Use type assertion here to handle the Speech Recognition constructor
      const SpeechRecognitionConstructor = (window as any).SpeechRecognition || 
                                          (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognitionConstructor) {
        throw new Error('Speech recognition not available');
      }
      
      recognitionRef.current = new SpeechRecognitionConstructor();
      
      // Apply options
      recognitionRef.current.continuous = options.continuous ?? true;
      recognitionRef.current.interimResults = options.interimResults ?? true;
      recognitionRef.current.lang = options.language ?? 'en-US';
      recognitionRef.current.maxAlternatives = options.maxAlternatives ?? 1;
      
      // Event handlers
      recognitionRef.current.onstart = () => {
        console.log('Native speech recognition started');
        setIsListening(true);
        toast({
          title: "Native Recording Started",
          description: "Speak now. Your voice is being recorded.",
          duration: 3000,
        });
      };
      
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            currentTranscript += result[0].transcript;
          }
        }
        
        if (currentTranscript.trim()) {
          console.log('Speech recognized:', currentTranscript);
          setTranscript(prev => {
            const newTranscript = prev ? `${prev} ${currentTranscript}` : currentTranscript;
            return newTranscript;
          });
          
          // Save transcript immediately when we get results
          saveTranscriptToLocalStorage(currentTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error, event.message);
        setError(`Error: ${event.error} - ${event.message || 'Unknown error'}`);
        toast({
          variant: "destructive",
          title: "Recording Error",
          description: `Error: ${event.error}. Please try again.`,
          duration: 3000,
        });
      };
      
      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
        
        toast({
          title: "Recording Stopped",
          description: "Voice recording has been stopped.",
          duration: 3000,
        });
        
        // If we have a transcript, make sure it gets dispatched
        if (transcript.trim()) {
          window.dispatchEvent(new CustomEvent('voice_input', {
            detail: {
              type: 'voice_input',
              text: transcript
            }
          }));
        }
      };
      
      recognitionRef.current.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
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
      recognitionRef.current.stop();
      setIsListening(false);
      
      toast({
        title: "Recording Stopped",
        description: "Voice recording has been stopped.",
        duration: 3000,
      });
    }
  }, [toast]);

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
