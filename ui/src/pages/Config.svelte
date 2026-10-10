<script lang="ts">
  import { store } from "../store.svelte";
  import { api, configValue } from "../api";
  import { fieldPath, readPath, strategies, strategy } from "../core";
  import Editor from "../Editor.svelte";
  import Load from "../Load.svelte";
  import { t } from "../lang.svelte";
  import type { Key } from "../i18n";

  const about = ["server", "management", "access", "routing", "requests", "api-keys", "oauth", "client", "multimedia", "observability", "plugins"];
  let edit = $state<{ path: string; value: unknown; title: string; yaml: boolean } | null>(null);
  // Strategies this server understands; "soonest-reset" is a cliproxy-rs addition.
  const offered = $derived(strategies.filter((s) => !s.rust || store.kind === "rust"));
  const saved = $derived(readPath(store.config.data || {}, "routing/strategy", "") as string);
  const current = $derived(strategy(saved));
  const choose = (value: string) =>
    store.act(() => store.replace("routing/strategy", saved, value, ""), t("cf.strategySet", { name: t(strategy(value).name).toLowerCase() }));
  function open(section: string) {
    store.act(async () => {
      edit = section
        ? { path: fieldPath(section), value: await configValue(fieldPath(section), {}), title: section, yaml: false }
        : { path: "/config.yaml", value: await api("/config.yaml", "GET", undefined, "text"), title: "config.yaml", yaml: true };
    });
  }
</script>

<div class="head">
  <h1>{t("cf.title")}</h1>
  {#if !edit}<button class="key" disabled={store.busy} onclick={() => open("")}><svg class="i" aria-hidden="true"><use href="#i-edit" /></svg>{t("cf.editYaml")}</button>{/if}
</div>

{#if edit}
  <Editor {...edit} onclose={() => (edit = null)} />
{:else}
  <Load res={store.config} what={t("what.config")}>
    {#snippet children(config)}
      <section class="section">
        <h2>{t("cf.strategy")}</h2>
        <div class="seg" role="group" aria-label={t("cf.strategy")}>
          {#each offered as s}<button aria-pressed={current.value === s.value} disabled={store.busy} onclick={() => current.value !== s.value && choose(s.value)}
              >{t(s.name)}</button
            >{/each}
        </div>
        <p class="muted">{t(current.help)}</p>
      </section>
      {@const sections = [...new Set([...about, ...Object.keys(config)])].filter((k) => k !== "config-version")}
      <ul class="list">
        {#each sections as k}
          {@const v = config[k]}
          <li>
            <button class="item config-row" onclick={() => open(k)} disabled={store.busy}>
              <span class="name grow"><strong class="mono">{k}</strong><small>{about.includes(k) ? t(`cf.about.${k}` as Key) : t("cf.persisted")}</small></span>
              <span class="legend"
                >{v === undefined ? t("cf.defaults") : v && typeof v === "object" ? t("cf.nSet", { n: Object.keys(v).length }) : String(v)}</span
              >
              <svg class="i" aria-hidden="true"><use href="#i-chevron" /></svg>
            </button>
          </li>
        {/each}
      </ul>
      <p class="note">{t("cf.note")}</p>
    {/snippet}
  </Load>
{/if}
