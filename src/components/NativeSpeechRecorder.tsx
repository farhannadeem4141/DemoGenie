
import React, { useEffect, useCallback, useRef } from 'react';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';
import { useToast } from '@/hooks/use-toast';
import VapiButtonManager from '@/utils/vapiButtonManager';

interface NativeSpeechRecorderProps {
  className?: string;
}

// Define the localStorage keys as constants to ensure consistency
const NATIVE_VOICE_INPUT_KEY = 'native_voice_input_history';
const VOICE_INPUT_KEY = 'voice_input_history';

const NativeSpeechRecorder: React.FC<NativeSpeechRecorderProps> = () => {
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
  
  const { toast } = useToast();
  const isTrackingVapiButton = useRef(false);
  const lastTranscriptRef = useRef('');
  const transcriptDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const buttonManager = useRef<VapiButtonManager | null>(null);
  
  // Update ref when transcript changes
  useEffect(() => {
    lastTranscriptRef.current = transcript;
  }, [transcript]);
  
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
  
  const handleButtonStateChange = useCallback((buttonState) => {
    console.log("[NativeSpeech] Button state changed:", buttonState);
    
    if (buttonManager.current?.shouldRecordingBeActive()) {
      if (!isListening) {
        console.log("[NativeSpeech] Button active, starting recognition");
        resetTranscript();
        startListening();
      }
    } else {
      if (isListening) {
        console.log("[NativeSpeech] Button inactive, stopping recognition");
        console.log("[NativeSpeech] Reasons: isVisible=", buttonState.isVisible, 
                    "isIdle=", buttonState.isIdle, 
                    "lastClick=", buttonState.lastClickTime ? 
                    `${Math.round((Date.now() - buttonState.lastClickTime)/1000)}s ago` : "never");
        stopListening();
      }
    }
  }, [isListening, startListening, stopListening, resetTranscript]);
  
  // Initialize button manager once
  useEffect(() => {
    if (!isSupported) {
      console.warn("[NativeSpeech] Speech recognition not supported in this browser");
      toast({
        variant: "destructive",
        title: "Speech Recognition Not Supported",
        description: "Your browser doesn't support native speech recognition. Try Chrome or Edge.",
        duration: 5000,
      });
      return;
    }
    
    console.log("[NativeSpeech] Initializing Vapi button manager");
    
    if (!buttonManager.current) {
      buttonManager.current = VapiButtonManager.getInstance();
      buttonManager.current.onStateChange(handleButtonStateChange);
      buttonManager.current.startMonitoring();
    }
    
    // Backup periodic check every 3 seconds
    const checkInterval = setInterval(() => {
      if (buttonManager.current) {
        buttonManager.current.forceCheck();
      }
    }, 3000);
    
    return () => {
      clearInterval(checkInterval);
      
      // Stop listening if component unmounts
      if (isListening) {
        stopListening();
      }
    };
  }, [isSupported, handleButtonStateChange, isListening, stopListening, toast]);
  
  // Handle errors
  useEffect(() => {
    if (error) {
      console.error("[NativeSpeech] Error:", error);
      toast({
        variant: "destructive",
        title: "Recording Error",
        description: error,
        duration: 3000,
      });
    }
  }, [error, toast]);
  
  // Save transcript when it changes with debounce to avoid multiple saves
  useEffect(() => {
    if (transcript && transcript.trim() && transcript !== lastTranscriptRef.current) {
      console.log("[NativeSpeech] New transcript detected:", transcript);
      
      // Clear previous timer if it exists
      if (transcriptDebounceTimer.current) {
        clearTimeout(transcriptDebounceTimer.current);
      }
      
      // Set a new timer for debouncing
      transcriptDebounceTimer.current = setTimeout(() => {
        const cleanedTranscript = cleanTranscript(transcript);
        console.log("[NativeSpeech] Saving cleaned transcript:", cleanedTranscript);
        
        // Save to localStorage directly here for redundancy
        try {
          console.log("[NativeSpeech] Saving transcript to localStorage...");
          
          // Save clean transcript for immediate video search
          localStorage.setItem('transcript', cleanedTranscript);
          
          // Using the constant to ensure consistency
          const nativeInputsStr = localStorage.getItem(NATIVE_VOICE_INPUT_KEY);
          const savedInputs = nativeInputsStr ? JSON.parse(nativeInputsStr) : [];
          
          if (!Array.isArray(savedInputs)) {
            console.error('[NativeSpeech] Existing input history is not an array, resetting');
            localStorage.setItem(NATIVE_VOICE_INPUT_KEY, '[]');
          }
          
          const newInput = {
            text: cleanedTranscript,
            timestamp: Date.now(),
            source: 'native'
          };
          
          // Save to native voice input history key
          localStorage.setItem(
            NATIVE_VOICE_INPUT_KEY,
            JSON.stringify([newInput, ...(Array.isArray(savedInputs) ? savedInputs : [])].slice(0, 50))
          );
          
          // Also save to the standard voice_input_history for compatibility
          const standardInputsStr = localStorage.getItem(VOICE_INPUT_KEY);
          const standardInputs = standardInputsStr ? JSON.parse(standardInputsStr) : [];
          
          if (!Array.isArray(standardInputs)) {
            console.error('[NativeSpeech] Existing standard input history is not an array, resetting');
            localStorage.setItem(VOICE_INPUT_KEY, '[]');
          }
          
          localStorage.setItem(
            VOICE_INPUT_KEY,
            JSON.stringify([newInput, ...(Array.isArray(standardInputs) ? standardInputs : [])].slice(0, 50))
          );
          
          console.log("[NativeSpeech] Successfully saved transcript to localStorage:", cleanedTranscript);
          
          // Dispatch custom event for the system to capture
          window.dispatchEvent(new CustomEvent('voice_input', {
            detail: {
              type: 'voice_input',
              text: cleanedTranscript
            }
          }));
        } catch (e) {
          console.error('[NativeSpeech] Error saving transcript to localStorage:', e);
        }
      }, 800); // Debounce for 800ms to ensure we get the complete transcript
    }
  }, [transcript]);
  
  // Test localStorage directly on component mount
  useEffect(() => {
    try {
      // Add a test entry to verify localStorage is working
      const testEntry = {
        text: "Test entry to verify localStorage is working",
        timestamp: Date.now(),
        source: 'test'
      };
      
      localStorage.setItem('localStorage_test', JSON.stringify(testEntry));
      const retrieved = localStorage.getItem('localStorage_test');
      console.log("[NativeSpeech] localStorage test - can write and read:", !!retrieved);
      
      // Initialize empty arrays for both history types if they don't exist
      if (!localStorage.getItem(NATIVE_VOICE_INPUT_KEY)) {
        localStorage.setItem(NATIVE_VOICE_INPUT_KEY, '[]');
        console.log("[NativeSpeech] Initialized empty native voice input history");
      }
      
      if (!localStorage.getItem(VOICE_INPUT_KEY)) {
        localStorage.setItem(VOICE_INPUT_KEY, '[]');
        console.log("[NativeSpeech] Initialized empty standard voice input history");
      }
      
      console.log("[NativeSpeech] Current localStorage keys:", Object.keys(localStorage));
    } catch (e) {
      console.error("[NativeSpeech] localStorage test failed:", e);
    }
  }, []);
  
  // Component doesn't render anything visible
  return null;
};

export default NativeSpeechRecorder;
