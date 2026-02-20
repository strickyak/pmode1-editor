
import React from 'react';
import { Tool } from '../types';
import { PALETTE_NAMES_SET } from '../constants';

interface SidebarProps {
  currentTool: Tool;
  setTool: (tool: Tool) => void;
  currentColorIdx: number;
  setColorIdx: (idx: number) => void;
  isPermuteActive: boolean;
  onTogglePermute: () => void;
  onTogglePalette: () => void;
  paletteIdx: number;
  palette: string[];
  fontSizeIdx?: number;
  setFontSizeIdx?: (idx: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentTool, 
  setTool, 
  currentColorIdx, 
  setColorIdx,
  isPermuteActive,
  onTogglePermute,
  onTogglePalette,
  paletteIdx,
  palette,
  fontSizeIdx = 0,
  setFontSizeIdx
}) => {
  const tools = [
    { id: Tool.Pencil, label: '✎', title: 'Pencil' },
    { id: Tool.Eraser, label: '▧', title: 'Eraser' },
    { id: Tool.Bucket, label: '🪣', title: 'Fill' },
    { id: Tool.Line, label: '╱', title: 'Line' },
    { id: Tool.Rect, label: '□', title: 'Rectangle' },
    { id: Tool.Circle, label: '○', title: 'Circle' },
    { id: Tool.Text, label: 'T', title: 'Text' },
    { id: Tool.Copy, label: '❐', title: 'Copy' },
    { id: Tool.Paste, label: '📋', title: 'Paste' },
  ];

  const paletteNames = PALETTE_NAMES_SET[paletteIdx];

  return (
    <aside className="w-24 bg-[#222] border-r-4 border-black p-2 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
      <div>
        <h3 className="text-center text-[10px] mb-1 text-gray-500 uppercase font-bold">Tools</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => {
                setTool(tool.id);
                if (isPermuteActive) onTogglePermute();
              }}
              title={tool.title}
              className={`retro-button w-8 h-8 flex items-center justify-center text-lg ${
                currentTool === tool.id && !isPermuteActive ? 'bg-yellow-500 text-black' : 'bg-gray-300 text-black'
              }`}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      {currentTool === Tool.Text && setFontSizeIdx && (
        <div className="flex flex-col gap-1 bg-black bg-opacity-20 p-1 rounded">
          <h3 className="text-center text-[9px] text-gray-500 uppercase font-bold">Size</h3>
          {[3, 4, 5].map((size, idx) => (
            <button
              key={size}
              onClick={() => setFontSizeIdx(idx)}
              className={`text-[10px] py-0.5 border ${
                fontSizeIdx === idx ? 'bg-white text-black' : 'bg-gray-700 text-white'
              }`}
            >
              {size === 3 ? '3x5' : size === 4 ? '4x6' : '5x7'}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-1.5">
        <h3 className="text-center text-[10px] text-gray-500 uppercase font-bold">Modes</h3>
        <button
          onClick={onTogglePermute}
          className={`retro-button w-full py-1 text-[10px] font-bold ${
            isPermuteActive ? 'bg-purple-600 text-white' : 'bg-gray-300 text-black hover:bg-white'
          }`}
        >
          PERMUTE
        </button>
        <button
          onClick={onTogglePalette}
          className="retro-button w-full py-1 text-[10px] font-bold bg-blue-600 text-white hover:bg-blue-500"
        >
          ALT
        </button>
      </div>

      <div>
        <h3 className="text-center text-[10px] mb-1 text-gray-500 uppercase font-bold">Colors</h3>
        <div className="flex flex-col gap-1.5">
          {palette.map((color, idx) => (
            <button
              key={idx}
              onClick={() => setColorIdx(idx)}
              className={`w-full h-7 retro-border border-2 ${
                currentColorIdx === idx ? 'ring-2 ring-white scale-105' : ''
              }`}
              style={{ backgroundColor: color }}
              title={paletteNames[idx]}
            />
          ))}
        </div>
      </div>

      <div className="mt-auto flex flex-col items-center border-t border-gray-700 pt-2">
        <div 
          className="w-10 h-10 retro-border border-2" 
          style={{ backgroundColor: palette[currentColorIdx] }}
        />
        <span className="text-[9px] mt-1 text-gray-400 text-center leading-tight">
          {paletteNames[currentColorIdx]}
        </span>
      </div>
    </aside>
  );
};

export default Sidebar;
