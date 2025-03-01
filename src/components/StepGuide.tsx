
import React from 'react';

const steps = [
  {
    number: "01",
    title: "Click the Chat Button",
    description: "Tap the WhatsApp button on our website to open the chat directly."
  },
  {
    number: "02",
    title: "Send Us a Message",
    description: "Type your query or request – no need for introductions or waiting."
  },
  {
    number: "03",
    title: "Get Instant Assistance",
    description: "Receive immediate responses from our team or AI assistant."
  }
];

const StepGuide: React.FC = () => {
  return (
    <section id="how-it-works" className="py-20 px-4 bg-white">
      <div className="container mx-auto">
        <div className="text-center mb-16 opacity-0 animate-fade-up">
          <span className="bg-whatsapp/10 text-whatsapp px-4 py-1 rounded-full text-sm font-medium">
            How It Works
          </span>
          <h2 className="section-heading mt-4">Simple Steps to Connect</h2>
          <p className="section-subheading">Getting started is easy and takes less than a minute.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className={`bg-gray-50 p-8 rounded-xl relative opacity-0 animate-fade-up delay-${index * 100}`}
            >
              <div className="absolute -top-5 -left-5 w-12 h-12 rounded-full bg-whatsapp flex items-center justify-center text-white font-bold text-lg shadow-lg animate-pulse-subtle">
                {step.number}
              </div>
              <div className="pt-4">
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center opacity-0 animate-fade-up delay-400">
          <a 
            href="https://wa.me/1234567890" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-whatsapp inline-flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            Start Chatting Now
          </a>
        </div>
      </div>
    </section>
  );
};

export default StepGuide;
