
import React, { useEffect } from 'react';
import Header from '@/components/Header';
import CTA from '@/components/CTA';
import Benefits from '@/components/Benefits';
import SocialProof from '@/components/SocialProof';
import StepGuide from '@/components/StepGuide';
import FAQ from '@/components/FAQ';
import Footer from '@/components/Footer';
import TranscriptListener from '@/components/TranscriptListener';

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
  useEffect(() => {
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
        // Create a function to handle AI messages
        const handleMessage = (message: any) => {
          // Dispatch event with AI message for TranscriptListener to capture
          window.dispatchEvent(new CustomEvent('vapi_message', {
            detail: {
              type: 'ai_message',
              text: message.text || message.content
            }
          }));
        };

        // Instead of using callbacks directly, customize the config object
        // to include any message handling logic
        const customConfig = {
          ...buttonConfig,
          // Add any event handlers or custom properties that Vapi might support
          onMessage: handleMessage
        };

        // Initialize Vapi with the config (without callbacks property)
        vapiInstance = window.vapiSDK.run({
          apiKey: apiKey,
          assistant: assistant,
          config: customConfig
        });

        // Setup event listener for Vapi messages if the SDK supports it
        if (vapiInstance && typeof vapiInstance.addEventListener === 'function') {
          vapiInstance.addEventListener('message', handleMessage);
        }
      }
    };

    return () => {
      // Cleanup if needed
      if (vapiInstance && vapiInstance.destroy) {
        vapiInstance.destroy();
      }
      document.body.removeChild(script);
    };
  }, []);

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
