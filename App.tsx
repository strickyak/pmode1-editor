
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Tool, ColorHex, Point } from './types';
import { WIDTH, HEIGHT, PALETTES, PALETTE_NAMES_SET, ZOOM } from './constants';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import CanvasEditor from './components/CanvasEditor';
import PermutationView from './components/PermutationView';

interface RawImport {
  imageData: ImageData;
  bgIndex: number;
}

interface Scrap {
  data: Uint8Array;
  w: number;
  h: number;
}

const App: React.FC = () => {
  const [currentTool, setCurrentTool] = useState<Tool>(Tool.Pencil);
  const [currentColorIdx, setCurrentColorIdx] = useState<number>(3);
  const [paletteIdx, setPaletteIdx] = useState<number>(0);
  const [pixelData, setPixelData] = useState<Uint8Array>(new Uint8Array(WIDTH * HEIGHT).fill(0));
  const [history, setHistory] = useState<Uint8Array[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isPermutationMode, setIsPermutationMode] = useState(false);
  const [fontSizeIdx, setFontSizeIdx] = useState(2); // Default to 5x7
  const [scrap, setScrap] = useState<Scrap | null>(null);
  
  const [rawImport, setRawImport] = useState<RawImport | null>(null);
  const [importWeights, setImportWeights] = useState<number[]>([0, 0, 0, 0]);

  const currentPalette = useMemo(() => PALETTES[paletteIdx], [paletteIdx]);
  
  const paletteRGB = useMemo(() => {
    return currentPalette.map(hex => ({
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16)
    }));
  }, [currentPalette]);

  useEffect(() => {
    const initialData = new Uint8Array(WIDTH * HEIGHT).fill(0);
    setHistory([initialData]);
    setHistoryIndex(0);
  }, []);

  const saveToHistory = useCallback((newData: Uint8Array) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(new Uint8Array(newData));
    if (newHistory.length > 50) newHistory.shift();
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const commitImportAdjustment = useCallback(() => {
    if (rawImport) setRawImport(null);
  }, [rawImport]);

  const undo = useCallback(() => {
    commitImportAdjustment();
    if (historyIndex > 0) {
      const prevData = history[historyIndex - 1];
      setPixelData(new Uint8Array(prevData));
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex, commitImportAdjustment]);

  const redo = useCallback(() => {
    commitImportAdjustment();
    if (historyIndex < history.length - 1) {
      const nextData = history[historyIndex + 1];
      setPixelData(new Uint8Array(nextData));
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex, commitImportAdjustment]);

  const clearCanvas = useCallback(() => {
    setRawImport(null);
    const cleared = new Uint8Array(WIDTH * HEIGHT).fill(0);
    setPixelData(cleared);
    saveToHistory(cleared);
    if (currentColorIdx === 0) {
      setCurrentColorIdx(3);
    }
  }, [saveToHistory, currentColorIdx]);

  const commitPixels = useCallback((newData: Uint8Array) => {
    setRawImport(null);
    setPixelData(newData);
    saveToHistory(newData);
  }, [saveToHistory]);

  const setPixelsLive = useCallback((newData: Uint8Array) => {
    setPixelData(newData);
  }, []);

  const applyPermutation = useCallback((mapping: number[]) => {
    setRawImport(null);
    const newData = new Uint8Array(WIDTH * HEIGHT);
    for (let i = 0; i < pixelData.length; i++) {
      newData[i] = mapping[pixelData[i]];
    }
    setPixelData(newData);
    saveToHistory(newData);
    setIsPermutationMode(false);
  }, [pixelData, saveToHistory]);

  const togglePalette = useCallback(() => {
    setPaletteIdx((prev) => (prev === 0 ? 1 : 0));
  }, []);

  const quantize = useCallback((imgData: ImageData, weights: number[]): Uint8Array => {
    const newData = new Uint8Array(WIDTH * HEIGHT);
    const weightMultipliers = weights.map(w => Math.pow(2, -w));
    for (let i = 0; i < imgData.data.length; i += 4) {
      const r = imgData.data[i];
      const g = imgData.data[i + 1];
      const b = imgData.data[i + 2];
      let minIdx = 0, minDistance = Infinity;
      for (let p = 0; p < paletteRGB.length; p++) {
        const pr = paletteRGB[p].r, pg = paletteRGB[p].g, pb = paletteRGB[p].b;
        const distSq = Math.pow(r - pr, 2) + Math.pow(g - pg, 2) + Math.pow(b - pb, 2);
        const adjustedDist = distSq * weightMultipliers[p];
        if (adjustedDist < minDistance) { minDistance = adjustedDist; minIdx = p; }
      }
      newData[i / 4] = minIdx;
    }
    return newData;
  }, [paletteRGB]);

  useEffect(() => {
    if (rawImport) {
      const newData = quantize(rawImport.imageData, importWeights);
      setPixelData(newData);
    }
  }, [rawImport, importWeights, quantize]);

  const handleImport = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = WIDTH; canvas.height = HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = currentPalette[0];
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        const targetAspect = WIDTH / HEIGHT;
        const imgAspect = img.width / img.height;
        let dw, dh, dx, dy;
        if (imgAspect > targetAspect) { dw = WIDTH; dh = WIDTH / imgAspect; dx = 0; dy = (HEIGHT - dh) / 2; }
        else { dh = HEIGHT; dw = HEIGHT * imgAspect; dy = 0; dx = (WIDTH - dw) / 2; }
        ctx.drawImage(img, dx, dy, dw, dh);
        const imgData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
        setImportWeights([0, 0, 0, 0]);
        const initialPixels = quantize(imgData, [0, 0, 0, 0]);
        setRawImport({ imageData: imgData, bgIndex: 0 });
        setPixelData(initialPixels);
        saveToHistory(initialPixels);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [currentPalette, quantize, saveToHistory]);

  const handleWeightChange = (idx: number, val: number) => {
    const newWeights = [...importWeights];
    newWeights[idx] = val;
    setImportWeights(newWeights);
  };

  const handleWeightCommit = () => saveToHistory(new Uint8Array(pixelData));

  const downloadPNG = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH; canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.createImageData(WIDTH, HEIGHT);
    for (let i = 0; i < pixelData.length; i++) {
      const colorHex = currentPalette[pixelData[i]];
      const r = parseInt(colorHex.slice(1, 3), 16), g = parseInt(colorHex.slice(3, 5), 16), b = parseInt(colorHex.slice(5, 7), 16);
      const idx = i * 4; imageData.data[idx] = r; imageData.data[idx + 1] = g; imageData.data[idx + 2] = b; imageData.data[idx + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    const link = document.createElement('a'); link.download = 'pmode1_artwork.png'; link.href = canvas.toDataURL(); link.click();
  }, [pixelData, currentPalette]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] select-none">
      <Header 
        undo={undo} redo={redo} canUndo={historyIndex > 0} canRedo={historyIndex < history.length - 1}
        download={downloadPNG} clear={clearCanvas} onImport={handleImport}
        importWeights={rawImport ? importWeights : null} onWeightChange={handleWeightChange} onWeightCommit={handleWeightCommit}
        palette={currentPalette}
      />
      <main className="flex flex-1 overflow-hidden">
        <Sidebar 
          currentTool={currentTool} setTool={setCurrentTool} currentColorIdx={currentColorIdx} setColorIdx={setCurrentColorIdx}
          isPermuteActive={isPermutationMode} onTogglePermute={() => setIsPermutationMode(!isPermutationMode)} onTogglePalette={togglePalette}
          paletteIdx={paletteIdx} palette={currentPalette} fontSizeIdx={fontSizeIdx} setFontSizeIdx={setFontSizeIdx}
        />
        <div className="flex-1 flex items-center justify-center bg-[#333] p-8 overflow-auto custom-scrollbar">
          {isPermutationMode ? (
            <PermutationView pixelData={pixelData} onSelect={applyPermutation} onCancel={() => setIsPermutationMode(false)} palette={currentPalette} />
          ) : (
            <CanvasEditor 
              pixelData={pixelData} commitPixels={commitPixels} setPixelsLive={setPixelsLive} currentTool={currentTool} currentColorIdx={currentColorIdx}
              width={WIDTH} height={HEIGHT} zoom={ZOOM} palette={currentPalette} fontSizeIdx={fontSizeIdx}
              scrap={scrap} setScrap={setScrap}
            />
          )}
        </div>
      </main>
      <footer className="h-8 bg-[#000] border-t-2 border-[#444] px-4 flex items-center justify-between text-xs text-gray-400">
        <div>128 x 96 | PMODE 1 | ZOOM: {ZOOM}x | PALETTE: {paletteIdx === 0 ? 'GRYB' : 'BCMO'}</div>
        <div>{isPermutationMode ? 'PERMUTATION MODE' : `${currentTool.toUpperCase()} | COLOR: ${currentColorIdx}`}</div>
      </footer>
    </div>
  );
};

export default App;
