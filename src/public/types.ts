/**
 * Shared types for the frontend application
 */

export interface VocabEntry {
  id: number;
  lesson: string;
  de: string;
  en: string;
  created_at?: string;
}

export interface WordItem {
  text: string;
  lang: 'de' | 'en';
}

export interface PlacedWord {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface SelectedWord {
  word: string;
  el: HTMLElement;
}

export interface Balloon {
  x: number;
  y: number;
  r: number;
  c: string;
  speed: number;
  wobble: number;
  wobbleSpeed: number;
}

export interface Rocket {
  x: number;
  y: number;
  speed: number;
  trail: { x: number; y: number }[];
}

export interface Sparkle {
  x: number;
  y: number;
  life: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export type Lesson = 'lesson01' | 'lesson02' | 'lesson03' | 'lesson04';
export type ToastType = 'success' | 'error' | 'info';
