<script lang="ts">
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

  const created = new Date(result.meta.createdAt);
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const difficultyColor = (d: 'easy' | 'moderate' | 'advanced') =>
    d === 'easy' ? '#d4e8d8' : d === 'moderate' ? '#fde7c0' : '#fad0c8';
</script>

<svelte:head>
  <title>Example diagnosis — Appliance Troubleshooter</title>
</svelte:head>

<header style="margin-bottom: 1.5rem;">
  <a href="/" style="color: var(--muted); text-decoration: none;">← Appliance Troubleshooter</a>
  <p style="margin: 0.5rem 0 0; color: var(--muted); font-size: 0.85rem;">This is a static example, not a real diagnosis.</p>
</header>

<section style="margin-bottom: 1.5rem;">
  <p style="margin: 0; color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Appliance</p>
  <h2 style="margin: 0;">{result.appliance.make} {result.appliance.model}
    <span style="color: var(--muted); font-weight: normal; font-size: 0.85rem;">· {pct(result.appliance.confidence)}</span>
  </h2>
  <p style="margin: 0.25rem 0 0; color: var(--muted); font-size: 0.9rem;">{result.appliance.category}</p>
</section>

<section style="margin-bottom: 1.5rem; border-left: 3px solid var(--accent); padding-left: 1rem;">
  <p style="margin: 0; color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Primary diagnosis</p>
  <h2 style="margin: 0;">{result.primary.name}
    <span style="color: var(--muted); font-weight: normal; font-size: 0.85rem;">· {pct(result.primary.confidence)}</span>
  </h2>
  <p>{result.primary.rationale}</p>
</section>

<section style="margin-bottom: 1.5rem;">
  <p style="margin: 0 0 0.5rem; font-weight: 600;">DIY steps</p>
  <ol style="margin: 0; padding-left: 1.2rem;">
    {#each result.primary.recovery.diy as step}
      <li style="margin-bottom: 0.3rem;">
        {step.action}
        <span style="font-size: 0.7rem; padding: 0.1rem 0.5rem; background: {difficultyColor(step.difficulty)}; border-radius: 10px; margin-left: 0.4rem; text-transform: uppercase; letter-spacing: 0.05em;">
          {step.difficulty}
        </span>
      </li>
    {/each}
  </ol>
</section>

<section style="margin-bottom: 1.5rem;">
  <p style="margin: 0 0 0.5rem; color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Parts</p>
  {#each result.primary.parts as part}
    <div style="margin: 0.2rem 0;">
      <strong>{part.name}</strong>
      <span style="font-family: ui-monospace, monospace; color: var(--muted); margin-left: 0.5rem;">{part.partNumber}</span>
      <span style="color: var(--muted); margin-left: 0.5rem;">{part.typicalCostUsd}</span>
    </div>
  {/each}
</section>

<section style="margin-bottom: 1.5rem;">
  <p style="margin: 0 0 0.5rem; color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Alternatives</p>
  {#each result.alternatives as alt}
    <p style="margin: 0.3rem 0;"><strong>{alt.name}</strong> <span style="color: var(--muted);">· {pct(alt.confidence)}</span> — {alt.rationale}</p>
  {/each}
</section>

<section style="margin-bottom: 1.5rem;">
  <p style="margin: 0 0 0.5rem; color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">What would change my mind</p>
  <ul style="margin: 0; padding-left: 1.2rem;">
    {#each result.whatWouldChangeMyMind as check}
      <li>{check}</li>
    {/each}
  </ul>
</section>

<footer style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--muted); font-size: 0.85rem;">
  Example · {result.meta.model}
</footer>

<div style="margin-top: 1.5rem;">
  <a href="/" class="button-primary" style="display: inline-block; text-align: center; text-decoration: none;">
    Diagnose your appliance
  </a>
</div>
