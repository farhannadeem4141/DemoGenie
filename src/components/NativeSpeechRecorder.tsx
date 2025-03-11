
import React, { useEffect, useCallback, useRef } from 'react';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';
import { useToast } from '@/hooks/use-toast';

interface NativeSpeechRecorderProps {
  className?: string;
}

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
  
  // Update ref when transcript changes
  useEffect(() => {
    lastTranscriptRef.current = transcript;
  }, [transcript]);
  
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
          startListening();
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
  }, [isListening, startListening, stopListening, resetTranscript]);
  
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
  
  // Save transcript when it changes
  useEffect(() => {
    if (transcript && transcript.trim() && transcript !== lastTranscriptRef.current) {
      console.log("[NativeSpeech] New transcript detected:", transcript);
      
      // Save to localStorage directly here for redundancy
      try {
        console.log("[NativeSpeech] Saving transcript to localStorage...");
        const savedInputs = JSON.parse(localStorage.getItem('native_voice_input_history') || '[]');
        const newInput = {
          text: transcript,
          timestamp: Date.now(),
          source: 'native'
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
        
        console.log("[NativeSpeech] Successfully saved transcript to localStorage:", transcript);
        
        // Dispatch custom event for the system to capture
        window.dispatchEvent(new CustomEvent('voice_input', {
          detail: {
            type: 'voice_input',
            text: transcript
          }
        }));
      } catch (e) {
        console.error('[NativeSpeech] Error saving transcript to localStorage:', e);
      }
    }
  }, [transcript]);
  
  // Test localStorage directly
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
    } catch (e) {
      console.error("[NativeSpeech] localStorage test failed:", e);
    }
  }, []);
  
  // Component doesn't render anything visible
  return null;
};

export default NativeSpeechRecorder;
