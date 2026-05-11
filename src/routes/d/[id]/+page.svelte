<script lang="ts">
  import type { PageData } from './$types';
  import { Copy } from 'lucide-svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Pill from '$lib/components/Pill.svelte';
  import Callout from '$lib/components/Callout.svelte';

  let { data }: { data: PageData } = $props();

  const result = $derived(data.result);
  const created = $derived(new Date(data.createdAt));

  function pct(n: number): string {
    return `${Math.round(n * 100)}%`;
  }

  function copyShareLink() {
    navigator.clipboard?.writeText(window.location.href);
  }
</script>

<svelte:head>
  <title>{result.primary.name} — Appliance Troubleshooter</title>
  <meta name="description" content={`${result.primary.name}: ${result.primary.rationale.slice(0, 140)}`} />
</svelte:head>

<PageHeader>Appliance Troubleshooter</PageHeader>

<section class="mb-6">
  {#if result.appliance}
    <p class="text-xs uppercase tracking-wider text-muted m-0">Appliance</p>
    <h2 class="text-lg font-semibold tracking-tight m-0">
      {#if result.appliance.make || result.appliance.model}
        {result.appliance.make ?? ''} {result.appliance.model ?? ''}
      {:else}
        {result.appliance.category}
      {/if}
      <span class="text-muted font-normal text-sm">· {pct(result.appliance.confidence)}</span>
    </h2>
    <p class="text-muted text-sm mt-1">{result.appliance.category}</p>
  {:else}
    <p class="text-muted">
      Couldn't identify the specific make/model — diagnosis is based on visible failure symptoms.
    </p>
  {/if}
</section>

<section class="mb-6 border-l-2 border-fg pl-4">
  <p class="text-xs uppercase tracking-wider text-muted m-0">Primary diagnosis</p>
  <h2 class="text-lg font-semibold tracking-tight m-0">
    {result.primary.name}
    <span class="text-muted font-normal text-sm">· {pct(result.primary.confidence)}</span>
  </h2>
  <p class="mt-2">{result.primary.rationale}</p>
</section>

{#if result.primary.recovery.callPro}
  <Callout variant="danger" title="Call a professional">
    {#if result.primary.recovery.proReason}<p class="text-sm m-0">{result.primary.recovery.proReason}</p>{/if}
  </Callout>
{/if}

{#if result.primary.recovery.diy.length > 0}
  <section class="mb-6">
    <p class="font-semibold mb-2">
      {result.primary.recovery.callPro ? 'What a technician will likely do' : 'DIY steps'}
    </p>
    <ol class="m-0 pl-5 list-decimal space-y-1">
      {#each result.primary.recovery.diy as step}
        <li>
          {step.action}
          <span class="ml-1.5"><Pill variant={step.difficulty}>{step.difficulty}</Pill></span>
        </li>
      {/each}
    </ol>
  </section>
{/if}

{#if result.primary.parts.length > 0}
  <section class="mb-6">
    <p class="text-xs uppercase tracking-wider text-muted mb-2">Parts</p>
    {#each result.primary.parts as part}
      <div class="my-1">
        <strong>{part.name}</strong>
        {#if part.partNumber}<span class="font-mono text-muted ml-2">{part.partNumber}</span>{/if}
        {#if part.typicalCostUsd}<span class="text-muted ml-2">{part.typicalCostUsd}</span>{/if}
      </div>
    {/each}
  </section>
{/if}

{#if result.alternatives.length > 0}
  <section class="mb-6">
    <p class="text-xs uppercase tracking-wider text-muted mb-2">Alternatives</p>
    {#each result.alternatives as alt}
      <p class="my-1">
        <strong>{alt.name}</strong>
        <span class="text-muted"> · {pct(alt.confidence)}</span>
        — {alt.rationale}
      </p>
    {/each}
  </section>
{/if}

{#if result.whatWouldChangeMyMind.length > 0}
  <section class="mb-6">
    <p class="text-xs uppercase tracking-wider text-muted mb-2">What would change my mind</p>
    <ul class="m-0 pl-5 list-disc">
      {#each result.whatWouldChangeMyMind as check}
        <li>{check}</li>
      {/each}
    </ul>
  </section>
{/if}

<footer class="mt-8 pt-4 border-t border-line text-muted text-sm flex justify-between items-center">
  <span>{result.meta.model} · {created.toLocaleDateString()}</span>
  <button type="button" onclick={copyShareLink} class="btn-ghost border border-line rounded-md px-2 py-1">
    <Copy size={14} />
    Copy link
  </button>
</footer>

<div class="mt-6">
  <a href="/" class="btn-primary text-center no-underline">
    Diagnose another appliance
  </a>
</div>
