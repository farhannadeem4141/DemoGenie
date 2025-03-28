
import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="bg-white py-4 border-b">
      <div className="container mx-auto flex justify-between items-center px-4">
        <div className="flex items-center">
          <Link to="/" className="font-bold text-2xl text-green-600">WhatsApp Business</Link>
        </div>
        <nav>
          <ul className="flex space-x-6">
            <li><Link to="/" className="hover:text-green-600 transition-colors">Home</Link></li>
            {/* Database link removed as requested */}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
