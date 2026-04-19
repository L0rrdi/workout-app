<!-- src/routes/import/bulk/+page.svelte -->
<script lang="ts">
  import { bulkCreateWorkouts } from '$lib/storage';
  import type { WeightUnit } from '$lib/parser';

  const PROMPT = `You are converting raw handwritten gym workout notes into structured JSON for a workout tracking app.

RETURN ONLY a valid JSON array. No explanation, no markdown, no code fences.

━━━ OUTPUT SCHEMA ━━━
[
  {
    "title": string,        // workout type: "Push", "Pull", "Legs", "Full Body"
    "date": string | null,  // "YYYY-MM-DD" or null if no date in the notes
    "exercises": [
      {
        "name": string,          // normalized English name (see EXERCISE NAMES below)
        "sets": number,          // number of sets at this weight
        "reps": number,          // reps per set — use most common if they vary
        "weight": number | null, // null for bodyweight
        "unit": "kg" | "lbs" | null  // null for bodyweight
      }
    ]
  }
]

━━━ RULES ━━━

1. WEIGHT CHANGES — If weight changes mid-exercise, create one entry per weight block.
   Example: "45kg - 6 reps - 6 reps - 40kg - 6 reps"
   → { "name": "T-Bar Row", "sets": 2, "reps": 6, "weight": 45, "unit": "kg" }
   → { "name": "T-Bar Row", "sets": 1, "reps": 6, "weight": 40, "unit": "kg" }

2. H/V NOTATION — H = right arm (Høyre), V = left arm (Venstre). Split into two entries.
   Example: "preacher 15kg - H8V7 - H9V9 - H5V4"
   → { "name": "Preacher Curl (R)", "sets": 3, "reps": 8, "weight": 15, "unit": "kg" }
   → { "name": "Preacher Curl (L)", "sets": 3, "reps": 7, "weight": 15, "unit": "kg" }
   Use the most common rep count per side across sets.

3. SKIP FAILED SETS — Ignore sets marked as: f, ff, fff, failure, idk.
   If ALL sets of an exercise are skipped, omit the exercise entirely.

4. SKIP NOTES — Ignore Norwegian motivational text, technique reminders, and any line
   that is not an exercise name or set data. Examples to ignore:
   "SKIKKELIG", "fokusere upper", "bøye mer av knærene", "til neste gang husk...",
   "5-8 base", "reps", "dårlig form", "slow asf", "du har mye mer stamina enn du tror" etc.

5. DATES — Convert DD/MM/YY or D/M/YY → YYYY-MM-DD. If no date appears, set "date": null.

6. WORKOUT SEPARATOR — A new workout begins each time you see a type header
   (push, pull, legs, newpull, nextpull, fullbody, etc.) OR a new date line.
   Each is a separate workout object in the array.

7. EXERCISE NAMES — Normalize all abbreviations to proper English:
   tbar / t-bar → "T-Bar Row"
   seated / seatedrow / sitting cable row → "Seated Cable Row"
   latpulldown / pulldown → "Lat Pulldown"
   close lat / close pulldown / close grip lat → "Close Grip Lat Pulldown"
   latpullover / pullover → "Lat Pullover"
   preacher / preachermachine / singlearm preacher → "Preacher Curl"
   hammer / hammercurl → "Hammer Curl"
   incline curls → "Incline Curl"
   flies / chest fly / pec fly → "Chest Fly"
   low to high flies → "Low-to-High Cable Fly"
   incline push / incline dumb / incline smith → "Incline Press"
   bench / dead bench / horizontal press → "Bench Press"
   shoulder press / smith shoulder press / military press / sitting military press → "Shoulder Press"
   lateral raise / lateralraise → "Lateral Raise"
   pushdown / tricep pushdown → "Tricep Pushdown"
   extensions / exten / ext / overhead ext → "Tricep Extension"
   lowlat / lowlatmachine → "Low Lat Machine"
   rear / rear delt / singlerear → "Rear Delt Fly"
   machine row / machinerow → "Machine Row"
   unilateral row / unilateral cable row → "Unilateral Cable Row"
   jpg pulldown → "JPG Pulldown"
   lowerback ext → "Lower Back Extension"
   facepulls / face pulls → "Face Pulls"
   dip machine / dips machine / assisted dips / dips → "Dips"
   squat → "Squat"
   leg ext → "Leg Extension"
   rdls → "Romanian Deadlift"
   bulgarians → "Bulgarian Split Squat"
   hamstring curl / lying curls → "Hamstring Curl"
   ab crunch / cable crunch → "Ab Crunch"
   obliques → "Oblique Machine"
   chinups / pullups / assisted pullups → "Pull-Ups"
   barbell row / bent over rows → "Barbell Row"
   incline cable row → "Incline Cable Row"
   seated row wide / seated row machine → "Seated Row Wide"
   jm press → "JM Press"
   db incline row → "Incline Dumbbell Row"
   leg press → "Leg Press"
   abductors → "Abductor Machine"

8. BODYWEIGHT — If no weight is given (e.g. "dips - 6 - 5"), set weight: null, unit: null.

9. UNITS — Detect "kg" or "lbs" from the set line. Preserve whichever is written.

Now convert the following workout notes:`;

  type Step = 'input' | 'preview' | 'done';
  type BulkExercise = { name: string; sets: number; reps: number; weight: number | null; unit: WeightUnit | null; raw: string };
  type BulkWorkout = { id: string; title: string; date: string; notes: null; exercises: BulkExercise[] };

  let step = $state<Step>('input');
  let jsonInput = $state('');
  let startDate = $state('2024-06-26');
  let endDate = $state('2026-04-17');
  let previewWorkouts = $state<BulkWorkout[]>([]);
  let parseError = $state('');
  let importing = $state(false);
  let importedCount = $state(0);
  let copied = $state(false);

  async function copyPrompt() {
    await navigator.clipboard.writeText(PROMPT);
    copied = true;
    setTimeout(() => { copied = false; }, 2000);
  }

  function assignDates(workouts: Omit<BulkWorkout, 'id'>[]): BulkWorkout[] {
    const undated = workouts.filter(w => !w.date);
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const totalMs = end.getTime() - start.getTime();
    const interval = undated.length > 1 ? totalMs / (undated.length - 1) : 0;
    let idx = 0;
    return workouts.map(w => {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
      if (w.date) return { ...w, id, notes: null as null };
      const d = new Date(start.getTime() + idx++ * interval);
      return { ...w, id, notes: null as null, date: d.toISOString().split('T')[0] };
    });
  }

  function handlePreview() {
    parseError = '';
    try {
      const raw = JSON.parse(jsonInput.trim());
      if (!Array.isArray(raw)) throw new Error('Expected a JSON array at the top level.');
      if (raw.length === 0) throw new Error('Array is empty — nothing to import.');
      previewWorkouts = assignDates(raw);
      step = 'preview';
    } catch (e) {
      parseError = e instanceof Error ? e.message : 'Invalid JSON — check the output from ChatGPT/Claude.';
    }
  }

  async function handleImport() {
    importing = true;
    parseError = '';
    try {
      await bulkCreateWorkouts(previewWorkouts);
      importedCount = previewWorkouts.length;
      step = 'done';
    } catch {
      parseError = 'Import failed. Check your connection and try again.';
    } finally {
      importing = false;
    }
  }

  function reset() {
    jsonInput = '';
    previewWorkouts = [];
    parseError = '';
    step = 'input';
  }

  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
