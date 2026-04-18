// src/lib/parser.ts
//
// Parses raw workout text into structured exercises.
//
// Supported formats (flexible whitespace, case-insensitive units):
//   Bench Press 3x8 60kg
//   Bench Press - 3x8 @ 60kg
//   Squat 5 x 5 100 kg
//   Pull ups 3x10                 (no weight -> bodyweight)
//   Curl 12kg 3x12                (weight before sets/reps)
//   Incline DB Press 3x10 22.5kg  (decimal weight)
//
// Lines with no sets/reps pattern (like "Push Day") are treated as
// headers and silently skipped, not reported as errors.

export type WeightUnit = 'kg' | 'lbs';

export interface ParsedExercise {
  name: string;
  sets: number;
  reps: number;
  weight: number | null;      // null = bodyweight
  unit: WeightUnit | null;    // null when there is no weight
  raw: string;                // original line, useful for debugging
}

export interface ParseError {
  line: string;
  reason: string;
}

export interface ParseResult {
  exercises: ParsedExercise[];
  errors: ParseError[];
}

// "3x8", "3 x 8", "5X5" — captures sets (group 1) and reps (group 2).
const SETS_REPS_REGEX = /(\d+)\s*[xX]\s*(\d+)/;

// "60kg", "22.5 kg", "100 lbs", "45LB" — captures number (1) and unit (2).
const WEIGHT_REGEX = /(\d+(?:\.\d+)?)\s*(kg|lbs?)\b/i;

/**
 * Parse one line. Returns either a ParsedExercise, a ParseError,
 * or null if the line should be silently skipped (blank or a header).
 */
export function parseLine(line: string): ParsedExercise | ParseError | null {
  const raw = line;
  const trimmed = line.trim();

  // Skip blank lines entirely.
  if (trimmed.length === 0) return null;

  const setsRepsMatch = trimmed.match(SETS_REPS_REGEX);

  // No sets/reps -> this is probably a header like "Push Day". Skip it.
  if (!setsRepsMatch) return null;

  const sets = parseInt(setsRepsMatch[1], 10);
  const reps = parseInt(setsRepsMatch[2], 10);

  // Weight is optional (bodyweight exercises).
  const weightMatch = trimmed.match(WEIGHT_REGEX);
  let weight: number | null = null;
  let unit: WeightUnit | null = null;

  if (weightMatch) {
    weight = parseFloat(weightMatch[1]);
    // Normalise: "lb" or "lbs" both become "lbs".
    unit = weightMatch[2].toLowerCase().startsWith('lb') ? 'lbs' : 'kg';
  }

  // Name = whatever is left after removing sets/reps, weight, and separators.
  const name = trimmed
    .replace(SETS_REPS_REGEX, '')
    .replace(WEIGHT_REGEX, '')
    .replace(/[-@]/g, ' ')     // strip common separators
    .replace(/\s+/g, ' ')      // collapse whitespace
    .trim();

  if (name.length === 0) {
    return { line: raw, reason: 'Could not find an exercise name' };
  }

  return { name, sets, reps, weight, unit, raw };
}

/**
 * Parse a full block of text. Headers and blank lines are skipped.
 */
export function parseText(text: string): ParseResult {
  const exercises: ParsedExercise[] = [];
  const errors: ParseError[] = [];

  for (const line of text.split(/\r?\n/)) {
    const result = parseLine(line);
    if (result === null) continue;           // blank line or header
    if ('reason' in result) errors.push(result);
    else exercises.push(result);
  }

  return { exercises, errors };
}