<script lang="ts">
  import { store, Res } from "../store.svelte";
  import { api } from "../api";
  import { readPath, label, type Data } from "../core";
  import Load from "../Load.svelte";
  import { t } from "../lang.svelte";

  const channels = ["claude", "codex", "antigravity", "kimi", "xai", "meta", "command-code", "nous", "github-copilot", "vertex", "aistudio"];
  let channel = $state("claude");
  let alias = $state({ name: "", alias: "", fork: false }),
    pattern = $state("");
  const aliases = $derived(readPath(store.config.data || {}, `oauth/model-alias/${channel}`, []) as Data[]);
  const excluded = $derived(readPath(store.config.data || {}, `oauth/excluded-models/${channel}`, []) as string[]);
  let catalog = $state.raw<Res<Data[]>>();
  $effect(() => {
    const c = channel;
    const r = new Res<Data[]>(async () => (await api(`/routing/model-definitions/${encodeURIComponent(c)}`)).models || []);
    catalog = r;
    r.load();
  });
  const k = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n || "—"));
  function addAlias(e: SubmitEvent) {
    e.preventDefault();
    const next = { name: alias.name.trim(), alias: alias.alias.trim(), ...(alias.fork ? { fork: true } : {}) };
    if (aliases.some((a) => a.alias === next.alias)) return store.notify(t("md.aliasExists"), true);
    store
      .act(() => store.replace(`oauth/model-alias/${channel}`, aliases, [...aliases, next]), t("md.aliasAdded"))
      .then((ok) => ok && (alias = { name: "", alias: "", fork: false }));
  }
  function exclude(e: SubmitEvent) {
    e.preventDefault();
    store
      .act(() => store.replace(`oauth/excluded-models/${channel}`, excluded, [...new Set([...excluded, pattern.trim()])]), t("md.excludedDone"))
      .then((ok) => ok && (pattern = ""));
  }
</script>

<div class="head"><h1>{t("md.title")}</h1></div>
<div class="seg" role="group" aria-label={t("md.channel")}>
  {#each channels as c}<button aria-pressed={channel === c} onclick={() => (channel = c)}>{label(c, t)}</button>{/each}
</div>

<Load res={store.config} what={t("what.modelSettings")}>
  {#snippet children()}
    <section class="section">
      <div class="section-head"><h2>{t("md.aliases")}</h2><span class="legend">{t("md.aliasHelp")}</span></div>
      {#if aliases.length}
        <ul class="list">
          {#each aliases as a, i}
            <li class="item">
              <code>{a.name}</code><svg class="i" width="14" height="14" aria-hidden="true"><use href="#i-chevron" /></svg><code class="grow">{a.alias}</code>
              {#if a.fork}<span class="legend">{t("md.keepsOriginal")}</span>{/if}
              <button
                class="key small quiet danger"
                disabled={store.busy}
                onclick={() => store.act(() => store.replace(`oauth/model-alias/${channel}`, aliases, aliases.filter((_, n) => n !== i)), t("md.aliasRemoved"))}
                >{t("common.remove")}</button
              >
            </li>
          {/each}
        </ul>
      {:else}<p class="muted">{t("md.noAliases")}</p>{/if}
      <form class="form" onsubmit={addAlias}>
        <label class="field">{t("md.upstream")}<input list="defs" required bind:value={alias.name} /></label>
        <label class="field">{t("md.alias")}<input required bind:value={alias.alias} /></label>
        <label class="check"><input type="checkbox" checked={alias.fork} onchange={(e) => (alias.fork = e.currentTarget.checked)} />{t("md.keepOriginal")}</label>
        <button class="key" disabled={store.busy}><svg class="i" aria-hidden="true"><use href="#i-plus" /></svg>{t("md.addAlias")}</button>
      </form>
    </section>

    <section class="section">
      <div class="section-head"><h2>{t("md.excluded")}</h2><span class="legend">{t("md.excludedHelp")}</span></div>
      <div class="chips">
        {#each excluded as m, i}<span class="chip"
            >{m}<button
              aria-label={t("md.allow", { name: m })}
              disabled={store.busy}
              onclick={() => store.act(() => store.replace(`oauth/excluded-models/${channel}`, excluded, excluded.filter((_, n) => n !== i)))}
              ><svg class="i" width="12" height="12" aria-hidden="true"><use href="#i-close" /></svg></button
            ></span
          >{:else}<span class="muted">{t("md.all")}</span>{/each}
      </div>
      <form class="form" onsubmit={exclude}>
        <label class="field">{t("md.pattern")}<input required bind:value={pattern} placeholder="*-preview" /></label>
        <button class="key" disabled={store.busy}>{t("md.exclude")}</button>
      </form>
    </section>
  {/snippet}
</Load>

<section class="section">
  <div class="section-head"><h2>{t("md.catalog")}</h2>{#if catalog?.data}<span class="legend">{t("md.count", { n: catalog.data.length })}</span>{/if}</div>
  {#if catalog}<Load res={catalog} what={t("what.catalog")}>
    {#snippet children(list)}
      {#if list.length}
        <ul class="list">
          <li class="item catalog legend" aria-hidden="true"><span>{t("md.colModel")}</span><span>{t("md.colName")}</span><span class="count">{t("md.colContext")}</span><span class="count">{t("md.colOutput")}</span></li>
          {#each list as m (m.id)}
            <li class="item catalog">
              <code class="ellipsis">{m.id}</code><span class="ellipsis">{m.display_name || ""}</span>
              <span class="num count">{k(m.context_length)}</span><span class="num count">{k(m.max_completion_tokens)}</span>
            </li>
          {/each}
        </ul>
        <datalist id="defs">{#each list as m}<option value={m.id}></option>{/each}</datalist>
      {:else}<p class="muted">{t("md.noDefs", { provider: label(channel, t) })}</p>{/if}
    {/snippet}
  </Load>{/if}
</section>
