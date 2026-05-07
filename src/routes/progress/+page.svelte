<!-- src/routes/progress/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { fetchWorkouts } from '$lib/storage';
  import type { Workout, SetRow } from '$lib/storage';
  import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Filler,
    Tooltip
  } from 'chart.js';

  Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

  type Period = 'all' | 'year' | 'month' | 'week' | 'day';
  type DayType = 'all' | 'push' | 'pull' | 'legs' | 'other';
  type Metric = 'weight' | 'reps';
  type SortMode = 'top' | 'all';

  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtShort = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  let workouts = $state<Workout[]>([]);
  let loading = $state(true);
  let selectedExercise = $state('');
  let selectedPeriod = $state<Period>('all');
  let selectedDay = $state<DayType>('all');
  let selectedTag = $state('all');
  let selectedMetric = $state<Metric>('weight');
  let sortMode = $state<SortMode>('top');
  let selectedWeight = $state<string>('all'); // 'all', 'bw', or `${weight}|${unit}`
  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let chart: Chart | null = null;

  const periods: { label: string; value: Period }[] = [
    { label: 'All', value: 'all' },
    { label: 'Year', value: 'year' },
    { label: 'Month', value: 'month' },
    { label: 'Week', value: 'week' },
    { label: 'Day', value: 'day' }
  ];

  const dayTypes: { label: string; value: DayType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Push', value: 'push' },
    { label: 'Pull', value: 'pull' },
    { label: 'Legs', value: 'legs' },
    { label: 'Other', value: 'other' }
  ];

  function classifyWorkout(title: string): DayType {
    const t = title.toLowerCase();
    if (t.includes('push')) return 'push';
    if (t.includes('pull')) return 'pull';
    if (t.includes('leg')) return 'legs';
    return 'other';
  }

  const availableTags = $derived(
    [...new Set(workouts.map(w => w.tag).filter((t): t is string => !!t))].sort()
  );

  const filteredWorkouts = $derived(
    workouts
      .filter(w => selectedDay === 'all' || classifyWorkout(w.title) === selectedDay)
      .filter(w => selectedTag === 'all' || w.tag === selectedTag)
  );

  const exerciseNames = $derived(
    [...new Set(
      filteredWorkouts.flatMap(w => w.exercises.map(e => e.name))
    )].sort((a, b) => a.localeCompare(b))
  );

  function periodStart(period: Period): number | null {
    if (period === 'all') return null;
    const now = Date.now();
    if (period === 'year')  return now - 365 * 86400000;
    if (period === 'month') return now - 30 * 86400000;
    if (period === 'week')  return now - 7 * 86400000;
    if (period === 'day') {
      const d = new Date();
      return now - d.getHours() * 3600000 - d.getMinutes() * 60000 - d.getSeconds() * 1000 - d.getMilliseconds();
    }
    return null;
  }

  // Returns the per-set rows for an exercise. Falls back to building from
  // the legacy sets/reps/weight fields when set_data is missing.
  function getSets(e: { sets: number; reps: number; weight: number | null; set_data?: string | null }): { reps: number; weight: number | null }[] {
    if (e.set_data) {
      const parsed = JSON.parse(e.set_data);
      if (parsed && parsed.cardio) return [];
      if (!Array.isArray(parsed)) return [];
      return (parsed as SetRow[]).map(r => ({ reps: r.reps ?? 0, weight: r.weight }));
    }
    return Array.from({ length: e.sets }, () => ({ reps: e.reps, weight: e.weight }));
  }

  const totalSets = $derived(() => {
    const data = chartData();
    return sortMode === 'all' ? data.length : data.reduce((sum, p) => sum + p.setCount, 0);
  });

  // Unique weights ever used for the selected exercise (within the
  // current Day/Tag filters). Used to populate the weight-filter dropdown.
  const availableWeights = $derived(() => {
    if (!selectedExercise) return [] as string[];
    const set = new SvelteSet<string>();
    filteredWorkouts.forEach(w => {
      w.exercises
        .filter(e => e.name.toLowerCase() === selectedExercise.toLowerCase())
        .forEach(ex => {
          getSets(ex).forEach(s => {
            set.add(s.weight === null ? 'bw' : `${s.weight}|${ex.unit ?? 'kg'}`);
          });
        });
    });
    return [...set].sort((a, b) => {
      if (a === 'bw') return 1;
      if (b === 'bw') return -1;
      return parseFloat(b) - parseFloat(a);
    });
  });

  function setMatchesWeightFilter(s: { weight: number | null }, exUnit: string | null): boolean {
    if (selectedWeight === 'all') return true;
    if (selectedWeight === 'bw') return s.weight === null;
    const [wStr, uStr] = selectedWeight.split('|');
    return s.weight === parseFloat(wStr) && (exUnit ?? 'kg') === uStr;
  }

  function weightLabel(key: string): string {
    if (key === 'bw') return 'Bodyweight';
    const [w, u] = key.split('|');
    return `${w} ${u}`;
  }

  const chartData = $derived(() => {
    if (!selectedExercise) return [];
    const start = periodStart(selectedPeriod);
    const points: { date: string; workoutId: string; setIndex: number; setCount: number; weight: number | null; reps: number; unit: string | null }[] = [];

    filteredWorkouts
      .filter(w => start === null || new Date(w.date + 'T00:00:00').getTime() >= start)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach(w => {
        const matches = w.exercises.filter(e => e.name.toLowerCase() === selectedExercise.toLowerCase());
        matches.forEach(ex => {
          const sets = getSets(ex);
          if (sets.length === 0) return;
          if (sortMode === 'top') {
            const s = sets[0];
            if (!setMatchesWeightFilter(s, ex.unit)) return;
            points.push({
              date: w.date, workoutId: w.id, setIndex: 0, setCount: sets.length,
              weight: s.weight, reps: s.reps, unit: ex.unit
            });
          } else {
            sets.forEach((s, i) => {
              if (!setMatchesWeightFilter(s, ex.unit)) return;
              points.push({
                date: w.date, workoutId: w.id, setIndex: i, setCount: sets.length,
                weight: s.weight, reps: s.reps, unit: ex.unit
              });
            });
          }
        });
      });

    return points;
  });

  function buildChart() {
    if (!canvasEl) return;
    if (chart) { chart.destroy(); chart = null; }

    const data = chartData();
    if (data.length === 0) return;

    const isWeight = selectedMetric === 'weight';
    const isAll = sortMode === 'all';
    const yValues = data.map(d => isWeight ? (d.weight ?? 0) : d.reps);

    chart = new Chart(canvasEl, {
      type: 'line',
      data: {
        labels: data.map(d => fmtShort(d.date)),
        datasets: [{
          data: yValues,
          borderColor: 'rgba(255,255,255,0.9)',
          backgroundColor: 'rgba(255,255,255,0.05)',
          pointBackgroundColor: 'rgba(255,255,255,0.9)',
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        onClick: (_event, elements) => {
          if (elements.length > 0) {
            const idx = elements[0].index;
            window.location.href = `/workouts/${data[idx].workoutId}`;
          }
        },
        onHover: (event, elements) => {
          const canvas = event.native?.target as HTMLCanvasElement | null;
          if (canvas) canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(10,10,10,0.95)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            titleColor: 'rgba(255,255,255,0.9)',
            bodyColor: 'rgba(255,255,255,0.5)',
            padding: 10,
            callbacks: {
              title: (items) => {
                const d = data[items[0].dataIndex];
                return fmt(d.date) + (isAll ? ` · Set ${d.setIndex + 1}` : '');
              },
              label: (item) => {
                const d = data[item.dataIndex];
                if (isWeight) {
                  return d.weight !== null ? `${d.weight}${d.unit ?? ''}` : 'bodyweight';
                }
                return `${d.reps} reps`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 } },
            border: { color: 'rgba(255,255,255,0.1)' }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 } },
            border: { color: 'rgba(255,255,255,0.1)' }
          }
        }
      }
    });
  }

  $effect(() => {
    void selectedExercise;
    void selectedPeriod;
    void selectedMetric;
    void sortMode;
    void selectedWeight;
    void canvasEl;
    buildChart();
  });

  // Reset the weight filter when the exercise/day/tag scope changes,
  // so a stale selection doesn't filter the new exercise to nothing.
  let lastScope = '';
  $effect(() => {
    const scope = `${selectedExercise}|${selectedDay}|${selectedTag}`;
    if (scope !== lastScope) {
      lastScope = scope;
      selectedWeight = 'all';
    }
  });

  onMount(async () => {
    try {
      workouts = await fetchWorkouts();
      if (exerciseNames.length > 0) selectedExercise = exerciseNames[0];
    } finally {
      loading = false;
    }
  });
