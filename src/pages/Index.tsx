
import React, { useEffect, useRef, useState } from 'react';
import Header from '@/components/Header';
import CTA from '@/components/CTA';
import Benefits from '@/components/Benefits';
import SocialProof from '@/components/SocialProof';
import StepGuide from '@/components/StepGuide';
import FAQ from '@/components/FAQ';
import Footer from '@/components/Footer';
import TranscriptListener from '@/components/TranscriptListener';
import NativeSpeechRecorder from '@/components/NativeSpeechRecorder';
import { useToast } from '@/hooks/use-toast';
import { resetVideoLoadingState, clearStaleLocks } from '@/utils/videoLoadingManager';
import VapiButtonManager from '@/utils/vapiButtonManager';

interface VapiSDK {
  run: (config: {
    apiKey: string;
    assistant: string;
    config: any;
  }) => any;
}

interface ExtendedVapiSDK extends VapiSDK {
  run: (config: {
    apiKey: string;
    assistant: string;
    config: any;
  }) => any;
}

declare global {
  interface Window {
    vapiSDK?: ExtendedVapiSDK;
    vapiInstance?: any;
    activateRecording?: () => void;
  }
}

const Index = () => {
  const { toast } = useToast();
  const vapiInstanceRef = useRef<any>(null);
  const hasShownWelcomeMessage = useRef(false);
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const buttonManagerRef = useRef<VapiButtonManager | null>(null);
  const isInitializedRef = useRef(false);
  const sessionId = useRef(`session-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);

  const addDebugLog = (message: string) => {
    console.log(`[DEBUG:${sessionId.current}] ${message}`);
  };

  const activateRecording = () => {
    addDebugLog("Manual recording activation triggered");
    setIsRecordingActive(true);
    
    window.dispatchEvent(new CustomEvent('recording_status_change', {
      detail: { isActive: true }
    }));
    
    toast({
      title: "Recording Started",
      description: "Voice recording is now active",
      duration: 3000,
    });
    
    try {
      const savedInputs = JSON.parse(localStorage.getItem('voice_input_history') || '[]');
      if (savedInputs.length === 0) {
        localStorage.setItem('voice_input_history', JSON.stringify([]));
        addDebugLog("Initialized empty voice input history in localStorage");
      }
    } catch (e) {
      console.error(`[DEBUG:${sessionId.current}] Error initializing voice input history:`, e);
    }
  };

  const deactivateRecording = () => {
    addDebugLog("Manual recording deactivation triggered");
    setIsRecordingActive(false);
    
    window.dispatchEvent(new CustomEvent('recording_status_change', {
      detail: { isActive: false }
    }));
    
    toast({
      title: "Recording Stopped",
      description: "Voice recording is now inactive",
      duration: 3000,
    });
  };

  useEffect(() => {
    window.activateRecording = activateRecording;
  }, []);

  // Set up button state manager to handle recording state
  useEffect(() => {
    // Skip if already initialized
    if (isInitializedRef.current) return;
    
    addDebugLog("Initializing button manager");
    buttonManagerRef.current = VapiButtonManager.getInstance();
    
    // Handle button state changes
    buttonManagerRef.current.onStateChange((state) => {
      const shouldBeActive = buttonManagerRef.current?.shouldRecordingBeActive();
      addDebugLog(`Button state changed. Should recording be active: ${shouldBeActive}, Current state: ${JSON.stringify(state)}`);
      
      if (shouldBeActive && !isRecordingActive) {
        activateRecording();
      } else if (!shouldBeActive && isRecordingActive) {
        addDebugLog("Deactivating recording due to button state: " + 
                   `isVisible=${state.isVisible}, isIdle=${state.isIdle}`);
        deactivateRecording();
      }
    });
    
    // Start monitoring
    addDebugLog("Starting button state monitoring");
    buttonManagerRef.current.startMonitoring();
    
    isInitializedRef.current = true;
    
    // Clean up on unmount
    return () => {
      addDebugLog("Stopping button state monitoring due to component unmount");
      if (buttonManagerRef.current) {
        buttonManagerRef.current.stopMonitoring();
      }
    };
  }, [isRecordingActive]);

  useEffect(() => {
    console.log(`[Index:${sessionId.current}] 🚀 Component mounted - initializing voice assistant`);
    addDebugLog("Component mounted - initializing voice assistant");
    
    addDebugLog("Resetting video loading state");
    resetVideoLoadingState();
    
    const assistant = "607959b0-89a1-482a-ad03-66a7c86327e1";
    const apiKey = "87657dc4-df36-4fa4-b292-0a60d40d43e4";
    addDebugLog(`Using assistant ID: ${assistant.substring(0, 8)}...`);
    
    const buttonConfig = {
      button: {
        position: 'bottom-right',
        offset: {
          right: 20,
          bottom: 80
        },
        size: 'medium',
        text: 'AI Assistant',
        iconOnly: false,
        variant: 'primary',
        backgroundColor: '#25D366',
        textColor: '#FFFFFF'
      }
    };
    addDebugLog("Button config set up");

    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js";
    script.defer = true;
    script.async = true;
    addDebugLog(`Adding Vapi script to DOM: ${script.src}`);
    document.body.appendChild(script);

    // Periodically clear stale locks for system health
    addDebugLog("Setting up stale lock cleanup interval");
    const staleLockCleanupInterval = setInterval(() => {
      addDebugLog("Clearing stale locks");
      clearStaleLocks();
    }, 60000); // Every minute

    script.onload = function () {
      addDebugLog("✅ Vapi script loaded successfully");
      if (window.vapiSDK) {
        addDebugLog("Vapi SDK detected in window object");
        
        const handleMessage = (message: any) => {
          console.log(`[Index:${sessionId.current}] 📩 Message from Vapi:`, message);
          addDebugLog(`Received AI message: ${JSON.stringify(message).substring(0, 100)}...`);
          
          const messageText = message.text || message.content;
          if (!messageText) {
            console.warn(`[Index:${sessionId.current}] ⚠️ Received empty message from Vapi`);
            addDebugLog("Warning: Empty message received from Vapi");
            return;
          }
          
          console.log(`[Index:${sessionId.current}] Dispatching vapi_message event with text:`, messageText);
          addDebugLog(`Dispatching message event with text: ${messageText.substring(0, 50)}...`);
          
          window.dispatchEvent(new CustomEvent('vapi_message', {
            detail: {
              type: 'ai_message',
              text: messageText
            }
          }));
          
          toast({
            title: "AI Assistant",
            description: messageText.substring(0, 100) + (messageText.length > 100 ? "..." : ""),
            duration: 5000,
          });
        };
        
        const handleVoiceInput = (input: any) => {
          console.log(`[Index:${sessionId.current}] 🎙️ Voice input received:`, input);
          addDebugLog(`Voice input received: ${input ? JSON.stringify(input).substring(0, 70) : 'empty'}...`);
          setIsRecordingActive(true);
          
          if (input && input.transcript) {
            console.log(`[Index:${sessionId.current}] Voice transcript:`, input.transcript);
            addDebugLog(`Transcript content: "${input.transcript.substring(0, 50)}..."`);
            
            window.dispatchEvent(new CustomEvent('voice_input', {
              detail: {
                type: 'voice_input',
                text: input.transcript
              }
            }));
            
            try {
              const savedInputs = JSON.parse(localStorage.getItem('voice_input_history') || '[]');
              const newVoiceInput = {
                text: input.transcript,
                timestamp: Date.now()
              };
              
              localStorage.setItem('voice_input_history', 
                JSON.stringify([newVoiceInput, ...savedInputs].slice(0, 50))
              );
              
              console.log(`[Index:${sessionId.current}] Saved voice input to localStorage:`, newVoiceInput);
              addDebugLog(`Saved to localStorage: "${input.transcript.substring(0, 40)}..."`);
            } catch (e) {
              console.error(`[Index:${sessionId.current}] Error saving voice input to localStorage:`, e);
              addDebugLog(`Error saving to localStorage: ${e}`);
            }
            
            toast({
              title: "Voice Input",
              description: input.transcript.substring(0, 100) + (input.transcript.length > 100 ? "..." : ""),
              duration: 3000,
            });
          }
        };
        
        const handleStateChange = (state: any) => {
          console.log(`[Index:${sessionId.current}] Vapi state changed:`, state);
          addDebugLog(`State change: ${state ? JSON.stringify(state).substring(0, 100) : 'null'}...`);
          
          if (state && state.status) {
            if (state.status === 'connecting' || state.status === 'connected') {
              setIsRecordingActive(true);
              console.log(`[Index:${sessionId.current}] Voice recording activated`);
              addDebugLog(`Recording ACTIVATED (status: ${state.status})`);
              
              window.dispatchEvent(new CustomEvent('recording_status_change', {
                detail: { isActive: true }
              }));
              
              toast({
                title: "Recording Started",
                description: "Voice recording is now active",
                duration: 3000,
              });
            } else if (state.status === 'disconnected' || state.status === 'error' || state.status === 'inactive') {
              setIsRecordingActive(false);
              console.log(`[Index:${sessionId.current}] Voice recording deactivated`);
              addDebugLog(`Recording DEACTIVATED (status: ${state.status})`);
              
              window.dispatchEvent(new CustomEvent('recording_status_change', {
                detail: { isActive: false }
              }));
              
              toast({
                title: "Recording Stopped",
                description: "Voice recording is now inactive",
                duration: 3000,
              });
            }
          }
        };

        if (!hasShownWelcomeMessage.current) {
          hasShownWelcomeMessage.current = true;
          setTimeout(() => {
            console.log(`[Index:${sessionId.current}] Dispatching initial welcome message - ONE TIME ONLY`);
            addDebugLog("Dispatching welcome message");
            const welcomeMessage = "Welcome to WhatsApp AI Assistant. Ask me about quick replies, message templates, or other WhatsApp Business features.";
            
            window.dispatchEvent(new CustomEvent('vapi_message', {
              detail: {
                type: 'ai_message',
                text: welcomeMessage
              }
            }));
            
            toast({
              title: "AI Assistant Ready",
              description: "Click the AI Assistant button to start a conversation",
              duration: 5000,
            });
          }, 1500);
        }

        if (!vapiInstanceRef.current) {
          try {
            addDebugLog("Initializing Vapi instance");
            const customConfig = {
              ...buttonConfig,
              onMessage: handleMessage,
              onTranscript: handleVoiceInput,
              onStateChange: handleStateChange,
              debug: true,
              autoStart: false
            };
            
            vapiInstanceRef.current = window.vapiSDK.run({
              apiKey: apiKey,
              assistant: assistant,
              config: customConfig
            });
            window.vapiInstance = vapiInstanceRef.current;
            console.log(`[Index:${sessionId.current}] ✅ Vapi instance initialized`, vapiInstanceRef.current);
            addDebugLog("Vapi instance initialized successfully");
          } catch (error) {
            console.error(`[Index:${sessionId.current}] Failed to initialize Vapi:`, error);
            addDebugLog(`Vapi initialization error: ${error}`);
          }
        }
      } else {
        addDebugLog("ERROR: Vapi SDK not found after script load");
        console.error(`[Index:${sessionId.current}] ❌ Vapi SDK not found in window object after script load`);
      }
    };

    script.onerror = function() {
      console.error(`[Index:${sessionId.current}] ❌ Failed to load Vapi script`);
      addDebugLog("ERROR: Failed to load Vapi script");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load AI Assistant. Please refresh the page.",
        duration: 5000,
      });
    };

    return () => {
      clearInterval(staleLockCleanupInterval);
      if (vapiInstanceRef.current && vapiInstanceRef.current.destroy) {
        addDebugLog("Destroying Vapi instance during cleanup");
        vapiInstanceRef.current.destroy();
      }
      if (document.body.contains(script)) {
        addDebugLog("Removing Vapi script from DOM");
        document.body.removeChild(script);
      }
      addDebugLog("Resetting video loading state during cleanup");
      resetVideoLoadingState();
    };
  }, [toast]);

  return (
    <div className="min-h-screen overflow-hidden">
      <Header />
      <main>
        <CTA />
        <Benefits />
        <SocialProof />
        <StepGuide />
        <FAQ />
        <TranscriptListener isRecording={isRecordingActive} />
      </main>
      <Footer />
      {isRecordingActive && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-full animate-pulse z-50">
          Recording Active
        </div>
      )}
      <NativeSpeechRecorder />
    </div>
  );
};

export default Index;
