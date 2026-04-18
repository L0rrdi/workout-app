// src/lib/storage.ts
//
// Handles saving and loading workouts from localStorage.
// This is temporary — we'll replace it with a real database later.
// Keeping it in one place means we only need to change one file when that happens.

import type { ParsedExercise } from '$lib/parser';

export interface Workout {
  id: string;           // unique ID, generated from the current timestamp
  title: string;        // e.g. "Push Day"
  date: string;         // ISO date string e.g. "2026-04-18"
  exercises: ParsedExercise[];
}

const STORAGE_KEY = 'workouts';

/** Load all workouts from localStorage. Returns an empty array if none exist. */
export function loadWorkouts(): Workout[] {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Workout[];
  } catch {
    return [];
  }
}

/** Save a new workout. Adds it to the front of the list (newest first). */
export function saveWorkout(workout: Workout): void {
  const existing = loadWorkouts();
  const updated = [workout, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

/** Delete a workout by ID. */
export function deleteWorkout(id: string): void {
  const existing = loadWorkouts();
  const updated = existing.filter((w) => w.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

/** Generate a simple unique ID from the current timestamp. */
export function generateId(): string {
  return Date.now().toString();
}