<script lang="ts">
  import { store, Res } from "../store.svelte";
  import { api, configValue } from "../api";
  import { readPath, fieldPath, type Data } from "../core";
  import Editor from "../Editor.svelte";
  import Load from "../Load.svelte";
  import { t } from "../lang.svelte";

  store.plugins.load();
  const market = new Res<Data>(() => api("/plugins/store"));
  let edit = $state<{ path: string; value: unknown; title: string } | null>(null);
  const on = $derived(readPath(store.config.data || {}, "plugins/enabled", false) === true);
  // Plugin descriptions come from remote stores: decode entities as text, never insert HTML.
  const text = (v: unknown) => new DOMParser().parseFromString(String(v || ""), "text/html").body.textContent || "";
  const after = async () => {
    await store.plugins.load(true);
    await store.config.load(true);
  };
  function configure(id: string) {
    store.act(async () => {
      const path = fieldPath(`plugins/configs/${id}`);
      edit = { path, value: await configValue(path, {}), title: id };
    });
  }
  function install(p: Data) {
    if (!confirm(t("pg.installAsk", { name: text(p.name || p.id) }))) return;
    store.act(async () => {
      const r = await api(`/plugins/store/${encodeURIComponent(p.id)}/install${p.source_id ? `?source=${encodeURIComponent(p.source_id)}` : ""}`, "POST", {});
      await after();
      await market.load(true);
      store.notify(r.restart_required ? t("pg.installedRestart") : t("pg.installed"));
    });
  }
</script>

<div class="head">
  <h1>{t("pg.title")}{#if store.plugins.data?.length}<span>{store.plugins.data.length}</span>{/if}</h1>
  {#if !edit}<button
      class="key"
      disabled={store.busy}
      onclick={() => store.call("PUT", fieldPath("plugins/enabled"), !on, on ? t("pg.off") : t("pg.on"), "", after)}
      ><span class="lamp {on ? 'ok' : 'off'}"></span>{on ? t("pg.btnOn") : t("pg.btnOff")}</button
    ><button class="key" disabled={market.loading || !store.can("GET", "/plugins") || !store.can("GET", "/plugins/store")} onclick={() => market.load()}>{t("pg.browse")}</button>{/if}
</div>

{#if edit}
  <Editor {...edit} onclose={() => (edit = null)} />
{:else}
  <Load res={store.plugins} what={t("what.plugins")}>
    {#snippet children(list)}
      {#if list.length}
        <ul class="list">
          {#each list as p (p.id)}
            <li class="item">
              <span class="lamp {p.registered && p.effective_enabled ? 'ok' : p.enabled ? 'warn' : 'off'}"></span>
              <span class="name grow"
                ><strong>{p.metadata?.name || p.id}</strong><small
                  >{[p.metadata?.version, p.supports_oauth && t("pg.signin"), p.supports_quota && t("pg.quota"), !p.registered && t("pg.notLoaded")].filter(Boolean).join(" · ")}</small
                ></span
              >
              <button
                class="key small"
                disabled={store.busy}
                onclick={() => store.call("PUT", fieldPath(`plugins/configs/${p.id}/enabled`), !p.enabled, t("pg.savedRestart"), "", after)}
                >{p.enabled ? t("common.disable") : t("common.enable")}</button
              >
              <button class="key small" disabled={store.busy} onclick={() => configure(p.id)}>{t("pg.configure")}</button>
              <button
                class="key small quiet danger"
                disabled={store.busy}
                onclick={() => store.call("DELETE", `/plugins/${encodeURIComponent(p.id)}`, undefined, t("pg.deleted"), t("pg.deleteAsk", { id: p.id }), after)}
                >{t("common.delete")}</button
              >
            </li>
          {/each}
        </ul>
      {:else}
        <div class="state">
          <div class="row"><span class="lamp off"></span>{t("pg.none")}</div>
          <p>{t("pg.noneBody")}</p>
        </div>
      {/if}
    {/snippet}
  </Load>
  {#if market.data || market.error || market.loading}
    <section class="section">
      <h2>{t("pg.store")}</h2>
      <Load res={market} what={t("what.pluginStore")}>
        {#snippet children(m)}
          {#each m.source_errors || [] as e}<p class="note error"><span class="lamp bad"></span>{e.source_name}: {e.message}</p>{/each}
          <ul class="list">
            {#each m.plugins || [] as p (`${p.source_id}/${p.id}`)}
              <li class="item">
                <span class="name grow"><strong>{text(p.name || p.id)} <span class="legend">{p.version}</span></strong><small>{text(p.description)}</small></span>
                <button class="key small" disabled={store.busy} onclick={() => install(p)}
                  >{p.installed ? (p.update_available ? t("pg.update") : t("pg.reinstall")) : t("pg.install")}</button
                >
              </li>
            {:else}<li class="state"><p>{t("pg.storeEmpty")}</p></li>{/each}
          </ul>
        {/snippet}
      </Load>
    </section>
  {/if}
{/if}
