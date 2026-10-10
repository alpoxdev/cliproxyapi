<script lang="ts">
  import { store, every } from "../store.svelte";
  import { credState, credName, provider, label, ago, otherSignals } from "../core";
  import { check, checkAll, canCheck, hasSource, limits, quotaKey } from "../quota";
  import Load from "../Load.svelte";
  import Missing from "../Missing.svelte";
  import Meter from "../Meter.svelte";
  import { t } from "../lang.svelte";

  $effect(() => every(15_000, () => store.creds.load(true)));
  if (!store.plugins.data) store.plugins.load();
  let checking = $state(false);
  async function all() {
    checking = true;
    await checkAll(store.creds.data || []);
    checking = false;
  }
</script>

<div class="head">
  <h1>{t("qt.title")}</h1>
  <button class="key" disabled={checking || !(store.creds.data || []).some(canCheck)} onclick={all}
    >{checking ? t("common.checking") : t("qt.checkAll")}</button
  >
</div>
<Missing actions={[["POST", "/requests/api-call", t("qt.miss.live")], ["POST", "/quota/fetch", t("qt.miss.live")], ["POST", "/routing/cooldown/reset", t("qt.miss.reset")]]} />
<p class="muted">{t("qt.intro")}</p>

<Load res={store.creds} what={t("what.credentials")}>
  {#snippet children(list)}
    <ul class="list">
      {#each list as a (`${a.name}\u0000${a.auth_index}`)}
        {@const s = credState(a, Date.now(), t)}
        {@const q = limits(a)}
        {@const signals = otherSignals(a.quota, q && "windows" in q ? q.windows : [])}
        <li class="stack quota-item">
          <div class="item">
            <span class="lamp {s.lamp}"></span>
            <span class="name grow"><strong>{credName(a)}</strong><small>{label(provider(a), t)} · {s.label}</small></span>
            <button class="key small" disabled={!canCheck(a)} onclick={() => check(a)}>{t("qt.check")}</button>
            <button
              class="key small quiet"
              disabled={store.busy || !a.auth_index || !a.cooldowns?.length || !store.can("POST", "/routing/cooldown/reset")}
              onclick={() => store.call("POST", "/routing/cooldown/reset", { auth_index: a.auth_index }, t("cr.act.cleared"))}
              >{t("qt.reset")}</button
            >
          </div>
          {#if q && "windows" in q}
            {#each q.windows as w}<Meter {w} />{:else}<p class="legend">{t("qt.noWindows")}</p>{/each}
            <!-- Passive windows share the signals' "observed" line; only a live check was "checked". -->
            <span class="legend"
              >{!q.at ? "" : store.quota[quotaKey(a)] ? t("qt.checked", { ago: ago(q.at, Date.now(), t) }) : signals.length ? "" : t("qt.observed", { ago: ago(q.at, Date.now(), t) })}</span
            >
          {:else if q}<p class="note error"><span class="lamp bad"></span>{q.error}</p>{/if}
          {#if signals.length}<div class="chips">
              {#each signals as [k, v]}<span class="chip">{k}: {v}</span>{/each}
              <span class="legend">{t("qt.observedLower", { ago: ago(a.quota.observed_at, Date.now(), t) })}</span>
            </div>{/if}
          {#if !q && !signals.length && !hasSource(a)}<p class="legend">
              {t("qt.noSource", { provider: label(provider(a), t) })}
            </p>{/if}
        </li>
      {:else}
        <li class="state"><p>{t("qt.none")}</p></li>
      {/each}
    </ul>
  {/snippet}
</Load>
