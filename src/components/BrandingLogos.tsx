import React from 'react';

export const TesaliaLogo: React.FC<{ className?: string }> = ({ className = "h-9" }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Molecule / Springs icon of Tesalia */}
      <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          {/* Cyan / Teal / Lime water drops clover */}
          <circle cx="35" cy="35" r="18" fill="#00A896" />
          <circle cx="65" cy="35" r="18" fill="#F4A261" />
          <circle cx="35" cy="65" r="18" fill="#2A9D8F" />
          <circle cx="65" cy="65" r="18" fill="#8AC926" />
          <circle cx="50" cy="50" r="10" fill="#ffffff" />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-1">
          tesalia <span className="text-teal-600 font-extrabold text-sm tracking-wider">springs</span>
        </span>
        <span className="text-xs font-bold text-slate-500 tracking-widest uppercase">
          cbc
        </span>
      </div>
    </div>
  );
};

export const LidermanLogo: React.FC<{ className?: string, showSlogan?: boolean }> = ({ 
  className = "h-9", 
  showSlogan = true 
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Iconic Liderman Guardian Silhouette with open arms */}
      <div className="relative w-9 h-9 shrink-0 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-600/30">
        <svg viewBox="0 0 100 100" className="w-7 h-7 fill-white">
          {/* Head */}
          <circle cx="50" cy="18" r="9" />
          {/* Body & outstretched arms - Liderman guardian */}
          <path d="M50 32 L36 44 L20 40 L16 46 L32 54 L38 52 L38 68 L28 88 L38 90 L50 72 L62 90 L72 88 L62 68 L62 52 L68 54 L84 46 L80 40 L64 44 Z" />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-lg font-black tracking-wider text-red-500 font-display">
          LIDERMAN
        </span>
        {showSlogan && (
          <span className="text-[9px] font-semibold text-slate-500 tracking-tight italic mt-0.5">
            Valemos tanto como lo que cuidamos
          </span>
        )}
      </div>
    </div>
  );
};
