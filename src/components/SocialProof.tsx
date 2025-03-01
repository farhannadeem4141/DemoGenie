
import React from 'react';

const brands = [
  { name: "Company A", logo: "A" },
  { name: "Company B", logo: "B" },
  { name: "Company C", logo: "C" },
  { name: "Company D", logo: "D" },
  { name: "Company E", logo: "E" }
];

const SocialProof: React.FC = () => {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 opacity-0 animate-fade-up">
          <p className="text-xl font-medium text-muted-foreground">
            Trusted by 10,000+ happy customers
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-0 animate-fade-up delay-200">
          {brands.map((brand, index) => (
            <div 
              key={index} 
              className="h-10 flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300"
            >
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center font-bold text-xl text-gray-500">
                {brand.logo}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-16 max-w-3xl mx-auto text-center opacity-0 animate-fade-up delay-300">
          <div className="relative">
            <svg className="absolute top-0 left-0 transform -translate-x-6 -translate-y-8 h-16 w-16 text-gray-100" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M7.39762 10.3C7.39762 11.0733 7.14888 11.7 6.6514 12.18C6.15392 12.6333 5.52552 12.86 4.7662 12.86C3.84036 12.86 3.09056 12.5533 2.5168 11.94C1.94304 11.3266 1.6562 10.4467 1.6562 9.3C1.6562 8.2333 1.8836 7.2833 2.3384 6.45C2.7932 5.59 3.3944 4.83333 4.1422 4.18C4.89 3.50333 5.6856 2.93667 6.5292 2.48C7.3728 2.02333 8.19 1.68333 8.9808 1.46L9.7858 3.38C9.2162 3.55333 8.6302 3.77333 8.0278 4.04C7.4254 4.28 6.85548 4.57333 6.31804 4.92C5.78061 5.24 5.3052 5.63333 4.8924 6.1C4.47961 6.54 4.18165 7.06667 3.99853 7.68C4.18165 7.63333 4.44093 7.61 4.77637 7.61C5.53578 7.61 6.15203 7.84333 6.62513 8.31C7.09823 8.77667 7.39762 9.45333 7.39762 10.34V10.3ZM15.3472 10.3C15.3472 11.0733 15.0984 11.7 14.6009 12.18C14.1034 12.6333 13.4751 12.86 12.7157 12.86C11.7899 12.86 11.0401 12.5533 10.4663 11.94C9.89257 11.3266 9.60573 10.4467 9.60573 9.3C9.60573 8.2333 9.83312 7.2833 10.2879 6.45C10.7427 5.59 11.3439 4.83333 12.0917 4.18C12.8395 3.50333 13.6351 2.93667 14.4787 2.48C15.3223 2.02333 16.1395 1.68333 16.9303 1.46L17.7353 3.38C17.1657 3.55333 16.5797 3.77333 15.9773 4.04C15.3749 4.28 14.805 4.57333 14.2675 4.92C13.7301 5.24 13.2547 5.63333 12.8419 6.1C12.4291 6.54 12.1312 7.06667 11.948 7.68C12.1312 7.63333 12.3905 7.61 12.7259 7.61C13.4853 7.61 14.1016 7.84333 14.5747 8.31C15.0478 8.77667 15.3472 9.45333 15.3472 10.34V10.3Z" fill="currentColor" />
            </svg>
            <p className="relative text-xl text-gray-600 italic">
              "The WhatsApp service has transformed how we interact with our customers. The instant responses have significantly improved customer satisfaction and streamlined our support process."
            </p>
            <svg className="absolute bottom-0 right-0 transform translate-x-6 translate-y-8 h-16 w-16 text-gray-100" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M9.60538 5.7C9.60538 4.92667 9.85412 4.3 10.3516 3.82C10.8491 3.31333 11.4775 3.08667 12.2368 3.08667C13.1626 3.08667 13.9124 3.39333 14.4862 4.01C15.0599 4.62333 15.3468 5.50333 15.3468 6.65C15.3468 7.71667 15.1194 8.66667 14.6646 9.5C14.2098 10.31 13.6086 11.0667 12.8608 11.72C12.113 12.3733 11.3174 12.94 10.4738 13.42C9.63015 13.8767 8.81295 14.2167 8.02217 14.44L7.21717 12.52C7.78677 12.3467 8.37277 12.1267 8.97517 11.86C9.57757 11.62 10.1475 11.3267 10.6849 10.98C11.2223 10.66 11.6977 10.2667 12.1105 9.8C12.5233 9.36 12.8213 8.83333 13.0044 8.22C12.8213 8.26667 12.562 8.29 12.2266 8.29C11.4672 8.29 10.851 8.05667 10.3779 7.59C9.9048 7.12333 9.60538 6.44667 9.60538 5.56L9.60538 5.7ZM1.65577 5.7C1.65577 4.92667 1.90452 4.3 2.40199 3.82C2.89947 3.31333 3.52787 3.08667 4.28719 3.08667C5.21303 3.08667 5.96283 3.39333 6.53659 4.01C7.11035 4.62333 7.39719 5.50333 7.39719 6.65C7.39719 7.71667 7.1698 8.66667 6.715 9.5C6.2602 10.31 5.65899 11.0667 4.91119 11.72C4.1634 12.3733 3.36779 12.94 2.52419 13.42C1.68059 13.8767 0.863396 14.2167 0.0726242 14.44L-0.732376 12.52C-0.162776 12.3467 0.423224 12.1267 1.02562 11.86C1.62802 11.62 2.19794 11.3267 2.73537 10.98C3.2728 10.66 3.74822 10.2667 4.161 9.8C4.57379 9.36 4.87176 8.83333 5.05488 8.22C4.87176 8.26667 4.61248 8.29 4.27705 8.29C3.51763 8.29 2.90139 8.05667 2.42829 7.59C1.95519 7.12333 1.65577 6.44667 1.65577 5.56L1.65577 5.7Z" fill="currentColor" />
            </svg>
          </div>
          <div className="mt-8">
            <p className="font-semibold">Jane Smith</p>
            <p className="text-sm text-muted-foreground">Marketing Director at Brand Co.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
