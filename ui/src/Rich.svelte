<script lang="ts">
  // A dictionary message where `backticks` mark code. Plain text nodes only; nothing is parsed as HTML.
  let { text }: { text: string } = $props();
  const parts = $derived(text.split("`"));
</script>

{#each parts as part, i}{#if i % 2}<code>{part}</code>{:else}{part}{/if}{/each}
