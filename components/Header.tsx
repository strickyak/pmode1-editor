
import React, { useRef } from 'react';

interface HeaderProps {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  download: () => void;
  clear: () => void;
  onImport: (file: File) => void;
  importWeights: number[] | null;
  onWeightChange: (idx: number, val: number) => void;
  onWeightCommit: () => void;
  palette: string[];
}

const Header: React.FC<HeaderProps> = ({ 
  undo, 
  redo, 
  canUndo, 
  canRedo, 
  download, 
  clear, 
  onImport,
  importWeights,
  onWeightChange,
  onWeightCommit,
  palette
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = '';
    }
  };

  return (
    <header className="bg-[#111] border-b-4 border-[#000] p-4 flex items-center justify-between z-10">
      <div className="flex items-center gap-4 shrink-0">
        <h1 className="text-3xl font-bold text-yellow-500 tracking-widest drop-shadow-md">
          PMODE1 EDITOR
        </h1>
      </div>

      {/* Middle Section: Sliders */}
      <div className="flex-1 mx-8 flex justify-center items-center gap-8 min-w-0 overflow-hidden">
        {importWeights && (
          <div className="flex items-center gap-6 bg-black bg-opacity-40 p-2 px-6 border-x border-gray-800 rounded-lg">
            <span className="text-xs text-blue-400 font-bold uppercase tracking-tighter whitespace-nowrap">IMPORT BIAS:</span>
            {importWeights.map((weight, idx) => (
              <div key={idx} className="flex flex-col items-center w-32 gap-1">
                <div className="flex items-center gap-2 w-full justify-between">
                  <div className="w-4 h-4 border border-gray-600 rounded-sm" style={{backgroundColor: palette[idx]}} />
                  <span className="text-[10px] text-gray-300 font-mono">{weight > 0 ? '+' : ''}{weight.toFixed(1)}</span>
                </div>
                <input 
                  type="range"
                  min="-3"
                  max="3"
                  step="0.1"
                  value={weight}
                  onChange={(e) => onWeightChange(idx, parseFloat(e.target.value))}
                  onMouseUp={onWeightCommit}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 shrink-0">
        <button 
          onClick={undo}
          disabled={!canUndo}
          className={`retro-button px-4 py-1 text-xl ${canUndo ? 'bg-gray-200 text-black' : 'bg-gray-600 text-gray-400 opacity-50'}`}
        >
          UNDO
        </button>
        <button 
          onClick={redo}
          disabled={!canRedo}
          className={`retro-button px-4 py-1 text-xl ${canRedo ? 'bg-gray-200 text-black' : 'bg-gray-600 text-gray-400 opacity-50'}`}
        >
          REDO
        </button>
        <button 
          onClick={clear}
          className="retro-button px-4 py-1 bg-red-600 text-white text-xl hover:bg-red-500"
        >
          CLEAR
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/png, image/jpeg, image/gif"
          onChange={handleFileChange}
        />
        <button 
          onClick={handleImportClick}
          className="retro-button px-4 py-1 bg-blue-600 text-white text-xl hover:bg-blue-500"
        >
          IMPORT
        </button>
        <button 
          onClick={download}
          className="retro-button px-4 py-1 bg-green-600 text-white text-xl hover:bg-green-500"
        >
          EXPORT
        </button>
      </div>
    </header>
  );
};

export default Header;
