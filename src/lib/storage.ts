// src/lib/storage.ts
//
// Handles saving and loading workouts.
// Uses the API (D1 database) as the primary source.
// localStorage is kept only as a fallback during development.

import type { ParsedExercise } from '$lib/parser';

export interface SetRow {
  reps: number;
  weight: number | null;
}

export interface ExerciseWithSetData extends ParsedExercise {
  set_data?: string | null;
}

export interface Workout {
  id: string;
  title: string;
  date: string;
  notes: string | null;
  tag?: string | null;
  exercises: ExerciseWithSetData[];
}

// ── API functions (these talk to the server) ──────────────────────────────────

export async function fetchWorkouts(): Promise<Workout[]> {
  const res = await fetch('/api/workouts');
  if (!res.ok) throw new Error('Failed to load workouts');
  return res.json();
}

export async function createWorkout(workout: Workout): Promise<void> {
  const res = await fetch('/api/workouts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workout)
  });
  if (!res.ok) throw new Error('Failed to save workout');
}

export async function bulkCreateWorkouts(workouts: Workout[]): Promise<void> {
  const res = await fetch('/api/workouts/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workouts)
  });
  if (!res.ok) throw new Error('Failed to bulk import workouts');
}

export async function updateWorkout(workout: Workout): Promise<void> {
  const res = await fetch(`/api/workouts/${workout.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workout)
  });
  if (!res.ok) throw new Error('Failed to update workout');
}

export async function removeWorkout(id: string): Promise<void> {
  const res = await fetch(`/api/workouts/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete workout');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function generateId(): string {
  return Date.now().toString();
}

// ── localStorage (kept for now, will remove after DB is confirmed working) ────

const STORAGE_KEY = 'workouts';

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

export function saveWorkout(workout: Workout): void {
  const existing = loadWorkouts();
  const updated = [workout, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function deleteWorkout(id: string): void {
  const existing = loadWorkouts();
  const updated = existing.filter((w) => w.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}