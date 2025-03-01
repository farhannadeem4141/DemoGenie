
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

const faqs = [
  {
    question: "How fast do you respond on WhatsApp?",
    answer: "We typically respond within minutes during business hours (9 AM - 6 PM). Outside these hours, our AI assistant can handle many queries immediately, and our team will follow up on complex issues the next business day."
  },
  {
    question: "What services do you offer through WhatsApp?",
    answer: "We offer customer support, product inquiries, order tracking, appointment scheduling, and personalized recommendations. You can also receive exclusive offers and promotions through our WhatsApp channel."
  },
  {
    question: "Is my information secure when chatting on WhatsApp?",
    answer: "Yes, all conversations are end-to-end encrypted by WhatsApp. We also adhere to strict data protection policies and never share your information with third parties without your consent."
  },
  {
    question: "Can I speak with a real person or is it just a bot?",
    answer: "Our service combines AI assistance with human support. Many queries can be handled instantly by our AI, but you can always request to speak with a human team member at any point in the conversation."
  },
  {
    question: "Do I need to install WhatsApp to use this service?",
    answer: "Yes, you'll need to have WhatsApp installed on your device. It's free to download from your device's app store if you don't already have it."
  }
];

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 px-4 bg-gray-50">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-16 opacity-0 animate-fade-up">
          <span className="bg-whatsapp/10 text-whatsapp px-4 py-1 rounded-full text-sm font-medium">
            Questions & Answers
          </span>
          <h2 className="section-heading mt-4">Frequently Asked Questions</h2>
          <p className="section-subheading">Find answers to the most common questions about our WhatsApp service.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className={cn(
                "border rounded-lg overflow-hidden transition-all duration-300 opacity-0 animate-fade-up",
                openIndex === index ? "shadow-md" : "shadow-sm",
                `delay-${index * 100}`
              )}
            >
              <button
                className="flex justify-between items-center w-full p-4 text-left bg-white hover:bg-gray-50 transition-colors"
                onClick={() => toggleFAQ(index)}
              >
                <span className="font-medium">{faq.question}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={cn(
                    "h-5 w-5 transition-transform duration-300",
                    openIndex === index ? "transform rotate-180" : ""
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div 
                className={cn(
                  "overflow-hidden transition-all duration-300 bg-white",
                  openIndex === index ? "max-h-96 py-4 px-4" : "max-h-0"
                )}
              >
                <p className="text-muted-foreground">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center opacity-0 animate-fade-up delay-500">
          <p className="text-muted-foreground mb-4">Still have questions?</p>
          <a 
            href="https://wa.me/1234567890" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-whatsapp hover:text-whatsapp-dark font-medium inline-flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            Chat with us on WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
