
import React, { useEffect, useRef, useState } from 'react';
import Header from '@/components/Header';
import CTA from '@/components/CTA';
import Benefits from '@/components/Benefits';
import SocialProof from '@/components/SocialProof';
import StepGuide from '@/components/StepGuide';
import FAQ from '@/components/FAQ';
import Footer from '@/components/Footer';
import TranscriptListener from '@/components/TranscriptListener';
import { useToast } from '@/hooks/use-toast';

interface VapiSDK {
  run: (config: {
    apiKey: string;
    assistant: string;
    config: any;
  }) => any;
}

// Extended interface to include proper types for Vapi
interface ExtendedVapiSDK extends VapiSDK {
  run: (config: {
    apiKey: string;
    assistant: string;
    config: any;
    // Add any other properties that might be needed
  }) => any;
}

declare global {
  interface Window {
    vapiSDK?: ExtendedVapiSDK;
    vapiInstance?: any; // Make vapiInstance globally accessible
  }
}

const Index = () => {
  const { toast } = useToast();
  const vapiInstanceRef = useRef<any>(null);
  const hasShownWelcomeMessage = useRef(false);
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Add debug log function
  const addDebugLog = (message: string) => {
    console.log(`[DEBUG] ${message}`);
    setDebugInfo(prev => [message, ...prev].slice(0, 20));
  };

  useEffect(() => {
    console.log("Index component mounted");
    addDebugLog("Component mounted - initializing voice assistant");
    
    // Initialize Vapi AI Assistant
    const assistant = "607959b0-89a1-482a-ad03-66a7c86327e1"; // Assistant ID
    const apiKey = "87657dc4-df36-4fa4-b292-0a60d40d43e4"; // Public Key
    
    // Position the button in the bottom right corner with some padding
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

    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js";
    script.defer = true;
    script.async = true;
    document.body.appendChild(script);

    script.onload = function () {
      addDebugLog("Vapi script loaded");
      if (window.vapiSDK) {
        addDebugLog("Vapi SDK detected");
        
        // Create a function to handle AI messages
        const handleMessage = (message: any) => {
          console.log("Message from Vapi:", message);
          addDebugLog(`Received AI message: ${JSON.stringify(message).substring(0, 100)}...`);
          
          // Only proceed if we have text content
          const messageText = message.text || message.content;
          if (!messageText) {
            console.warn("Received empty message from Vapi");
            addDebugLog("Warning: Empty message received from Vapi");
            return;
          }
          
          console.log("Dispatching vapi_message event with text:", messageText);
          addDebugLog(`Dispatching message event with text: ${messageText.substring(0, 50)}...`);
          
          // Dispatch event with AI message for TranscriptListener to capture
          window.dispatchEvent(new CustomEvent('vapi_message', {
            detail: {
              type: 'ai_message',
              text: messageText
            }
          }));
          
          // Also show toast for visibility
          toast({
            title: "AI Assistant",
            description: messageText.substring(0, 100) + (messageText.length > 100 ? "..." : ""),
            duration: 5000,
          });
        };
        
        // Handle voice input and recording status
        const handleVoiceInput = (input: any) => {
          console.log("Voice input received:", input);
          addDebugLog(`Voice input received: ${input ? JSON.stringify(input).substring(0, 70) : 'empty'}...`);
          setIsRecordingActive(true);
          
          if (input && input.transcript) {
            console.log("Voice transcript:", input.transcript);
            addDebugLog(`Transcript content: "${input.transcript.substring(0, 50)}..."`);
            
            // Dispatch event with voice input for TranscriptListener to capture
            window.dispatchEvent(new CustomEvent('voice_input', {
              detail: {
                type: 'voice_input',
                text: input.transcript
              }
            }));
            
            // Store in localStorage for debugging
            try {
              const savedInputs = JSON.parse(localStorage.getItem('voice_input_history') || '[]');
              const newVoiceInput = {
                text: input.transcript,
                timestamp: Date.now()
              };
              localStorage.setItem('voice_input_history', JSON.stringify([newVoiceInput, ...savedInputs].slice(0, 50)));
              console.log("Saved voice input to localStorage:", newVoiceInput);
              addDebugLog(`Saved to localStorage: "${input.transcript.substring(0, 40)}..."`);
            } catch (e) {
              console.error('Error saving voice input to localStorage:', e);
              addDebugLog(`Error saving to localStorage: ${e}`);
            }
            
            // Show toast for voice input
            toast({
              title: "Voice Input",
              description: input.transcript.substring(0, 100) + (input.transcript.length > 100 ? "..." : ""),
              duration: 3000,
            });
          }
        };
        
        // Handler for conversation state changes
        const handleStateChange = (state: any) => {
          console.log("Vapi state changed:", state);
          addDebugLog(`State change: ${state ? JSON.stringify(state).substring(0, 100) : 'null'}...`);
          
          if (state && state.status) {
            // If conversation starts or ends
            if (state.status === 'connecting' || state.status === 'connected') {
              setIsRecordingActive(true);
              console.log("Voice recording activated");
              addDebugLog(`Recording ACTIVATED (status: ${state.status})`);
              
              // Dispatch recording started event
              window.dispatchEvent(new CustomEvent('recording_status_change', {
                detail: { isActive: true }
              }));
              
              toast({
                title: "Recording Started",
                description: "Voice recording is now active",
                duration: 3000,
              });
            } else if (state.status === 'disconnected' || state.status === 'error') {
              setIsRecordingActive(false);
              console.log("Voice recording deactivated");
              addDebugLog(`Recording DEACTIVATED (status: ${state.status})`);
              
              // Dispatch recording ended event
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

        // Function to handle click on Vapi button (for debugging)
        const trackVapiButtonClick = () => {
          document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            // Try to identify the Vapi button by its characteristics
            if (target && 
                (target.textContent?.includes('AI Assistant') || 
                 target.closest('[style*="rgb(37, 211, 102)"]') ||
                 target.style.backgroundColor === 'rgb(37, 211, 102)')) {
              addDebugLog(`Possible Vapi button clicked at ${new Date().toISOString()}`);
              // Attempt to prompt recording status
              setTimeout(() => {
                if (!isRecordingActive) {
                  addDebugLog("Recording not activated after button click");
                }
              }, 2000);
            }
          });
        };
        
        // Start tracking button clicks
        trackVapiButtonClick();

        // Initialize Vapi with the config 
        const customConfig = {
          ...buttonConfig,
          onMessage: handleMessage,
          onTranscript: handleVoiceInput, // Add handler for voice input transcripts
          onStateChange: handleStateChange, // Add handler for conversation state
          debug: true, // Enable debug mode to get more logs
          autoStart: false, // Make sure autoStart is false to prevent automatic connection
        };

        // Dispatch an initial welcome message event to trigger the video display - ONLY ONCE
        if (!hasShownWelcomeMessage.current) {
          hasShownWelcomeMessage.current = true;
          setTimeout(() => {
            console.log("Dispatching initial welcome message - ONE TIME ONLY");
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

        // Initialize Vapi with the config (only once)
        if (!vapiInstanceRef.current) {
          try {
            addDebugLog("Initializing Vapi instance");
            vapiInstanceRef.current = window.vapiSDK.run({
              apiKey: apiKey,
              assistant: assistant,
              config: customConfig
            });
            // Make it globally accessible for debugging
            window.vapiInstance = vapiInstanceRef.current;
            console.log("Vapi instance initialized", vapiInstanceRef.current);
            addDebugLog("Vapi instance initialized successfully");
          } catch (error) {
            console.error("Failed to initialize Vapi:", error);
            addDebugLog(`Vapi initialization error: ${error}`);
          }
        }
      } else {
        addDebugLog("ERROR: Vapi SDK not found after script load");
      }
    };

    script.onerror = function() {
      console.error("Failed to load Vapi script");
      addDebugLog("ERROR: Failed to load Vapi script");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load AI Assistant. Please refresh the page.",
        duration: 5000,
      });
    };

    return () => {
      // Cleanup if needed
      if (vapiInstanceRef.current && vapiInstanceRef.current.destroy) {
        vapiInstanceRef.current.destroy();
      }
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
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
        <TranscriptListener isRecording={isRecordingActive} debugLogs={debugInfo} />
      </main>
      <Footer />
      {isRecordingActive && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-full animate-pulse z-50">
          Recording Active
        </div>
      )}
      {!isRecordingActive && (
        <div className="fixed top-4 right-4 bg-gray-500 text-white px-4 py-2 rounded-full z-50">
          Recording Inactive
        </div>
      )}
      {/* Debug panel - fixed position */}
      <div className="fixed left-4 top-4 bg-black/80 text-white p-3 rounded-lg shadow-lg z-50 max-w-xs max-h-[300px] overflow-y-auto text-xs">
        <h4 className="font-bold mb-2">Debug Info</h4>
        <ul className="space-y-1">
          {debugInfo.map((log, i) => (
            <li key={i} className="border-t border-gray-700 pt-1">{log}</li>
          ))}
          {debugInfo.length === 0 && <li>No debug logs yet...</li>}
        </ul>
      </div>
    </div>
  );
};

export default Index;
