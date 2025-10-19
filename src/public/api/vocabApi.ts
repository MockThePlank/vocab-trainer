import { VocabEntry, Lesson } from '../types';

export async function fetchVocab(lesson: Lesson): Promise<VocabEntry[]> {
  const res = await fetch(`/api/vocab/${lesson}`);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const data = await res.json();
  return data as VocabEntry[];
}

export async function postVocab(lesson: Lesson, de: string, en: string): Promise<any> {
  const res = await fetch(`/api/vocab/${lesson}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ de, en }),
  });
  return res.json();
}
