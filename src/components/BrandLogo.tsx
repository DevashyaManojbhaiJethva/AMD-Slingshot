import React from 'react';
import { Sprout } from 'lucide-react';

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
};

export const BrandLogo: React.FC<BrandLogoProps> = ({ compact = false, className = '' }) => {
  return (
    <div className={`flex items-center ${compact ? 'space-x-2' : 'space-x-3'} ${className}`}>
      <div className={`relative ${compact ? 'w-8 h-8' : 'w-10 h-10'}`}>
        <div className="absolute inset-0 rounded-xl bg-agri-green/15 blur-[1px]" />
        <div className="relative w-full h-full rounded-xl bg-gradient-to-br from-agri-green to-agri-leaf flex items-center justify-center shadow-md shadow-agri-green/20 ring-1 ring-white/40 dark:ring-white/10">
          <Sprout className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-white`} />
        </div>
      </div>
      <div className="leading-tight">
        <p className={`${compact ? 'text-lg' : 'text-xl'} font-display font-bold text-agri-green dark:text-agri-leaf`}>
          AgriSoil AI
        </p>
        {!compact && (
          <p className="text-[11px] tracking-wide text-earth-600 dark:text-zinc-400">Smart Soil Intelligence</p>
        )}
      </div>
    </div>
  );
};
