<script lang="ts">
  import { tick } from "svelte";
  import { store } from "../store.svelte";
  import { base, clientModels } from "../api";
  import { readPath, mask, newKey, tools, snippet, flag, type Lamp } from "../core";
  import Load from "../Load.svelte";
  import Rich from "../Rich.svelte";
  import { t } from "../lang.svelte";
  import type { Key } from "../i18n";

  const keys = $derived(readPath(store.config.data || {}, "access/api-keys", []) as string[]);
  let pick = $state(0),
    tool = $state<(typeof tools)[number]>("Claude Code"),
    models = $state<string[]>([]),
    model = $state(""),
    test = $state<{ lamp: Lamp; text: string }>({ lamp: "off", text: "" });
  const key = $derived(keys[Math.min(pick, keys.length - 1)] || "");
  const local = /^(localhost|127\.|\[?::1\]?$)/.test(location.hostname);
  // Cursor calls the proxy from its own servers, so a local address cannot work there.
  const target = $derived(tool === "Cursor" && local ? t("use.publicAddress") : base);
  const notes: Record<string, Key> = {
    "Claude Code": "note.claude",
    "Codex CLI": "note.codex",
    Cursor: "note.cursor",
    "OpenAI SDK": "note.openai",
    "Anthropic SDK": "note.anthropic",
    curl: "note.curl",
  };

  /** Asks this proxy for its model list with the chosen client key, as a tool would. */
  async function check() {
    const k = key;
    test = { lamp: "off", text: t("use.testing") };
    try {
      const ids = await clientModels(k);
      if (k !== key) return;
      models = ids;
      if (!ids.includes(model)) model = ids[0] || "";
      test = ids.length
        ? { lamp: "ok", text: t("use.working", { n: ids.length }) }
        : { lamp: "warn", text: t("use.keyNoModels") };
    } catch (e) {
      if (k === key) test = { lamp: "bad", text: e instanceof Error ? e.message : t("api.noReach") };
    }
  }
  $effect(() => {
    if (key) check();
  });
  async function create() {
    if (!(await store.act(() => store.replace("access/api-keys", keys, [...keys, newKey()]), t("start.keyCreated")))) return;
    // The button is gone now; continue at the tool choice unless the user already moved on.
    await tick();
    if (document.activeElement === document.body) document.querySelector<HTMLElement>('.seg button[aria-pressed="true"]')?.focus();
  }
</script>

<div class="head"><h1>{t("use.title")}</h1></div>
<p class="muted">{t("use.intro")}</p>

<Load res={store.config} what={t("what.clientKeys")}>
  {#snippet children()}
    <section class="section">
      <h2>{t("use.addressKey")}</h2>
      <dl class="facts">
        <div><dt>{t("use.proxyAddress")}</dt><dd class="mono">{base}</dd></div>
        <div><dt>{t("use.baseUrl")}</dt><dd class="mono">{base}/v1</dd></div>
      </dl>
      {#if local}<p class="note">
          <span class="lamp warn"></span>{t("use.localOnly")}
        </p>{/if}
      {#if keys.length}
        {#if keys.length > 1 || models.length}<div class="form picks">
            {#if keys.length > 1}<label class="field"
                >{t("use.clientKey")}<select bind:value={pick}>{#each keys as k, i}<option value={i}>{mask(k)}</option>{/each}</select></label
              >{/if}
            {#if models.length}<label class="field"
                >{t("use.model")}<select bind:value={model}>{#each models as m}<option>{m}</option>{/each}</select></label
              >{/if}
          </div>{/if}
        <div class="row">
          <p class="note grow" role="status"><span class="lamp {test.lamp}" class:live={test.text.endsWith("…")}></span>{test.text}</p>
          <button class="key small" onclick={check}>{t("use.testAgain")}</button>
        </div>
      {:else}
        <div class="state">
          <div class="row"><span class="lamp warn"></span>{t("use.noKey")}</div>
          <p>{t("use.noKeyBody")}</p>
          <button class="key primary" disabled={store.busy} onclick={create}
            ><svg class="i" aria-hidden="true"><use href="#i-plus" /></svg>{t("use.createKey")}</button
          >
        </div>
      {/if}
    </section>

    {#if keys.length}
      <section class="section">
        <h2>{t("use.setup")}</h2>
        <div class="seg" role="group" aria-label={t("use.tool")}>
          {#each tools as t}<button aria-pressed={tool === t} onclick={() => (tool = t)}>{t}</button>{/each}
        </div>
        <p class="muted">{t(notes[tool])}</p>
        <pre class="code-window" aria-label={t("use.setupLabel", { tool })}><div>{snippet(tool, target, mask(key), model || "MODEL_ID")}</div></pre>
        <div class="row">
          <button
            class="key primary"
            onclick={async () => {
              if (await store.act(() => navigator.clipboard.writeText(snippet(tool, target, key, model || "MODEL_ID")), t("use.copiedFull")))
                flag.set("start-tool", "1");
            }}
            ><svg class="i" aria-hidden="true"><use href="#i-copy" /></svg>{t("common.copy")}</button
          >
          <span class="legend">{t("use.copyNote")}</span>
        </div>
      </section>
    {/if}
  {/snippet}
</Load>
