
import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import SpeechToTextButton from './SpeechToTextButton';

const CTA: React.FC = () => {
  const activateDemo = () => {
    if (window.activateRecording) {
      console.log("[DEBUG] Talk to Us button clicked, activating recording");
      window.activateRecording();
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="max-w-6xl w-full flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="w-full md:w-1/2">
          <div className="text-left opacity-0 animate-fade-up">
            <span className="inline-block bg-whatsapp/10 text-whatsapp px-4 py-1 rounded-full text-sm font-medium mb-4">
              💬 WhatsApp Business
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6">
              Instantly Connect, Sell & Support with WhatsApp Business
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mb-10">
              📢 Turn conversations into conversions! Automate replies, send promotions, and grow your business—right from WhatsApp.
            </p>
            <div className="flex flex-wrap gap-4 mt-6">
              <Button 
                size="lg" 
                className="bg-whatsapp hover:bg-whatsapp-dark text-white"
                onClick={activateDemo}
              >
                Talk to Us <MessageCircle className="ml-2 h-5 w-5" />
              </Button>
              
              <SpeechToTextButton />
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/2 flex justify-center">
          <div className="relative">
            <div className="mt-8 flex justify-center opacity-0 animate-scale-in">
              <div className="bg-white p-4 rounded-lg shadow-lg">
                <img 
                  src="/whatsapp-qr.png" 
                  alt="WhatsApp QR Code" 
                  className="w-48 h-48 object-contain"
                />
                <p className="text-sm text-center mt-2 text-muted-foreground">Scan to start chatting</p>
              </div>
            </div>
            <img
              src="https://img.freepik.com/free-vector/flat-design-illustration-customer-support_23-2148887720.jpg"
              alt="Illustration of people communicating through WhatsApp"
              className="rounded-lg shadow-xl max-w-full h-auto object-cover mt-4 opacity-0 animate-fade-up w-full md:max-h-[400px]"
              style={{ animationDelay: "200ms" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CTA;
