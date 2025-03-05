
import React, { useEffect } from 'react';
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
  }
}

const Index = () => {
  const { toast } = useToast();

  useEffect(() => {
    console.log("Index component mounted");
    
    // Initialize Vapi AI Assistant
    var vapiInstance = null;
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
      if (window.vapiSDK) {
        console.log("Vapi SDK loaded");
        
        // Create a function to handle AI messages
        const handleMessage = (message: any) => {
          console.log("Message from Vapi:", message);
          
          // Only proceed if we have text content
          const messageText = message.text || message.content;
          if (!messageText) {
            console.warn("Received empty message from Vapi");
            return;
          }
          
          console.log("Dispatching vapi_message event with text:", messageText);
          
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

        // Initialize Vapi with the config 
        const customConfig = {
          ...buttonConfig,
          onMessage: handleMessage
        };

        // Dispatch an initial welcome message event to trigger the video display
        setTimeout(() => {
          console.log("Dispatching initial welcome message");
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

        // Initialize Vapi with the config
        vapiInstance = window.vapiSDK.run({
          apiKey: apiKey,
          assistant: assistant,
          config: customConfig
        });

        console.log("Vapi instance initialized", vapiInstance);

        // Setup event listener for Vapi messages if the SDK supports it
        if (vapiInstance && typeof vapiInstance.addEventListener === 'function') {
          vapiInstance.addEventListener('message', handleMessage);
        }
        
        // Manually trigger a search for "quick replies" for testing purposes
        setTimeout(() => {
          console.log("Triggering test search for 'quick replies'");
          window.dispatchEvent(new CustomEvent('vapi_message', {
            detail: {
              type: 'ai_message',
              text: "Here's information about quick replies in WhatsApp Business."
            }
          }));
        }, 3000);
      }
    };

    return () => {
      // Cleanup if needed
      if (vapiInstance && vapiInstance.destroy) {
        vapiInstance.destroy();
      }
      document.body.removeChild(script);
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
        <TranscriptListener />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