</script>

<div class="min-h-screen bg-neutral-950 text-white">
  <div class="max-w-2xl mx-auto px-6 py-10 space-y-6">

    <h1 class="text-2xl font-semibold tracking-tight">Progress</h1>

    {#if loading}
      <div class="space-y-4 animate-pulse">
        <div class="h-8 w-48 rounded bg-white/10"></div>
        <div class="h-64 rounded-md bg-white/5 border border-white/10"></div>
      </div>

    {:else if workouts.length === 0}
      <div class="rounded-md bg-white/5 border border-white/10 p-12 text-center space-y-3">
        <p class="text-2xl">📈</p>
        <p class="text-sm font-medium text-white/60">No data yet</p>
        <p class="text-xs text-white/30">Import some workouts to start tracking progress</p>
        <div class="flex justify-center pt-1">
          <a href="/import"
            class="px-3 py-1.5 bg-white text-neutral-950 rounded-md text-sm font-medium hover:bg-white/90 active:bg-white/75">
            Import workout
          </a>
        </div>
      </div>

    {:else}
      <div class="space-y-4">

        <!-- Day type filter -->
        <div class="space-y-1.5">
          <p class="text-xs font-medium text-white/40 uppercase tracking-wide">Day</p>
          <div class="flex gap-1.5 flex-wrap">
            {#each dayTypes as d (d.value)}
              <button
                onclick={() => { selectedDay = d.value; selectedExercise = exerciseNames[0] ?? ''; }}
                class="px-3 py-1.5 rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
                  {selectedDay === d.value
                    ? 'bg-white text-neutral-950'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white active:bg-white/5'}"
              >
                {d.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Tag filter (only shown if any workouts have a tag) -->
        {#if availableTags.length > 0}
          <div class="space-y-1.5">
            <p class="text-xs font-medium text-white/40 uppercase tracking-wide">Tag</p>
            <div class="flex gap-1.5 flex-wrap">
              <button
                onclick={() => { selectedTag = 'all'; selectedExercise = exerciseNames[0] ?? ''; }}
                class="px-3 py-1.5 rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
                  {selectedTag === 'all' ? 'bg-white text-neutral-950' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white active:bg-white/5'}"
              >All</button>
              {#each availableTags as t (t)}
                <button
                  onclick={() => { selectedTag = t; selectedExercise = exerciseNames[0] ?? ''; }}
                  class="px-3 py-1.5 rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
                    {selectedTag === t ? 'bg-white text-neutral-950' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white active:bg-white/5'}"
                >{t}</button>
              {/each}
            </div>
          </div>
        {/if}

        {#if exerciseNames.length === 0}
          <div class="rounded-md bg-white/5 border border-white/10 p-8 text-center">
            <p class="text-sm text-white/40">No workouts logged for this day type.</p>
          </div>

        {:else}
          <!-- Exercise picker -->
          <div class="space-y-1.5">
            <label for="exercise-select" class="block text-xs font-medium text-white/40 uppercase tracking-wide">Exercise</label>
            <select
              id="exercise-select"
              bind:value={selectedExercise}
              onwheel={(e) => {
                if (exerciseNames.length === 0) return;
                e.preventDefault();
                const idx = exerciseNames.indexOf(selectedExercise);
                const next = e.deltaY > 0
                  ? Math.min(idx + 1, exerciseNames.length - 1)
                  : Math.max(idx - 1, 0);
                if (next !== idx) selectedExercise = exerciseNames[next];
              }}
              class="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              {#each exerciseNames as name (name)}
                <option value={name} class="bg-neutral-900">{name}</option>
              {/each}
            </select>
          </div>

          {#if availableWeights().length > 1}
            <!-- Weight filter -->
            <div class="space-y-1.5">
              <label for="weight-select" class="block text-xs font-medium text-white/40 uppercase tracking-wide">Weight</label>
              <select
                id="weight-select"
                bind:value={selectedWeight}
                onwheel={(e) => {
                  const opts = ['all', ...availableWeights()];
                  if (opts.length === 0) return;
                  e.preventDefault();
                  const idx = opts.indexOf(selectedWeight);
                  const next = e.deltaY > 0
                    ? Math.min(idx + 1, opts.length - 1)
                    : Math.max(idx - 1, 0);
                  if (next !== idx) selectedWeight = opts[next];
                }}
                class="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <option value="all" class="bg-neutral-900">All weights</option>
                {#each availableWeights() as w (w)}
                  <option value={w} class="bg-neutral-900">{weightLabel(w)}</option>
                {/each}
              </select>
            </div>
          {/if}

          <!-- Sort mode toggle -->
          <div class="flex gap-1.5">
            <button
              onclick={() => sortMode = 'top'}
              class="px-3 py-1.5 rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
                {sortMode === 'top' ? 'bg-white text-neutral-950' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white active:bg-white/5'}"
            >Top set</button>
            <button
              onclick={() => sortMode = 'all'}
              class="px-3 py-1.5 rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
                {sortMode === 'all' ? 'bg-white text-neutral-950' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white active:bg-white/5'}"
            >All sets</button>
          </div>

          <!-- Metric toggle -->
          <div class="flex gap-1.5">
            <button
              onclick={() => selectedMetric = 'weight'}
              class="px-3 py-1.5 rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
                {selectedMetric === 'weight' ? 'bg-white text-neutral-950' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white active:bg-white/5'}"
            >Weight</button>
            <button
              onclick={() => selectedMetric = 'reps'}
              class="px-3 py-1.5 rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
                {selectedMetric === 'reps' ? 'bg-white text-neutral-950' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white active:bg-white/5'}"
            >Reps</button>
          </div>

          <!-- Period tabs -->
          <div class="flex gap-1.5">
            {#each periods as p (p.value)}
              <button
                onclick={() => selectedPeriod = p.value}
                class="px-3 py-1.5 rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
                  {selectedPeriod === p.value
                    ? 'bg-white text-neutral-950'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white active:bg-white/5'}"
              >
                {p.label}
              </button>
            {/each}
          </div>
          <p class="text-xs text-white/40"><span class="text-white font-semibold">{totalSets()}</span> total sets</p>

          <!-- Chart -->
          {#if chartData().length === 0}
            <div class="rounded-md bg-white/5 border border-white/10 p-8 text-center">
              <p class="text-sm text-white/40">No data for this exercise in the selected period.</p>
            </div>
          {:else}
            <div class="rounded-md bg-white/5 border border-white/10 p-4">
              <canvas bind:this={canvasEl}></canvas>
            </div>

            <!-- Recent sessions -->
            <div class="space-y-2">
              <p class="text-xs font-medium text-white/40 uppercase tracking-wide">Recent sessions</p>
              <div class="rounded-md bg-white/5 border border-white/10 divide-y divide-white/5">
                {#each [...chartData()].reverse().slice(0, 8) as session, i (i)}
                  <a
                    href="/workouts/{session.workoutId}"
                    class="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-white/5 active:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                  >
                    <span class="text-white/60">
                      {fmt(session.date)}
                      {#if sortMode === 'all'}
                        <span class="text-white/30 ml-1">· Set {session.setIndex + 1}</span>
                      {/if}
                    </span>
                    <span class="text-white font-medium">
                      {#if selectedMetric === 'weight'}
                        {session.weight !== null ? `${session.weight}${session.unit ?? ''}` : 'bw'}
                      {:else}
                        {session.reps} reps
                      {/if}
                    </span>
                  </a>
                {/each}
              </div>
            </div>
          {/if}
        {/if}

      </div>
    {/if}

  </div>
</div>
