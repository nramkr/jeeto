import React, { useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface DiagramRendererProps {
  url: string;
  description?: string;
}

export default function DiagramRenderer({ url, description }: DiagramRendererProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <div className="mb-6">
      <div 
        className={`relative group cursor-pointer overflow-hidden rounded-xl border border-brand-blue-soft bg-white transition-all duration-300 ${
          isZoomed ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4' : 'max-h-96'
        }`}
        onClick={() => setIsZoomed(!isZoomed)}
      >
        <img
          src={url}
          alt={description || "Question Diagram"}
          referrerPolicy="no-referrer"
          className={`transition-transform duration-300 ${
            isZoomed ? 'max-h-full max-w-full object-contain' : 'w-full object-contain group-hover:scale-[1.02]'
          }`}
        />
        
        <div className="absolute top-4 right-4 p-2 bg-white/90 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
          {isZoomed ? <Minimize2 size={20} className="text-slate-700" /> : <Maximize2 size={20} className="text-slate-700" />}
        </div>

        {!isZoomed && description && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/50 to-transparent">
            <p className="text-xs text-white truncate">{description}</p>
          </div>
        )}
      </div>
      
      {isZoomed && (
        <button 
          className="fixed top-8 right-8 z-[60] text-white hover:text-brand-blue-medium transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomed(false);
          }}
        >
          <Minimize2 size={32} />
        </button>
      )}
    </div>
  );
}
