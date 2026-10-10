<script lang="ts">
  import { tick, untrack } from "svelte";
  import { store, Res, every } from "../store.svelte";
  import { api, download } from "../api";
  import { type Data } from "../core";
  import Load from "../Load.svelte";
  import Missing from "../Missing.svelte";
  import { t } from "../lang.svelte";

  const MAX = 1500;
  let cursor = "",
    pane = $state<HTMLDivElement>(),
    query = $state(""),
    tail = $state(true),
    own = $state(false),
    reqId = $state(store.route.arg),
    reqText = $state(""),
    reqError = $state("");
  const logs: Res<string[]> = new Res(async (): Promise<string[]> => {
    const follow = !pane || pane.scrollHeight - pane.scrollTop - pane.clientHeight < 40;
    const r = await api(`/observability/logs?limit=300${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    const lines: string[] = r.lines || [];
    const next: string[] = cursor && !r["cursor-reset"] ? [...(logs.data || []), ...lines] : lines;
    cursor = r["next-cursor"] || "";
    tick().then(() => follow && pane && (pane.scrollTop = pane.scrollHeight));
    return next.slice(-MAX);
  });
  const files = new Res<Data[]>(async () => (await api("/observability/logs/errors")).files || []);
  logs.load();
  files.load();
  $effect(() => every(3000, async () => tail && store.can("GET", "/observability/logs") && (await logs.load(true))));
  // The dashboard's own management calls (including this tail) are hidden unless asked for.
  const shown = $derived(
    (logs.data || []).filter((l) => (own || !l.includes("/management/")) && l.toLowerCase().includes(query.trim().toLowerCase())),
  );
  const parse = (line: string) => line.match(/^\[([^\]]*)\] \[([^\]]*)\] \[(\w+)\s*\] (?:\[[^\]]*\] )?(.*)$/);
  async function inspect(id: string) {
    reqId = id;
    reqText = reqError = "";
    try {
      const text = await api(`/observability/logs/requests/${encodeURIComponent(id)}`, "GET", undefined, "text");
      if (id === reqId) reqText = text;
    } catch (e) {
      if (id === reqId) reqError = e instanceof Error ? e.message : String(e);
    }
  }
  $effect(() => {
    const id = store.route.arg;
    if (id) untrack(() => inspect(id));
  });
</script>

<div class="head">
  <h1>{t("lg.title")}</h1>
  <button class="key" disabled={!store.can("GET", "/observability/logs")} aria-pressed={tail} onclick={() => (tail = !tail)}
    ><span class="lamp {tail ? 'ok live' : 'off'}"></span>{tail ? t("lg.following") : t("lg.paused")}</button
  >
  <button
    class="key quiet danger"
    disabled={store.busy || !store.can("GET", "/observability/logs") || !store.can("DELETE", "/observability/logs")}
    onclick={() => store.call("DELETE", "/observability/logs", undefined, t("lg.cleared"), t("lg.clearAsk"), () => ((cursor = ""), logs.load()))}
    >{t("lg.clear")}</button
  >
</div>

<Load res={logs} what={t("what.logs")}>
  {#snippet children(lines)}
    <section class="section">
      <div class="row">
        <label class="search grow"><svg class="i" aria-hidden="true"><use href="#i-search" /></svg><span class="sr">{t("lg.filter")}</span><input bind:value={query} placeholder={t("lg.filter")} /></label>
        <label class="check"><input type="checkbox" checked={own} onchange={(e) => (own = e.currentTarget.checked)} />{t("lg.mgmt")}</label>
      </div>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex: the scrolling log must be reachable by keyboard -->
      <div class="code-window log" bind:this={pane} role="log" aria-label={t("lg.log")} tabindex="0">
        {#each shown as line}
          {@const m = parse(line)}
          {#if m}<div class={m[3].toLowerCase()}>
              <span class="t">{m[1].slice(11)}</span>
              {#if /[^-]/.test(m[2])}<a class="t" href={`#logs/${encodeURIComponent(m[2])}`}>{m[2]}</a>{:else}<span class="t">{m[2]}</span>{/if}
              <span class="lvl">{m[3]}</span>
              {m[4]}
            </div>{:else}<div>{line}</div>{/if}
        {:else}<div class="muted">{query ? t("lg.noMatch") : lines.length ? "" : t("lg.empty")}</div>{/each}
      </div>
      <p class="legend">{t("lg.count", { shown: shown.length.toLocaleString(), total: lines.length.toLocaleString(), max: MAX.toLocaleString() })}</p>
    </section>
  {/snippet}
</Load>

<section class="section">
  <h2>{t("lg.request")}</h2>
  <form class="form" onsubmit={(e) => {
      e.preventDefault();
      const id = reqId.trim();
      if (store.route.arg === id) inspect(id);
      else store.go(`logs/${encodeURIComponent(id)}`);
    }}>
    <label class="field">{t("lg.reqId")}<input required bind:value={reqId} placeholder={t("lg.reqPh")} /></label>
    <button class="key">{t("lg.open")}</button>
    {#if reqText}<button class="key" onclick={() => download(new Blob([reqText]), `request-${reqId}.log`)}><svg class="i" aria-hidden="true"><use href="#i-download" /></svg>{t("common.download")}</button>{/if}
  </form>
  {#if reqError}<p class="note error"><span class="lamp bad"></span>{reqError}</p>{/if}
  {#if reqText}<pre class="code-window request">{reqText}</pre>{/if}
</section>

<section class="section">
  <h2>{t("lg.errors")}</h2>
  <Load res={files} what={t("what.errorLogs")}>
    {#snippet children(list)}
      {#if list.length}
        <ul class="list">
          {#each list as f (f.name)}
            <li class="item">
              <code class="grow ellipsis">{f.name}</code>
              <span class="legend">{f.modified ? new Date(f.modified * 1000).toLocaleString(t.lang) : ""}</span>
              <button
                class="key small"
                onclick={() =>
                  store.act(async () =>
                    download(await api(`/observability/logs/errors/${encodeURIComponent(f.name)}`, "GET", undefined, "blob"), f.name),
                  )}><svg class="i" width="14" height="14" aria-hidden="true"><use href="#i-download" /></svg>{t("common.download")}</button
              >
            </li>
          {/each}
        </ul>
      {:else}<p class="muted">{t("lg.noErrors")}</p>{/if}
    {/snippet}
  </Load>
</section>
