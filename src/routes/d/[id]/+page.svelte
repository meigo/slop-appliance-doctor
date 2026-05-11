<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const result = $derived(data.result);
  const created = $derived(new Date(data.createdAt));

  function pct(n: number): string {
    return `${Math.round(n * 100)}%`;
  }

  function difficultyColor(d: 'easy' | 'moderate' | 'advanced'): string {
    if (d === 'easy') return '#d4e8d8';
    if (d === 'moderate') return '#fde7c0';
    return '#fad0c8';
  }

  function copyShareLink() {
    navigator.clipboard?.writeText(window.location.href);
  }
</script>

<svelte:head>
  <title>{result.primary.name} — Appliance Troubleshooter</title>
  <meta name="description" content={`${result.primary.name}: ${result.primary.rationale.slice(0, 140)}`} />
</svelte:head>

<header style="margin-bottom: 1.5rem;">
  <a href="/" style="color: var(--muted); text-decoration: none;">← Appliance Troubleshooter</a>
</header>

<section style="margin-bottom: 1.5rem;">
  {#if result.appliance}
    <p style="margin: 0; color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Appliance</p>
    <h2 style="margin: 0;">
      {#if result.appliance.make || result.appliance.model}
        {result.appliance.make ?? ''} {result.appliance.model ?? ''}
      {:else}
        {result.appliance.category}
      {/if}
      <span style="color: var(--muted); font-weight: normal; font-size: 0.85rem;">· {pct(result.appliance.confidence)}</span>
    </h2>
    <p style="margin: 0.25rem 0 0; color: var(--muted); font-size: 0.9rem;">{result.appliance.category}</p>
  {:else}
    <p style="margin: 0; color: var(--muted);">
      Couldn't identify the specific make/model — diagnosis is based on visible failure symptoms.
    </p>
  {/if}
</section>

<section style="margin-bottom: 1.5rem; border-left: 3px solid var(--accent); padding-left: 1rem;">
  <p style="margin: 0; color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Primary diagnosis</p>
  <h2 style="margin: 0;">
    {result.primary.name}
    <span style="color: var(--muted); font-weight: normal; font-size: 0.85rem;">· {pct(result.primary.confidence)}</span>
  </h2>
  <p>{result.primary.rationale}</p>
</section>

{#if result.primary.recovery.callPro}
  <div style="margin: 0 0 1rem; padding: 0.75rem 1rem; background: #ffe9d6; border-radius: 6px; border-left: 4px solid #c44;">
    <div style="font-weight: 600; color: #6a2a00;">⚠ Call a professional</div>
    {#if result.primary.recovery.proReason}
      <div style="font-size: 0.9rem; color: #6a2a00; margin-top: 0.3rem;">{result.primary.recovery.proReason}</div>
    {/if}
  </div>
{/if}

{#if result.primary.recovery.diy.length > 0}
  <section style="margin-bottom: 1.5rem;">
    <p style="margin: 0 0 0.5rem; font-weight: 600;">
      {result.primary.recovery.callPro ? 'What a technician will likely do' : 'DIY steps'}
    </p>
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
{/if}

{#if result.primary.parts.length > 0}
  <section style="margin-bottom: 1.5rem;">
    <p style="margin: 0 0 0.5rem; color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Parts</p>
    {#each result.primary.parts as part}
      <div style="margin: 0.2rem 0;">
        <strong>{part.name}</strong>
        {#if part.partNumber}<span style="font-family: ui-monospace, monospace; color: var(--muted); margin-left: 0.5rem;">{part.partNumber}</span>{/if}
        {#if part.typicalCostUsd}<span style="color: var(--muted); margin-left: 0.5rem;">{part.typicalCostUsd}</span>{/if}
      </div>
    {/each}
  </section>
{/if}

{#if result.alternatives.length > 0}
  <section style="margin-bottom: 1.5rem;">
    <p style="margin: 0 0 0.5rem; color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Alternatives</p>
    {#each result.alternatives as alt}
      <p style="margin: 0.3rem 0;">
        <strong>{alt.name}</strong>
        <span style="color: var(--muted);"> · {pct(alt.confidence)}</span>
        — {alt.rationale}
      </p>
    {/each}
  </section>
{/if}

{#if result.whatWouldChangeMyMind.length > 0}
  <section style="margin-bottom: 1.5rem;">
    <p style="margin: 0 0 0.5rem; color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">What would change my mind</p>
    <ul style="margin: 0; padding-left: 1.2rem;">
      {#each result.whatWouldChangeMyMind as check}
        <li>{check}</li>
      {/each}
    </ul>
  </section>
{/if}

<footer style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--muted); font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
  <span>{result.meta.model} · {created.toLocaleDateString()}</span>
  <button type="button" onclick={copyShareLink} style="background: none; border: 1px solid var(--border); color: var(--muted); padding: 0.25rem 0.5rem; border-radius: 4px;">
    Copy link
  </button>
</footer>

<div style="margin-top: 1.5rem;">
  <a href="/" class="button-primary" style="display: inline-block; text-align: center; text-decoration: none;">
    Diagnose another appliance
  </a>
</div>
