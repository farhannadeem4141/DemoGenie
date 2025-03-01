
import React from 'react';
import { cn } from '@/lib/utils';

const CTA: React.FC = () => {
  const whatsappLink = "https://wa.me/1234567890"; // Replace with your actual WhatsApp number

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="max-w-4xl w-full">
        <div className="text-center opacity-0 animate-fade-up">
          <span className="inline-block bg-whatsapp/10 text-whatsapp px-4 py-1 rounded-full text-sm font-medium mb-4">
            24/7 Instant Support
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6">
            Chat with Us Instantly on WhatsApp!
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Get real-time assistance, personalized recommendations, and exclusive offers through WhatsApp - all at your fingertips.
          </p>
        </div>

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
      </div>
      
      <div className="absolute bottom-10 left-0 right-0 text-center">
        <a 
          href="#benefits" 
          className="inline-flex flex-col items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Learn More</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-float">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
        </a>
      </div>
    </div>
  );
};

export default CTA;
