<script lang="ts">
  import { store } from "../store.svelte";
  import { readPath, type Data } from "../core";
  import Load from "../Load.svelte";
  import { t } from "../lang.svelte";
  import type { Key } from "../i18n";

  const kinds = ["default", "default-raw", "override", "override-raw", "filter"];
  let kind = $state("default");
  let form = $state({ model: "*", protocol: "", params: '{\n  "temperature": 0.7\n}' });
  const payload = $derived(readPath(store.config.data || {}, "requests/payload", {}) as Data);
  const rules = $derived((payload[kind] || []) as Data[]);
  function add(e: SubmitEvent) {
    e.preventDefault();
    let params: unknown;
    try {
      params = JSON.parse(form.params);
    } catch {
      return store.notify(t("pl.badJson"), true);
    }
    const list = Array.isArray(params);
    if (kind === "filter" ? !list : list || !params || typeof params !== "object")
      return store.notify(kind === "filter" ? t("pl.filterList") : t("pl.object"), true);
    const model: Data = { name: form.model.trim() };
    if (form.protocol) model.protocol = form.protocol;
    store.act(() => store.replace(`requests/payload/${kind}`, rules, [...rules, { models: [model], params }]), t("pl.added"));
  }
</script>

<div class="head">
  <h1>{t("pl.title")}</h1>
  <a class="key" href="#config"><svg class="i" aria-hidden="true"><use href="#i-edit" /></svg>{t("common.edit")}</a>
</div>

  <div class="seg" role="group" aria-label={t("pl.kind")}>
    {#each kinds as k}<button aria-pressed={kind === k} onclick={() => (kind = k)}>{k}<b>{(payload[k] || []).length || ""}</b></button>{/each}
  </div>
  <Load res={store.config} what={t("what.payload")}>
    {#snippet children()}
      <section class="section">
        <p class="muted">{t(`pl.${kind}` as Key)} {t("pl.match")}</p>
        {#if rules.length}
          <ul class="list">
            {#each rules as rule, i}
              <li class="item rule">
                <div class="stack grow">
                  <div class="chips">
                    {#each rule.models || [] as m}<span class="chip">{m.name}{m.protocol ? ` · ${m.protocol}` : ""}</span>{/each}
                  </div>
                  <pre class="legend">{JSON.stringify(rule.params, null, 2)}</pre>
                </div>
                <button
                  class="key small quiet danger"
                  disabled={store.busy}
                  onclick={() => store.act(() => store.replace(`requests/payload/${kind}`, rules, rules.filter((_, n) => n !== i)), t("pl.removed"))}
                  >{t("common.remove")}</button
                >
              </li>
            {/each}
          </ul>
        {:else}<p class="note"><span class="lamp off"></span>{t("pl.noRules", { kind })}</p>{/if}
        <form class="stack" onsubmit={add}>
          <div class="form">
            <label class="field">{t("pl.model")}<input required bind:value={form.model} /></label>
            <label class="field"
              >{t("pl.protocol")}<select value={form.protocol} onchange={(e) => (form.protocol = e.currentTarget.value)}
                ><option value="">{t("pl.any")}</option>{#each ["openai", "claude", "gemini", "codex", "antigravity"] as p}<option>{p}</option>{/each}</select
              ></label
            >
          </div>
          <label class="field"
            >{kind === "filter" ? t("pl.pathsList") : t("pl.valuesObj")}<textarea
              class="code"
              rows="5"
              spellcheck="false"
              bind:value={form.params}></textarea></label
          >
          <div class="row"><button class="key primary" disabled={store.busy}><svg class="i" aria-hidden="true"><use href="#i-plus" /></svg>{t("pl.add")}</button></div>
        </form>
      </section>
    {/snippet}
  </Load>
