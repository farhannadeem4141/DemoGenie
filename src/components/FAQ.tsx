
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

const faqs = [
  {
    question: "Is WhatsApp Business free?",
    answer: "Yes! You can start for free with essential tools. Advanced API features are available for businesses scaling up."
  },
  {
    question: "Will I receive spam messages?",
    answer: "No. Customers opt-in to receive your messages, ensuring high engagement without spam."
  },
  {
    question: "Can I use WhatsApp Business with my personal number?",
    answer: "Yes! You can either use a separate number or switch your existing WhatsApp to a Business account."
  },
  {
    question: "How many customers can I message at once?",
    answer: "WhatsApp Business allows you to send broadcasts to multiple customers at once, though there are limits to prevent spam. The WhatsApp Business API offers expanded broadcasting capabilities for larger businesses."
  },
  {
    question: "Can I track results from my WhatsApp marketing?",
    answer: "Yes, WhatsApp Business provides analytics on message delivery, read receipts, and customer interactions to help you measure your campaign effectiveness."
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
          <h2 className="section-heading mt-4 text-3xl font-bold">Frequently Asked Questions</h2>
          <p className="section-subheading text-xl text-muted-foreground">Find answers to common questions about WhatsApp Business.</p>
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
                <span className="font-medium">💬 {faq.question}</span>
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
