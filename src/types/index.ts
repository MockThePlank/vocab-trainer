/**
 * Shared TypeScript interfaces and types for the Vocabulary Trainer application
 * @module types
 */

/**
 * Represents a vocabulary entry in the database
 */
export interface VocabEntry {
  /** Unique identifier for the vocabulary entry */
  id?: number;
  /** Lesson identifier (e.g., 'lesson01') */
  lesson: string;
  /** German word or phrase */
  de: string;
  /** English translation */
  en: string;
  /** Timestamp when the entry was created */
  created_at?: string;
}

/**
 * Represents a vocabulary pair for JSON migration
 */
export interface VocabPair {
  /** German word or phrase */
  de: string;
  /** English translation */
  en: string;
}

/**
 * Standard API response structure
 */
export interface ApiResponse {
  /** Error message if request failed */
  error?: string;
  /** Success flag for operations */
  success?: boolean;
  /** ID of created/affected resource */
  id?: number;
  /** Number of deleted records */
  deleted?: number;
  /** Number of updated records */
  updated?: number;
  /** Health check status */
  status?: string;
  /** ISO timestamp */
  timestamp?: string;
}

/**
 * Valid lesson identifiers
 */
export type Lesson = 'lesson01' | 'lesson02' | 'lesson03' | 'lesson04';

/**
 * Array of all valid lesson identifiers for validation
 */
export const VALID_LESSONS: Lesson[] = ['lesson01', 'lesson02', 'lesson03', 'lesson04'];
