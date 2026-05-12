<script lang="ts">
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Pill from '$lib/components/Pill.svelte';

  const result = {
    appliance: { category: 'dishwasher', make: 'Whirlpool', model: 'WDT780SAEM', confidence: 0.88 },
    primary: {
      name: 'Drain pump failure',
      confidence: 0.75,
      rationale: 'Standing water in the tub after the cycle finishes, with a humming sound from the lower area when the drain phase starts. Error code matches the known drain-circuit fault pattern for this model.',
      recovery: {
        diy: [
          { action: 'Disconnect power at the breaker', difficulty: 'easy' as const },
          { action: 'Pull the dishwasher out and remove the lower kick panel', difficulty: 'easy' as const },
          { action: 'Locate the drain pump (cylindrical, ~4 inch, on the sump assembly)', difficulty: 'moderate' as const },
          { action: 'Disconnect harness + hose clamps; remove pump', difficulty: 'moderate' as const },
          { action: 'Install replacement pump in reverse order, restore power, run a rinse-only cycle to verify', difficulty: 'moderate' as const }
        ],
        callPro: false
      },
      parts: [
        { name: 'Drain pump assembly', partNumber: 'W10348269', typicalCostUsd: '$45–80' }
      ]
    },
    alternatives: [
      { name: 'Clogged drain hose', confidence: 0.15, rationale: 'Less likely given humming sound; hose blockage usually presents as quiet failure.' },
      { name: 'Control board fault', confidence: 0.10, rationale: 'Possible but rare; board faults usually show as full unresponsiveness rather than partial cycle.' }
    ],
    whatWouldChangeMyMind: [
      'Open the drain pump filter — if heavily clogged, diagnosis shifts to "clogged drain."',
      'Run a test cycle with cabinet open — if the pump spins normally during drain, the issue is downstream (hose / disposal connection).'
    ],
    meta: { model: 'qwen/qwen-2.5-vl-72b-instruct', createdAt: '2026-05-11T10:00:00Z' }
  };

  const pct = (n: number) => `${Math.round(n * 100)}%`;
</script>

<svelte:head>
  <title>Example diagnosis — Appliance Troubleshooter</title>
</svelte:head>

<PageHeader>Appliance Troubleshooter</PageHeader>

<p class="text-xs text-muted mb-2">
  Model-generated diagnosis — verify before acting, especially on gas, electrical, or water work.
</p>
<p class="text-muted text-sm mb-6">This is a static example, not a real diagnosis.</p>

<section class="mb-6">
  <p class="text-xs uppercase tracking-wider text-muted m-0">Appliance</p>
  <h2 class="text-lg font-semibold tracking-tight m-0">
    {result.appliance.make} {result.appliance.model}
    <span class="text-muted font-normal text-sm">· {pct(result.appliance.confidence)}</span>
  </h2>
  <p class="text-muted text-sm mt-1">{result.appliance.category}</p>
</section>

<section class="mb-6 border-l-2 border-fg pl-4">
  <p class="text-xs uppercase tracking-wider text-muted m-0">Primary diagnosis</p>
  <h2 class="text-lg font-semibold tracking-tight m-0">
    {result.primary.name}
    <span class="text-muted font-normal text-sm">· {pct(result.primary.confidence)}</span>
  </h2>
  <p class="mt-2">{result.primary.rationale}</p>
</section>

<section class="mb-6">
  <p class="font-semibold mb-2">DIY steps</p>
  <ol class="m-0 pl-5 list-decimal space-y-1">
    {#each result.primary.recovery.diy as step}
      <li>
        {step.action}
        <span class="ml-1.5"><Pill variant={step.difficulty}>{step.difficulty}</Pill></span>
      </li>
    {/each}
  </ol>
</section>

<section class="mb-6">
  <p class="text-xs uppercase tracking-wider text-muted mb-2">Parts</p>
  {#each result.primary.parts as part}
    <div class="my-1">
      <strong>{part.name}</strong>
      <span class="font-mono text-muted ml-2">{part.partNumber}</span>
      <span class="text-muted ml-2">{part.typicalCostUsd}</span>
    </div>
  {/each}
</section>

<section class="mb-6">
  <p class="text-xs uppercase tracking-wider text-muted mb-2">Alternatives</p>
  {#each result.alternatives as alt}
    <p class="my-1"><strong>{alt.name}</strong> <span class="text-muted">· {pct(alt.confidence)}</span> — {alt.rationale}</p>
  {/each}
</section>

<section class="mb-6">
  <p class="text-xs uppercase tracking-wider text-muted mb-2">What would change my mind</p>
  <ul class="m-0 pl-5 list-disc">
    {#each result.whatWouldChangeMyMind as check}
      <li>{check}</li>
    {/each}
  </ul>
</section>

<footer class="mt-8 pt-4 border-t border-line text-muted text-sm">
  Example · {result.meta.model}
</footer>

<div class="mt-6">
  <a href="/" class="btn-primary text-center no-underline">
    Diagnose your appliance
  </a>
</div>
