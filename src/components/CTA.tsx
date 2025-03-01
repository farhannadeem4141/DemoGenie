
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const CTA: React.FC = () => {
  const [isQRVisible, setIsQRVisible] = useState(false);
  const whatsappLink = "https://wa.me/1234567890"; // Replace with your actual WhatsApp number
  
  // Function to toggle QR code visibility
  const toggleQR = () => {
    setIsQRVisible(!isQRVisible);
  };

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

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 opacity-0 animate-fade-up delay-200">
          <a 
            href={whatsappLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-whatsapp flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
            Start Chatting Now
          </a>
          
          <button 
            onClick={toggleQR}
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            {isQRVisible ? "Hide QR Code" : "Show QR Code"}
          </button>
        </div>

        {isQRVisible && (
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
        )}
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
