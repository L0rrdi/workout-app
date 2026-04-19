<!-- src/routes/progress/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
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

  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtShort = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  let workouts = $state<Workout[]>([]);
  let loading = $state(true);
  let selectedExercise = $state('');
  let selectedPeriod = $state<Period>('all');
  let selectedDay = $state<DayType>('all');
  let selectedMetric = $state<Metric>('weight');
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

  const filteredWorkouts = $derived(
    selectedDay === 'all'
      ? workouts
      : workouts.filter(w => classifyWorkout(w.title) === selectedDay)
  );

  const exerciseNames = $derived(
    [...new Set(
      filteredWorkouts.flatMap(w => w.exercises.map(e => e.name))
    )].sort((a, b) => a.localeCompare(b))
  );

  function periodStart(period: Period): Date | null {
    const now = new Date();
    if (period === 'all') return null;
    const d = new Date(now);
    if (period === 'year')  { d.setFullYear(d.getFullYear() - 1); return d; }
    if (period === 'month') { d.setDate(d.getDate() - 30); return d; }
    if (period === 'week')  { d.setDate(d.getDate() - 7); return d; }
    if (period === 'day')   { d.setHours(0, 0, 0, 0); return d; }
    return null;
  }

  function getMaxReps(e: { reps: number; set_data?: string | null }): number {
    if (e.set_data) {
      const rows = JSON.parse(e.set_data) as SetRow[];
      return Math.max(...rows.map(r => r.reps));
    }
    return e.reps;
  }

  function getMaxWeight(e: { weight: number | null; set_data?: string | null }): number | null {
    if (e.set_data) {
      const rows = JSON.parse(e.set_data) as SetRow[];
      const weights = rows.map(r => r.weight).filter(w => w !== null) as number[];
      return weights.length > 0 ? Math.max(...weights) : null;
    }
    return e.weight;
  }

  const totalSets = $derived(() =>
    chartData().reduce((sum, s) => sum + s.sets, 0)
  );

  const chartData = $derived(() => {
    if (!selectedExercise) return [];
    const start = periodStart(selectedPeriod);
    const byDate = new Map<string, { date: string; workoutId: string; maxWeight: number | null; maxReps: number; sets: number; unit: string | null }>();
    filteredWorkouts
      .filter(w => !start || new Date(w.date + 'T00:00:00') >= start)
      .forEach(w => {
        const matches = w.exercises.filter(e => e.name.toLowerCase() === selectedExercise.toLowerCase());
        if (matches.length === 0) return;
        const best = matches.reduce((a, b) => {
          if (selectedMetric === 'weight') {
            const aw = getMaxWeight(a) ?? -1;
            const bw = getMaxWeight(b) ?? -1;
            return bw > aw ? b : a;
          } else {
            return getMaxReps(b) > getMaxReps(a) ? b : a;
          }
        });
        const maxWeight = getMaxWeight(best);
        const maxReps = getMaxReps(best);
        const existing = byDate.get(w.date);
        const betterThanExisting = !existing ||
          (selectedMetric === 'weight' ? (maxWeight ?? -1) > (existing.maxWeight ?? -1) : maxReps > existing.maxReps);
        if (betterThanExisting) {
          byDate.set(w.date, { date: w.date, workoutId: w.id, maxWeight, maxReps, sets: best.sets, unit: best.unit });
        }
      });
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  });

  function buildChart() {
    if (!canvasEl) return;
    if (chart) { chart.destroy(); chart = null; }

    const data = chartData();
    if (data.length === 0) return;

    const isWeight = selectedMetric === 'weight';
    const yValues = data.map(d => isWeight ? (d.maxWeight ?? 0) : d.maxReps);

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
              title: (items) => fmt(data[items[0].dataIndex].date),
              label: (item) => {
                const d = data[item.dataIndex];
                return isWeight
                  ? `${d.maxWeight}${d.unit}`
                  : `${d.maxReps} reps`;
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
    selectedExercise;
    selectedPeriod;
    selectedMetric;
    canvasEl;
    buildChart();
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
              class="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              {#each exerciseNames as name (name)}
                <option value={name} class="bg-neutral-900">{name}</option>
              {/each}
            </select>
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
                {#each [...chartData()].reverse().slice(0, 8) as session (session.date)}
                  <a
                    href="/workouts/{session.workoutId}"
                    class="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-white/5 active:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                  >
                    <span class="text-white/60">{fmt(session.date)}</span>
                    <span class="text-white font-medium">
                      {#if selectedMetric === 'weight'}
                        {session.maxWeight}{session.unit}
                      {:else}
                        {session.maxReps} reps
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
