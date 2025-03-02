
import React from 'react';
import { cn } from '@/lib/utils';

const benefits = [
  {
    title: "98% open rate vs. email's 20%",
    description: "Your messages get seen, guaranteeing higher engagement for every campaign you run.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-whatsapp">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
        <polyline points="22,6 12,13 2,6"></polyline>
      </svg>
    )
  },
  {
    title: "Instant responses with auto-replies",
    description: "Keep customers engaged 24/7 with automated responses and quick replies.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-whatsapp">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
      </svg>
    )
  },
  {
    title: "Seamless sales with in-chat payments",
    description: "Complete the entire sales process right in WhatsApp, from product showcase to payment.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-whatsapp">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
        <line x1="1" y1="10" x2="23" y2="10"></line>
      </svg>
    )
  },
  {
    title: "Boost engagement & increase sales",
    description: "Make customer support effortless and turn conversations into conversions.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-whatsapp">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    )
  }
];

const Benefits: React.FC = () => {
  return (
    <section id="benefits" className="py-20 px-4 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto">
        <div className="text-center mb-16 opacity-0 animate-fade-up">
          <span className="bg-whatsapp/10 text-whatsapp px-4 py-1 rounded-full text-sm font-medium">
            Why WhatsApp Business?
          </span>
          <h2 className="section-heading mt-4 text-3xl font-bold">📲 Your Customers Are Already on WhatsApp—Meet Them There!</h2>
          <p className="section-subheading text-xl text-muted-foreground">Discover how our WhatsApp Business service can transform your customer engagement.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div 
              key={index} 
              className={cn(
                "glass-card rounded-xl p-6 card-hover opacity-0 animate-fade-up",
                `delay-${index * 100}`
              )}
            >
              <div className="feature-icon-wrapper">
                {benefit.icon}
              </div>
              <h3 className="feature-title font-semibold text-lg mt-4 mb-2">{benefit.title}</h3>
              <p className="feature-description text-muted-foreground">{benefit.description}</p>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <a 
            href="#" 
            className="btn-whatsapp inline-flex items-center gap-2 bg-whatsapp text-white px-6 py-3 rounded-full font-medium hover:bg-whatsapp/90 transition-colors shadow-md"
          >
            ✅ Get Started Now →
          </a>
        </div>
      </div>
    </section>
  );
};

export default Benefits;
