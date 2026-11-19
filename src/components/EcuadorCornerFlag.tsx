import React from 'react';

/**
 * Detalle sutil de la Bandera de Ecuador en la esquina diagonal.
 * Proporción constitucional: Amarillo (50%), Azul (25%), Rojo (25%).
 */
export const EcuadorCornerFlag: React.FC = () => {
  return (
    <div 
      className="fixed top-0 right-0 z-50 pointer-events-none select-none print:hidden overflow-hidden w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28"
      aria-label="Bandera de la República del Ecuador"
    >
      <div 
        className="relative w-full h-full group"
        title="República del Ecuador · Operaciones Tesalia cbc & Liderman"
      >
        <svg 
          viewBox="0 0 120 120" 
          className="w-full h-full drop-shadow-[0_2px_10px_rgba(0,0,0,0.18)] transition-transform duration-300 group-hover:scale-105"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Degradados sutiles para acabado sedoso / satinado */}
            <linearGradient id="ec-yellow-grad" x1="60" y1="0" x2="120" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFE135" />
              <stop offset="55%" stopColor="#FFD100" />
              <stop offset="100%" stopColor="#F5B800" />
            </linearGradient>
            
            <linearGradient id="ec-blue-grad" x1="45" y1="0" x2="120" y2="75" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#006BB6" />
              <stop offset="100%" stopColor="#004A8F" />
            </linearGradient>
            
            <linearGradient id="ec-red-grad" x1="25" y1="0" x2="120" y2="95" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#EE2737" />
              <stop offset="100%" stopColor="#C8102E" />
            </linearGradient>

            {/* Sombra proyectada suave del corte diagonal */}
            <filter id="ec-ribbon-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="-1.5" dy="2.5" stdDeviation="2.5" floodColor="#0f172a" floodOpacity="0.28" />
            </filter>
          </defs>

          {/* Grupo de franjas diagonales */}
          <g filter="url(#ec-ribbon-shadow)">
            {/* Franja Amarilla (50% de la proporción de la bandera de Ecuador) */}
            <polygon 
              points="60,0 120,0 120,60" 
              fill="url(#ec-yellow-grad)" 
            />
            
            {/* Línea divisoria nítida para alta definición */}
            <line 
              x1="60" y1="0" x2="120" y2="60" 
              stroke="rgba(255, 255, 255, 0.45)" 
              strokeWidth="0.8" 
            />

            {/* Franja Azul (25% de la proporción) */}
            <polygon 
              points="60,0 120,60 120,85 35,0" 
              fill="url(#ec-blue-grad)" 
            />

            <line 
              x1="35" y1="0" x2="120" y2="85" 
              stroke="rgba(255, 255, 255, 0.35)" 
              strokeWidth="0.8" 
            />

            {/* Franja Roja (25% de la proporción) */}
            <polygon 
              points="35,0 120,85 120,110 10,0" 
              fill="url(#ec-red-grad)" 
            />

            {/* Borde exterior sutil para acabado premium */}
            <line 
              x1="10" y1="0" x2="120" y2="110" 
              stroke="rgba(0, 0, 0, 0.15)" 
              strokeWidth="0.6" 
            />
          </g>

          {/* Brillo diagonal reflectivo de cinta oficial */}
          <polygon 
            points="120,0 120,25 95,0" 
            fill="white" 
            opacity="0.18" 
          />
        </svg>
      </div>
    </div>
  );
};
