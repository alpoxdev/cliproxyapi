<script lang="ts">
  import { store } from "../store.svelte";
  import { readPath, mask, newKey } from "../core";
  import Load from "../Load.svelte";
  import Rich from "../Rich.svelte";
  import { t } from "../lang.svelte";

  let draft = $state(""),
    reveal = $state(false);
  const keys = $derived(readPath(store.config.data || {}, "access/api-keys", []) as string[]);
  const generate = () => (draft = newKey());
  function add(e: SubmitEvent) {
    e.preventDefault();
    const k = draft.trim();
    if (keys.includes(k)) return store.notify(t("keys.exists"), true);
    store
      .act(() => store.replace("access/api-keys", keys, [...keys, k]), t("keys.added"))
      .then((ok) => ok && (draft = ""));
  }
</script>

<div class="head">
  <h1>{t("keys.title")}{#if keys.length}<span>{keys.length}</span>{/if}</h1>
  {#if keys.length}<button class="key quiet" aria-pressed={reveal} onclick={() => (reveal = !reveal)}
      >{reveal ? t("common.hideKeys") : t("common.showKeys")}</button
    >{/if}
</div>

<Load res={store.config} what={t("what.clientKeys")}>
  {#snippet children()}
    <section class="section">
      <p class="muted"><Rich text={t("keys.intro")} /></p>
      {#if keys.length}
        <ul class="list">
          {#each keys as k, i (k)}
            <li class="item">
              <code class="grow ellipsis">{reveal ? k : mask(k)}</code>
              <button
                class="key small"
                onclick={() => store.act(() => navigator.clipboard.writeText(k), t("common.copied"))}
                ><svg class="i" width="14" height="14" aria-hidden="true"><use href="#i-copy" /></svg>{t("common.copy")}</button
              >
              <button
                class="key small quiet danger"
                disabled={store.busy}
                onclick={() =>
                  confirm(t("keys.confirmRemove")) &&
                  store.act(() => store.replace("access/api-keys", keys, keys.filter((_, n) => n !== i)), t("keys.removed"))}
                >{t("common.remove")}</button
              >
            </li>
          {/each}
        </ul>
      {:else}
        <div class="state">
          <div class="row"><span class="lamp warn"></span>{t("keys.none")}</div>
          <p>{t("keys.noneBody")}</p>
        </div>
      {/if}
      <form class="form" onsubmit={add}>
        <label class="field">{t("keys.new")}<input type="password" autocomplete="off" required bind:value={draft} /></label>
        <button type="button" class="key" onclick={generate}>{t("keys.generate")}</button>
        <button class="key primary" disabled={store.busy}><svg class="i" aria-hidden="true"><use href="#i-plus" /></svg>{t("keys.addKey")}</button>
      </form>
    </section>
  {/snippet}
</Load>
