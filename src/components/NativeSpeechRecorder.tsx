
import React, { useEffect, useCallback, useRef } from 'react';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';
import { useToast } from '@/hooks/use-toast';

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
  
  const setupVapiButtonListener = useCallback(() => {
    if (isTrackingVapiButton.current) return;
    
    console.log("[NativeSpeech] Setting up Vapi button observer");
    
    const observer = new MutationObserver((mutations) => {
      const vapiButton = document.querySelector('[id^="vapi-support-btn"]');
      if (vapiButton) {
        console.log("[NativeSpeech] Found Vapi button, attaching click listener");
        
        vapiButton.addEventListener('click', () => {
          console.log("[NativeSpeech] Vapi button clicked, starting native recording");
          resetTranscript();
          
          // Test that localStorage is accessible before attempting to start
          try {
            const testObj = { test: "accessibility check" };
            localStorage.setItem('speech_recognition_test', JSON.stringify(testObj));
            const retrieved = localStorage.getItem('speech_recognition_test');
            if (!retrieved) {
              throw new Error("Storage not accessible - could not retrieve test item");
            }
            const parsedTest = JSON.parse(retrieved);
            if (!parsedTest || parsedTest.test !== "accessibility check") {
              throw new Error("Storage test failed - retrieved value doesn't match saved value");
            }
            console.log("[NativeSpeech] localStorage access test passed, starting recognition");
            startListening();
          } catch (e) {
            console.error("[NativeSpeech] localStorage test failed, cannot proceed with recording:", e);
            toast({
              variant: "destructive",
              title: "Storage Access Error",
              description: "Cannot save voice input - browser storage not accessible.",
              duration: 3000,
            });
          }
        });
        
        // Listen for Vapi modal close actions
        document.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          if (target && 
              (target.classList.contains('vapi-close-btn') || 
               target.classList.contains('vapi-overlay') ||
               target.getAttribute('aria-label') === 'Close' ||
               target.closest('[aria-label="Close"]'))) {
            console.log("[NativeSpeech] Vapi close action detected, stopping native recording");
            stopListening();
          }
        }, true);
        
        // Also observe Vapi button state changes to detect when conversation ends
        const buttonObserver = new MutationObserver((mutations) => {
          mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
              const target = mutation.target as HTMLElement;
              const hasIdleClass = target.classList.contains('vapi-btn-is-idle') || 
                                  target.classList.contains('idle') ||
                                  target.classList.contains('inactive');
              
              if (hasIdleClass && isListening) {
                console.log("[NativeSpeech] Vapi button returned to idle state, stopping native recording");
                stopListening();
              }
            }
          });
        });
        
        buttonObserver.observe(vapiButton, { attributes: true, attributeFilter: ['class'] });
        isTrackingVapiButton.current = true;
        observer.disconnect();
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Return a cleanup function
    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [isListening, startListening, stopListening, resetTranscript, toast]);
  
  // Set up Vapi button listener when component mounts
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
    
    console.log("[NativeSpeech] Setting up initial Vapi button listener");
    const cleanup = setupVapiButtonListener();
    
    // Also check for Vapi button immediately
    const vapiButton = document.querySelector('[id^="vapi-support-btn"]');
    if (vapiButton) {
      console.log("[NativeSpeech] Found Vapi button on initial check");
      setupVapiButtonListener();
    }
    
    // Poll for the Vapi button every second in case it's added after initial load
    const intervalId = setInterval(() => {
      if (!isTrackingVapiButton.current) {
        const button = document.querySelector('[id^="vapi-support-btn"]');
        if (button) {
          console.log("[NativeSpeech] Found Vapi button during polling");
          setupVapiButtonListener();
        }
      }
    }, 1000);
    
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
      clearInterval(intervalId);
      if (isListening) {
        stopListening();
      }
    };
  }, [isSupported, setupVapiButtonListener, isListening, stopListening, toast]);
  
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
          console.log("[NativeSpeech] Keys in localStorage:", Object.keys(localStorage));
          
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
