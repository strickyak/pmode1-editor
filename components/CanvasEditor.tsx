
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Tool, Point } from '../types';

interface CanvasEditorProps {
  pixelData: Uint8Array;
  updatePixels: (data: Uint8Array) => void;
  currentTool: Tool;
  currentColorIdx: number;
  width: number;
  height: number;
  zoom: number;
  palette: string[];
}

const CanvasEditor: React.FC<CanvasEditorProps> = ({
  pixelData,
  updatePixels,
  currentTool,
  currentColorIdx,
  width,
  height,
  zoom,
  palette
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);

  // Initial draw and redraw on update
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw pixels
    ctx.clearRect(0, 0, width, height);
    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < pixelData.length; i++) {
      const colorIndex = pixelData[i];
      const colorHex = palette[colorIndex];
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
  }, [pixelData, width, height, palette]);

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
    if (x >= 0 && x < width && y >= 0 && y < height) {
      data[y * width + x] = colorIdx;
    }
  };

  const drawLine = (data: Uint8Array, x0: number, y0: number, x1: number, y1: number, colorIdx: number) => {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      drawPoint(data, x0, y0, colorIdx);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  };

  const drawRect = (data: Uint8Array, x0: number, y0: number, x1: number, y1: number, colorIdx: number) => {
    const left = Math.min(x0, x1);
    const right = Math.max(x0, x1);
    const top = Math.min(y0, y1);
    const bottom = Math.max(y0, y1);

    for (let x = left; x <= right; x++) {
      drawPoint(data, x, top, colorIdx);
      drawPoint(data, x, bottom, colorIdx);
    }
    for (let y = top; y <= bottom; y++) {
      drawPoint(data, left, y, colorIdx);
      drawPoint(data, right, y, colorIdx);
    }
  };

  const drawCircle = (data: Uint8Array, xc: number, yc: number, x1: number, y1: number, colorIdx: number) => {
    const r = Math.floor(Math.sqrt(Math.pow(x1 - xc, 2) + Math.pow(y1 - yc, 2)));
    let x = 0;
    let y = r;
    let d = 3 - 2 * r;
    
    const plot = (x: number, y: number) => {
      drawPoint(data, xc + x, yc + y, colorIdx);
      drawPoint(data, xc - x, yc + y, colorIdx);
      drawPoint(data, xc + x, yc - y, colorIdx);
      drawPoint(data, xc - x, yc - y, colorIdx);
      drawPoint(data, xc + y, yc + x, colorIdx);
      drawPoint(data, xc - y, yc + x, colorIdx);
      drawPoint(data, xc + y, yc - x, colorIdx);
      drawPoint(data, xc - y, yc - x, colorIdx);
    };

    while (y >= x) {
      plot(x, y);
      x++;
      if (d > 0) {
        y--;
        d = d + 4 * (x - y) + 10;
      } else {
        d = d + 4 * x + 6;
      }
    }
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
    setIsDrawing(true);
    setStartPoint(pt);
    
    if (currentTool === Tool.Pencil || currentTool === Tool.Eraser) {
      const newData = new Uint8Array(pixelData);
      const useColor = currentTool === Tool.Eraser ? 0 : currentColorIdx;
      drawPoint(newData, pt.x, pt.y, useColor);
      updatePixels(newData);
    } else if (currentTool === Tool.Bucket) {
      const newData = new Uint8Array(pixelData);
      floodFill(newData, pt.x, pt.y, currentColorIdx);
      updatePixels(newData);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const pt = getCanvasPoint(e);

    if (currentTool === Tool.Pencil || currentTool === Tool.Eraser) {
      const newData = new Uint8Array(pixelData);
      const useColor = currentTool === Tool.Eraser ? 0 : currentColorIdx;
      if (startPoint) {
        drawLine(newData, startPoint.x, startPoint.y, pt.x, pt.y, useColor);
      }
      setStartPoint(pt);
      updatePixels(newData);
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

    if (currentTool !== Tool.Pencil && currentTool !== Tool.Eraser && currentTool !== Tool.Bucket) {
      const newData = new Uint8Array(pixelData);
      if (startPoint) {
        if (currentTool === Tool.Line) drawLine(newData, startPoint.x, startPoint.y, pt.x, pt.y, currentColorIdx);
        if (currentTool === Tool.Rect) drawRect(newData, startPoint.x, startPoint.y, pt.x, pt.y, currentColorIdx);
        if (currentTool === Tool.Circle) drawCircle(newData, startPoint.x, startPoint.y, pt.x, pt.y, currentColorIdx);
      }
      updatePixels(newData);
    }

    const overlay = overlayRef.current;
    if (overlay) {
      const ctx = overlay.getContext('2d');
      ctx?.clearRect(0, 0, width, height);
    }

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
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 z-0 pointer-events-none w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />
      <canvas
        ref={overlayRef}
        width={width}
        height={height}
        className="absolute inset-0 z-10 pointer-events-none w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />
      <div
        className="absolute inset-0 z-20 w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};

export default CanvasEditor;
