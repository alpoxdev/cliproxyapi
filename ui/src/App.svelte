<script lang="ts">
  import { tick, type Component } from "svelte";
  import { store, pages } from "./store.svelte";
  import { t, lang, setLang } from "./lang.svelte";
  import { langs } from "./i18n";
  import Rich from "./Rich.svelte";
  import Overview from "./pages/Overview.svelte";
  import Use from "./pages/Use.svelte";
  import Credentials from "./pages/Credentials.svelte";
  import Connect from "./pages/Connect.svelte";
  import Providers from "./pages/Providers.svelte";
  import Keys from "./pages/Keys.svelte";
  import Models from "./pages/Models.svelte";
  import Payload from "./pages/Payload.svelte";
  import Quotas from "./pages/Quotas.svelte";
  import Usage from "./pages/Usage.svelte";
  import Logs from "./pages/Logs.svelte";
  import Config from "./pages/Config.svelte";
  import Plugins from "./pages/Plugins.svelte";
  import System from "./pages/System.svelte";

  const views: Record<string, Component> = {
    overview: Overview,
    use: Use,
    credentials: Credentials,
    connect: Connect,
    providers: Providers,
    keys: Keys,
    models: Models,
    payload: Payload,
    quotas: Quotas,
    usage: Usage,
    logs: Logs,
    config: Config,
    plugins: Plugins,
    system: System,
  };
  const View = $derived(views[store.route.page]);
  const current = $derived(store.route.page === "connect" ? "credentials" : store.route.page);
  const title = $derived(
    t(store.route.page === "connect" ? "page.connect" : (pages.find((p) => p[0] === current)?.[1] || "page.overview")),
  );
  const host = location.host;
  const version = $derived(/^\d/.test(store.meta.version) ? `v${store.meta.version}` : store.meta.version);
  let menu = $state(false);
  // After a page change, move focus to the new content (not on credential or log arguments).
  let page = store.route.page;
  $effect(() => {
    if (store.route.page === page) return;
    page = store.route.page;
    document.getElementById("main")?.focus({ preventScroll: true });
  });
  let secret = $state(""),
    failure = $state(""),
    connecting = $state(false);

  async function login(e: SubmitEvent) {
    e.preventDefault();
    connecting = true;
    failure = "";
    try {
      await store.login(secret);
      secret = "";
    } catch (err) {
      failure = err instanceof Error ? err.message : String(err);
    } finally {
      connecting = false;
    }
  }
  $effect(() => {
    const sync = () => {
      store.sync();
      menu = false;
    };
    addEventListener("hashchange", sync);
    return () => removeEventListener("hashchange", sync);
  });
</script>

<svelte:head><title>{store.logged ? `${title} · cliproxy-rs` : `${t("app.signInTitle")} · cliproxy-rs`}</title></svelte:head>
<svelte:window
  onkeydown={(e) => {
    if (e.key === "Escape" && menu) {
      menu = false;
      document.querySelector<HTMLElement>(".menu")?.focus();
    }
  }}
  onbeforeunload={(e) => store.dirty && e.preventDefault()}
/>

{#snippet mark()}<svg width="22" height="22" viewBox="0 0 40 40" aria-hidden="true"
    ><rect width="40" height="40" rx="10" fill="var(--ink)" /><path
      d="M11 11h0M20 11h0M29 11h0M11 20h0M29 20h0M11 29h0M20 29h0M29 29h0"
      stroke="var(--ink-3)"
      stroke-width="7"
      stroke-linecap="round"
    /><circle cx="20" cy="20" r="4.5" fill="var(--accent)" /></svg
  >cliproxy-rs{/snippet}
{#snippet theme()}<button
    class="key quiet round"
    onclick={() => store.toggleTheme()}
    aria-label={t(store.theme === "dark" ? "app.themeLight" : "app.themeDark")}
    ><svg class="i" aria-hidden="true"><use href={`#i-${store.theme === "dark" ? "sun" : "moon"}`} /></svg></button
  >{/snippet}
{#snippet language()}<button
    class="key quiet small"
    onclick={() => setLang(lang() === "ko" ? "en" : "ko")}
    lang={lang() === "ko" ? "en" : "ko"}
    aria-label={`${t("lang.label")}: ${langs[lang() === "ko" ? "en" : "ko"]}`}>{langs[lang() === "ko" ? "en" : "ko"]}</button
  >{/snippet}

{#if !store.logged}
  <main class="login">
    <form onsubmit={login}>
      <div class="top-row">
        <h1 class="brand">{@render mark()}</h1>
        <span class="row">{@render language()}{@render theme()}</span>
      </div>
      <div class="window">
        <label class="field"
          >{t("app.managementKey")}<input
            type="password"
            required
            bind:value={secret}
            autocomplete="current-password"
          /></label
        >
        {#if failure}<p class="note error" role="alert">
            <span class="lamp bad"></span>{failure}
          </p>{/if}
        <button class="key primary" disabled={connecting}
          >{connecting ? t("app.connecting") : t("app.connect")}</button
        >
      </div>
      <p class="small muted"><Rich text={t("app.loginHint")} /></p>
    </form>
  </main>
{:else}
  <a class="key skip" href="#main" onclick={(e) => (e.preventDefault(), document.getElementById("main")?.focus())}
    >{t("app.skip")}</a
  >
  <div class="shell">
    <nav class="side" class:open={menu} id="pages" aria-label={t("app.pages")}>
      <a class="brand" href="#overview">{@render mark()}</a>
      <div class="nav">
        {#each pages as [id, name]}{#if name}<a
              href={`#${id}`}
              aria-current={current === id ? "page" : undefined}
              >{t(name)}{#if id === "credentials" && store.creds.data?.length}<small
                  >{store.creds.data.length}</small
                >{/if}</a
            >{:else}<hr />{/if}{/each}
      </div>
      <div class="side-foot">
        {@render theme()}
        {@render language()}
        <button class="key quiet" onclick={() => (!store.dirty || confirm(t("app.discard"))) && store.logout()}><svg class="i" aria-hidden="true"><use href="#i-out" /></svg>{t("app.signOut")}</button>
      </div>
    </nav>
    <div class="main">
      <header class="top">
        <a class="brand" href="#overview">{@render mark()}</a>
        <span class="row" role="status">
          <span class="lamp {store.online ? 'ok' : 'bad'}"></span>
          {#if store.online}<span class="sr">{t("app.connectedTo")}</span><span class="host"
              >{host}{version ? ` · ${version}` : ""}</span
            >{:else}{t("app.lost")}{/if}
        </span>
        <button
          class="key round menu"
          aria-label={t("app.pages")}
          aria-expanded={menu}
          aria-controls="pages"
          onclick={() => (menu = !menu) && tick().then(() => document.querySelector<HTMLElement>(".nav a")?.focus())}><svg class="i" aria-hidden="true"><use href={`#i-${menu ? "close" : "menu"}`} /></svg></button
        >
      </header>
      <main class="page" id="main" tabindex="-1" inert={menu}>
        {#key store.route.page}<View />{/key}
      </main>
    </div>
  </div>
{/if}
{#if store.toast}<div class="toast" role={store.toast.bad ? "alert" : "status"}>
    <span class="lamp {store.toast.bad ? 'bad' : 'ok'}"></span>{store.toast.text}
    {#if store.toast.bad}<button
        class="key quiet round small"
        aria-label={t("app.dismiss")}
        onclick={() => (store.toast = null)}><svg class="i" aria-hidden="true"><use href="#i-close" /></svg></button
      >{/if}
  </div>{/if}
