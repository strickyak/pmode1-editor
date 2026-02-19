
import React, { useMemo, useEffect, useRef } from 'react';
import { WIDTH, HEIGHT } from '../constants';

interface PermutationViewProps {
  pixelData: Uint8Array;
  onSelect: (mapping: number[]) => void;
  onCancel: () => void;
  palette: string[];
}

const PermutationView: React.FC<PermutationViewProps> = ({ pixelData, onSelect, onCancel, palette }) => {
  const permutations = useMemo(() => {
    const results: number[][] = [];
    const arr = [0, 1, 2, 3];

    const permute = (a: number[], m: number[] = []) => {
      if (a.length === 0) {
        results.push(m);
      } else {
        for (let i = 0; i < a.length; i++) {
          const curr = a.slice();
          const next = curr.splice(i, 1);
          permute(curr.slice(), m.concat(next));
        }
      }
    };

    permute(arr);
    return results;
  }, []);

  return (
    <div className="flex flex-col items-center w-full h-full max-w-6xl">
      <div className="flex justify-between items-center w-full mb-6">
        <h2 className="text-4xl text-yellow-400 drop-shadow-lg uppercase">Color Swap Matrix</h2>
        <button 
          onClick={onCancel}
          className="retro-button px-6 py-2 bg-gray-600 text-white text-xl hover:bg-gray-500"
        >
          BACK TO DRAW
        </button>
      </div>
      
      <div className="grid grid-cols-4 md:grid-cols-6 gap-4 p-4 bg-[#111] retro-border w-full">
        {permutations.map((p, idx) => (
          <PermutationIcon 
            key={idx} 
            mapping={p} 
            pixelData={pixelData} 
            onClick={() => onSelect(p)} 
            palette={palette}
          />
        ))}
      </div>
    </div>
  );
};

interface IconProps {
  mapping: number[];
  pixelData: Uint8Array;
  onClick: () => void;
  palette: string[];
}

const PermutationIcon: React.FC<IconProps> = ({ mapping, pixelData, onClick, palette }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(WIDTH, HEIGHT);
    for (let i = 0; i < pixelData.length; i++) {
      const originalIndex = pixelData[i];
      const mappedIndex = mapping[originalIndex];
      const colorHex = palette[mappedIndex];
      
      const r = parseInt(colorHex.slice(1, 3), 16);
      const g = parseInt(colorHex.slice(3, 5), 16);
      const b = parseInt(colorHex.slice(5, 7), 16);
      
      const idx = i * 4;
      imageData.data[idx] = r;
      imageData.data[idx + 1] = g;
      imageData.data[idx + 2] = b;
      imageData.data[idx + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }, [pixelData, mapping, palette]);

  const isTrivial = mapping.every((v, i) => v === i);

  return (
    <div 
      onClick={onClick}
      className={`relative group cursor-pointer retro-border border-2 overflow-hidden hover:scale-105 transition-transform ${
        isTrivial ? 'ring-2 ring-yellow-400' : ''
      }`}
    >
      <canvas 
        ref={canvasRef} 
        width={WIDTH} 
        height={HEIGHT} 
        className="w-full h-auto block"
        style={{ imageRendering: 'pixelated' }}
      />
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 flex items-center justify-center">
        {isTrivial && (
          <span className="bg-black bg-opacity-60 text-yellow-400 text-[10px] px-1 absolute top-0 right-0">ORIGINAL</span>
        )}
      </div>
      <div className="absolute bottom-0 left-0 w-full flex justify-around bg-black bg-opacity-80 text-[8px] py-0.5 border-t border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
        {mapping.map((m, i) => (
          <div key={i} className="flex gap-0.5 items-center">
             <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: palette[i]}} />
             <span>➜</span>
             <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: palette[m]}} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PermutationView;
