
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
    language: 'en-US'
  });
  
  const { toast } = useToast();
  const isTrackingVapiButton = useRef(false);
  
  const setupVapiButtonListener = useCallback(() => {
    if (isTrackingVapiButton.current) return;
    
    const observer = new MutationObserver((mutations, obs) => {
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
        obs.disconnect();
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
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
    
    console.log("[NativeSpeech] Setting up Vapi button listener");
    const cleanup = setupVapiButtonListener();
    
    // Poll for the Vapi button every second in case it's added after initial load
    const intervalId = setInterval(() => {
      if (!isTrackingVapiButton.current) {
        setupVapiButtonListener();
      }
    }, 1000);
    
    return () => {
      cleanup();
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
    if (transcript) {
      console.log("[NativeSpeech] New transcript:", transcript);
      
      // Dispatch custom event for the system to capture
      window.dispatchEvent(new CustomEvent('voice_input', {
        detail: {
          type: 'voice_input',
          text: transcript
        }
      }));
    }
  }, [transcript]);
  
  // Component doesn't render anything visible
  return null;
};

export default NativeSpeechRecorder;
