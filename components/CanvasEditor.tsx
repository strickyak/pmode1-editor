
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Tool, Point } from '../types';
import { FONTS, getCharBitmap, Font } from '../fonts';

interface Scrap {
  data: Uint8Array;
  w: number;
  h: number;
}

interface CanvasEditorProps {
  pixelData: Uint8Array;
  commitPixels: (data: Uint8Array) => void;
  setPixelsLive: (data: Uint8Array) => void;
  currentTool: Tool;
  currentColorIdx: number;
  width: number;
  height: number;
  zoom: number;
  palette: string[];
  fontSizeIdx: number;
  scrap: Scrap | null;
  setScrap: (scrap: Scrap) => void;
}

const CanvasEditor: React.FC<CanvasEditorProps> = ({
  pixelData,
  commitPixels,
  setPixelsLive,
  currentTool,
  currentColorIdx,
  width,
  height,
  zoom,
  palette,
  fontSizeIdx,
  scrap,
  setScrap
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [mousePoint, setMousePoint] = useState<Point>({ x: 0, y: 0 });
  const [inputText, setInputText] = useState("");

  const font = FONTS[fontSizeIdx];

  // Global key listener for text tool
  useEffect(() => {
    if (currentTool !== Tool.Text) {
      if (inputText !== "") setInputText("");
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modified keys
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Backspace') {
        setInputText(prev => prev.slice(0, -1));
      } else if (e.key.length === 1) {
        // Simple printable ASCII
        const code = e.key.charCodeAt(0);
        if (code >= 32 && code <= 126) {
          setInputText(prev => prev + e.key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTool, inputText]);

  // Main canvas redraw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < pixelData.length; i++) {
      const colorHex = palette[pixelData[i]];
      const r = parseInt(colorHex.slice(1, 3), 16);
      const g = parseInt(colorHex.slice(3, 5), 16);
      const b = parseInt(colorHex.slice(5, 7), 16);
      const idx = i * 4;
      imageData.data[idx] = r;
      imageData.data[idx+1] = g;
      imageData.data[idx+2] = b;
      imageData.data[idx+3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }, [pixelData, width, height, palette]);

  // Utility to draw text to a Uint8Array
  const bakeText = useCallback((data: Uint8Array, text: string, x: number, y: number, colorIdx: number, activeFont: Font) => {
    const totalWidth = text.length * (activeFont.width + 1) - 1;
    const startX = Math.round(x - totalWidth / 2);
    const startY = Math.round(y - activeFont.height / 2);

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const bitmap = getCharBitmap(activeFont, char);
      const charOffsetX = startX + i * (activeFont.width + 1);

      for (let row = 0; row < activeFont.height; row++) {
        const bits = bitmap[row];
        for (let col = 0; col < activeFont.width; col++) {
          if ((bits >> (activeFont.width - 1 - col)) & 1) {
            const px = charOffsetX + col;
            const py = startY + row;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              data[py * width + px] = colorIdx;
            }
          }
        }
      }
    }
  }, [width, height]);

  // Refresh overlay (cursor and preview shapes/text/paste/copy)
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Text preview
    if (currentTool === Tool.Text && inputText.length > 0) {
      const tempData = new Uint8Array(width * height).fill(255); 
      bakeText(tempData, inputText, mousePoint.x, mousePoint.y, currentColorIdx, font);
      const imgData = ctx.createImageData(width, height);
      for (let i = 0; i < tempData.length; i++) {
        if (tempData[i] === 255) continue;
        const colorHex = palette[tempData[i]];
        const idx = i * 4;
        imgData.data[idx] = parseInt(colorHex.slice(1, 3), 16);
        imgData.data[idx + 1] = parseInt(colorHex.slice(3, 5), 16);
        imgData.data[idx + 2] = parseInt(colorHex.slice(5, 7), 16);
        imgData.data[idx + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    // Paste preview
    if (currentTool === Tool.Paste && scrap) {
      const imgData = ctx.createImageData(width, height);
      // Initialize with fully transparent
      for (let i = 0; i < imgData.data.length; i+=4) imgData.data[i+3] = 0;

      const startX = Math.round(mousePoint.x - scrap.w / 2);
      const startY = Math.round(mousePoint.y - scrap.h / 2);

      for (let y = 0; y < scrap.h; y++) {
        for (let x = 0; x < scrap.w; x++) {
          const px = startX + x;
          const py = startY + y;
          if (px >= 0 && px < width && py >= 0 && py < height) {
            const colorIdx = scrap.data[y * scrap.w + x];
            const colorHex = palette[colorIdx];
            const targetIdx = (py * width + px) * 4;
            imgData.data[targetIdx] = parseInt(colorHex.slice(1, 3), 16);
            imgData.data[targetIdx + 1] = parseInt(colorHex.slice(3, 5), 16);
            imgData.data[targetIdx + 2] = parseInt(colorHex.slice(5, 7), 16);
            imgData.data[targetIdx + 3] = 180; // Semi-transparent preview
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }

    // Copy selection rectangle
    if (currentTool === Tool.Copy && isDrawing && startPoint) {
      const left = Math.min(startPoint.x, mousePoint.x);
      const top = Math.min(startPoint.y, mousePoint.y);
      const right = Math.max(startPoint.x, mousePoint.x);
      const bottom = Math.max(startPoint.y, mousePoint.y);
      
      ctx.strokeStyle = '#000000';
      ctx.setLineDash([2, 1]);
      ctx.strokeRect(left, top, right - left + 1, bottom - top + 1);
    }

  }, [currentTool, inputText, mousePoint, currentColorIdx, font, palette, width, height, bakeText, scrap, isDrawing, startPoint]);

  const getCanvasPoint = (e: React.MouseEvent | MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (rect.width / width));
    const y = Math.floor((e.clientY - rect.top) / (rect.height / height));
    return { 
        x: Math.max(0, Math.min(width - 1, x)), 
        y: Math.max(0, Math.min(height - 1, y)) 
    };
  };

  const drawPoint = (data: Uint8Array, x: number, y: number, colorIdx: number) => {
    if (x >= 0 && x < width && y >= 0 && y < height) data[y * width + x] = colorIdx;
  };

  const drawLine = (data: Uint8Array, x0: number, y0: number, x1: number, y1: number, colorIdx: number) => {
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      drawPoint(data, x0, y0, colorIdx);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  };

  const drawRect = (data: Uint8Array, x0: number, y0: number, x1: number, y1: number, colorIdx: number) => {
    const left = Math.min(x0, x1), right = Math.max(x0, x1);
    const top = Math.min(y0, y1), bottom = Math.max(y0, y1);
    for (let x = left; x <= right; x++) { drawPoint(data, x, top, colorIdx); drawPoint(data, x, bottom, colorIdx); }
    for (let y = top; y <= bottom; y++) { drawPoint(data, left, y, colorIdx); drawPoint(data, right, y, colorIdx); }
  };

  const drawCircle = (data: Uint8Array, xc: number, yc: number, x1: number, y1: number, colorIdx: number) => {
    const r = Math.floor(Math.sqrt(Math.pow(x1 - xc, 2) + Math.pow(y1 - yc, 2)));
    let x = 0, y = r, d = 3 - 2 * r;
    const plot = (x: number, y: number) => {
      drawPoint(data, xc + x, yc + y, colorIdx); drawPoint(data, xc - x, yc + y, colorIdx);
      drawPoint(data, xc + x, yc - y, colorIdx); drawPoint(data, xc - x, yc - y, colorIdx);
      drawPoint(data, xc + y, yc + x, colorIdx); drawPoint(data, xc - y, yc + x, colorIdx);
      drawPoint(data, xc + y, yc - x, colorIdx); drawPoint(data, xc - y, yc - x, colorIdx);
    };
    while (y >= x) { plot(x, y); x++; if (d > 0) { y--; d = d + 4 * (x - y) + 10; } else { d = d + 4 * x + 6; } }
  };

  const floodFill = (data: Uint8Array, startX: number, startY: number, newColorIdx: number) => {
    const targetColorIdx = data[startY * width + startX];
    if (targetColorIdx === newColorIdx) return;
    const stack: [number, number][] = [[startX, startY]];
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (data[y * width + x] !== targetColorIdx) continue;
      data[y * width + x] = newColorIdx;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pt = getCanvasPoint(e);
    
    if (currentTool === Tool.Text) {
      if (inputText.length > 0) {
        const newData = new Uint8Array(pixelData);
        bakeText(newData, inputText, pt.x, pt.y, currentColorIdx, font);
        commitPixels(newData);
        setInputText("");
      }
      return;
    }

    if (currentTool === Tool.Paste) {
      if (scrap) {
        const newData = new Uint8Array(pixelData);
        const startX = Math.round(pt.x - scrap.w / 2);
        const startY = Math.round(pt.y - scrap.h / 2);
        for (let y = 0; y < scrap.h; y++) {
          for (let x = 0; x < scrap.w; x++) {
            const px = startX + x;
            const py = startY + y;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              newData[py * width + px] = scrap.data[y * scrap.w + x];
            }
          }
        }
        commitPixels(newData);
      }
      return;
    }

    setIsDrawing(true);
    setStartPoint(pt);
    
    if (currentTool === Tool.Pencil || currentTool === Tool.Eraser) {
      const newData = new Uint8Array(pixelData);
      drawPoint(newData, pt.x, pt.y, currentTool === Tool.Eraser ? 0 : currentColorIdx);
      // Update state live, but don't commit to history yet
      setPixelsLive(newData);
    } else if (currentTool === Tool.Bucket) {
      const newData = new Uint8Array(pixelData);
      floodFill(newData, pt.x, pt.y, currentColorIdx);
      commitPixels(newData);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pt = getCanvasPoint(e);
    setMousePoint(pt);

    if (!isDrawing) return;

    if (currentTool === Tool.Pencil || currentTool === Tool.Eraser) {
      const newData = new Uint8Array(pixelData);
      if (startPoint) drawLine(newData, startPoint.x, startPoint.y, pt.x, pt.y, currentTool === Tool.Eraser ? 0 : currentColorIdx);
      setStartPoint(pt);
      // Update state live for feedback
      setPixelsLive(newData);
    } else if (currentTool === Tool.Copy) {
      // Logic handled in overlay useEffect
    } else {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const ctx = overlay.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      
      const tempData = new Uint8Array(pixelData);
      if (startPoint) {
          if (currentTool === Tool.Line) drawLine(tempData, startPoint.x, startPoint.y, pt.x, pt.y, currentColorIdx);
          if (currentTool === Tool.Rect) drawRect(tempData, startPoint.x, startPoint.y, pt.x, pt.y, currentColorIdx);
          if (currentTool === Tool.Circle) drawCircle(tempData, startPoint.x, startPoint.y, pt.x, pt.y, currentColorIdx);
      }

      const imgData = ctx.createImageData(width, height);
      for (let i = 0; i < tempData.length; i++) {
        const c = palette[tempData[i]];
        const idx = i * 4;
        imgData.data[idx] = parseInt(c.slice(1, 3), 16);
        imgData.data[idx + 1] = parseInt(c.slice(3, 5), 16);
        imgData.data[idx + 2] = parseInt(c.slice(5, 7), 16);
        imgData.data[idx + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const pt = getCanvasPoint(e);

    if (currentTool === Tool.Copy && startPoint) {
      const x1 = Math.min(startPoint.x, pt.x);
      const y1 = Math.min(startPoint.y, pt.y);
      const x2 = Math.max(startPoint.x, pt.x);
      const y2 = Math.max(startPoint.y, pt.y);
      const w = x2 - x1 + 1;
      const h = y2 - y1 + 1;
      
      if (w > 0 && h > 0) {
        const scrapData = new Uint8Array(w * h);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            scrapData[y * w + x] = pixelData[(y1 + y) * width + (x1 + x)];
          }
        }
        setScrap({ data: scrapData, w, h });
      }
    } else if (currentTool === Tool.Pencil || currentTool === Tool.Eraser) {
      // Commit the whole stroke to history once
      commitPixels(pixelData);
    // Fix redundant tool type checks to resolve TypeScript 'no overlap' errors.
    // Narrowing from previous blocks means currentTool cannot be Pencil or Eraser here.
    } else if (currentTool === Tool.Line || currentTool === Tool.Rect || currentTool === Tool.Circle) {
      const newData = new Uint8Array(pixelData);
      if (startPoint) {
        if (currentTool === Tool.Line) drawLine(newData, startPoint.x, startPoint.y, pt.x, pt.y, currentColorIdx);
        else if (currentTool === Tool.Rect) drawRect(newData, startPoint.x, startPoint.y, pt.x, pt.y, currentColorIdx);
        else if (currentTool === Tool.Circle) drawCircle(newData, startPoint.x, startPoint.y, pt.x, pt.y, currentColorIdx);
      }
      commitPixels(newData);
    }

    const overlay = overlayRef.current;
    if (overlay) overlay.getContext('2d')?.clearRect(0, 0, width, height);

    setIsDrawing(false);
    setStartPoint(null);
  };

  const canvasStyle = {
    width: `${width * zoom}px`,
    height: `${height * zoom}px`,
    cursor: 'crosshair',
    imageRendering: 'pixelated' as const,
  };

  return (
    <div className="relative shadow-2xl retro-border bg-black shrink-0" style={canvasStyle}>
      <canvas ref={canvasRef} width={width} height={height} className="absolute inset-0 z-0 pointer-events-none w-full h-full" />
      <canvas ref={overlayRef} width={width} height={height} className="absolute inset-0 z-10 pointer-events-none w-full h-full" />
      <div className="absolute inset-0 z-20 w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};

export default CanvasEditor;
