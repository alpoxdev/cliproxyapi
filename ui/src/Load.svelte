<script lang="ts" generics="T">
  import type { Snippet } from "svelte";
  import { ApiError } from "./api";
  import type { Res } from "./store.svelte";
  import { t } from "./lang.svelte";
  import Rich from "./Rich.svelte";
  // Honest states for one server read: loading, not available, error, then the data.
  let {
    res,
    what,
    children,
  }: { res: Res<T>; what: string; children: Snippet<[T]> } = $props();
  const error = $derived(res.error as ApiError | Error | null);
  const missing = $derived(error instanceof ApiError && error.missing);
</script>

{#if res.data !== undefined && !missing}
  {#if error}<p class="note error" role="alert">
      <span class="lamp bad"></span>{t("load.stale", { message: error.message })}
      <button class="key small quiet" onclick={() => res.load()}>{t("common.retry")}</button>
    </p>{/if}
  {@render children(res.data)}
{:else if missing && error instanceof ApiError}
  <div class="state">
    <div class="row"><span class="lamp off"></span>{t("load.missing")}</div>
    <p><Rich text={t("load.missingBody", { call: `${error.method} ${error.path}`, status: error.status })} /></p>
  </div>
{:else if error}
  <div class="state" role="alert">
    <div class="row"><span class="lamp bad"></span>{t("load.failed", { what: what.toLowerCase() })}</div>
    <p>{error.message}</p>
    <div class="actions">
      <button class="key small" onclick={() => res.load()}>{t("common.tryAgain")}</button>
    </div>
  </div>
{:else}
  <div aria-busy="true" aria-label={t("load.busy", { what: what.toLowerCase() })}>
    <div class="skel"></div>
  </div>
{/if}
