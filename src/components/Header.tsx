
import React from 'react';
import { cn } from '@/lib/utils';

const Header: React.FC = () => {
  return (
    <header className="py-6 px-4 border-b sticky top-0 z-50 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-full bg-whatsapp flex items-center justify-center shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
          <h1 className="text-xl font-bold">WhatsApp Business</h1>
        </div>
        <nav>
          <ul className="flex space-x-8">
            <li>
              <a href="#benefits" className="text-sm font-medium hover:text-whatsapp transition-colors">
                Benefits
              </a>
            </li>
            <li>
              <a href="#how-it-works" className="text-sm font-medium hover:text-whatsapp transition-colors">
                How It Works
              </a>
            </li>
            <li>
              <a href="#faq" className="text-sm font-medium hover:text-whatsapp transition-colors">
                FAQ
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
