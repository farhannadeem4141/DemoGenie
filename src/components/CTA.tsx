
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const CTA: React.FC = () => {
  const activateDemo = () => {
    if (window.activateRecording) {
      window.activateRecording();
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 relative overflow-hidden">
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
              <Button size="lg" className="bg-whatsapp hover:bg-whatsapp-dark text-white">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={activateDemo}
                className="border-whatsapp text-whatsapp hover:bg-whatsapp/10"
              >
                Try Demo
              </Button>
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
              src="https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80"
              alt="WhatsApp Business Platform"
              className="rounded-lg shadow-xl max-w-full h-auto object-cover mt-4 opacity-0 animate-fade-up"
              style={{ animationDelay: "200ms" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CTA;