</script>

<div class="min-h-screen bg-neutral-950 text-white">
  <div class="max-w-2xl mx-auto px-6 py-10 space-y-8">

    <div>
      <a
        href="/import"
        class="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white active:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
      >
        ← Back to import
      </a>
      <h1 class="text-2xl font-semibold tracking-tight mt-4">Bulk Import</h1>
      <p class="text-sm text-white/50 mt-1">Convert your notes with AI, then paste the result here.</p>
    </div>

    {#if step === 'done'}
      <!-- ── Done ── -->
      <div class="rounded-md bg-white/5 border border-white/10 p-8 text-center space-y-4">
        <p class="text-lg font-semibold">Imported {importedCount} workouts</p>
        <p class="text-sm text-white/50">Your workout history is now in the app.</p>
        <div class="flex justify-center gap-3">
          <a
            href="/workouts"
            class="px-4 py-2 bg-white text-neutral-950 rounded-md text-sm font-medium hover:bg-white/90 active:bg-white/75"
          >
            View workouts
          </a>
          <button
            onclick={reset}
            class="px-4 py-2 bg-white/5 border border-white/10 text-white/70 rounded-md text-sm hover:bg-white/10 hover:text-white"
          >
            Import more
          </button>
        </div>
      </div>

    {:else if step === 'preview'}
      <!-- ── Preview ── -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <p class="text-sm text-white/50">{previewWorkouts.length} workouts ready to import</p>
          <button
            onclick={() => { step = 'input'; }}
            class="text-sm text-white/40 hover:text-white"
          >
            ← Edit
          </button>
        </div>

        <div class="rounded-md bg-white/5 border border-white/10 divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
          {#each previewWorkouts as workout, i (workout.id)}
            <div class="flex items-center justify-between px-4 py-2.5 text-sm">
              <div class="flex items-center gap-3">
                <span class="text-white/20 text-xs w-6 text-right">{i + 1}</span>
                <div>
                  <span class="text-white font-medium">{workout.title}</span>
                  <span class="text-white/30 ml-2 text-xs">{workout.exercises.length} exercises</span>
                </div>
              </div>
              <span class="text-white/40 text-xs">{fmt(workout.date)}</span>
            </div>
          {/each}
        </div>

        {#if parseError}
          <p class="text-sm text-red-400">{parseError}</p>
        {/if}

        <button
          onclick={handleImport}
          disabled={importing}
          class="w-full px-4 py-2.5 bg-white text-neutral-950 rounded-md text-sm font-medium hover:bg-white/90 active:bg-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {importing ? 'Importing…' : `Import all ${previewWorkouts.length} workouts`}
        </button>
      </div>

    {:else}
      <!-- ── Step 1: Input ── -->

      <!-- Conversion prompt -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-white/40 uppercase tracking-wide">Step 1 — Copy this prompt</p>
          <button
            onclick={copyPrompt}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
              {copied ? 'bg-white/10 text-white' : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white active:bg-white/5'}"
          >
            {#if copied}
              ✓ Copied
            {:else}
              Copy prompt
            {/if}
          </button>
        </div>
        <div class="rounded-md bg-white/5 border border-white/10 p-4 max-h-40 overflow-y-auto">
          <pre class="text-xs text-white/40 whitespace-pre-wrap font-mono leading-relaxed">{PROMPT}</pre>
        </div>
        <p class="text-xs text-white/30">Paste this prompt into Claude or ChatGPT, then paste your workout notes after it. Copy the JSON it outputs.</p>
      </div>

      <!-- JSON input -->
      <div class="space-y-2">
        <label for="json-input" class="block text-xs font-medium text-white/40 uppercase tracking-wide">
          Step 2 — Paste the JSON output
        </label>
        <textarea
          id="json-input"
          bind:value={jsonInput}
          rows={10}
          placeholder={'[\n  {\n    "title": "Pull",\n    "date": "2024-05-06",\n    "exercises": [...]\n  }\n]'}
          class="w-full rounded-md bg-white/5 border border-white/10 p-3 font-mono text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
        ></textarea>
      </div>

      <!-- Date range for undated workouts -->
      <div class="space-y-3">
        <p class="text-xs font-medium text-white/40 uppercase tracking-wide">Step 3 — Date range for undated workouts</p>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <label for="start-date" class="block text-xs text-white/30">Start date</label>
            <input
              id="start-date"
              type="date"
              bind:value={startDate}
              class="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 scheme-dark"
            />
          </div>
          <div class="space-y-1.5">
            <label for="end-date" class="block text-xs text-white/30">End date</label>
            <input
              id="end-date"
              type="date"
              bind:value={endDate}
              class="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 scheme-dark"
            />
          </div>
        </div>
        <p class="text-xs text-white/25">Workouts without a date will be spread evenly across this range.</p>
      </div>

      {#if parseError}
        <p class="text-sm text-red-400">{parseError}</p>
      {/if}

      <button
        onclick={handlePreview}
        disabled={jsonInput.trim().length === 0}
        class="w-full px-4 py-2.5 bg-white text-neutral-950 rounded-md text-sm font-medium hover:bg-white/90 active:bg-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Preview workouts
      </button>
    {/if}

  </div>
</div>
