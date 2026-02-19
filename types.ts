
export enum Tool {
  Pencil = 'Pencil',
  Eraser = 'Eraser',
  Bucket = 'Bucket',
  Rect = 'Rect',
  Circle = 'Circle',
  Line = 'Line'
}

export type ColorHex = '#00FF00' | '#FF0000' | '#FFFF00' | '#0000FF';

export interface Point {
  x: number;
  y: number;
}
