
import React from 'react';

const steps = [
  {
    number: "1️⃣",
    title: "Sign Up",
    description: "Download WhatsApp Business & create your free account."
  },
  {
    number: "2️⃣",
    title: "Set Up Auto-Replies & Catalog",
    description: "Customize responses & showcase your products."
  },
  {
    number: "3️⃣",
    title: "Start Selling & Engaging",
    description: "Chat with customers, send promotions & boost revenue!"
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
          <h2 className="section-heading mt-4 text-3xl font-bold">🚀 Getting Started is Easy!</h2>
          <p className="section-subheading text-xl text-muted-foreground">Set up your WhatsApp Business account in minutes.</p>
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
            className="btn-whatsapp inline-flex items-center gap-2 bg-whatsapp text-white px-6 py-3 rounded-full font-medium hover:bg-whatsapp/90 transition-colors shadow-md"
          >
            ✅ Get Started Now →
          </a>
        </div>
      </div>
    </section>
  );
};

export default StepGuide;
