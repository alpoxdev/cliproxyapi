<script lang="ts">
  import { store, every } from "../store.svelte";
  import { api, ApiError } from "../api";
  import { label, type Data } from "../core";
  import Missing from "../Missing.svelte";
  import { t } from "../lang.svelte";

  const builtIn = ["claude", "codex", "antigravity", "kimi", "kimi-ai", "xai", "devin", "meta", "command-code", "nous", "github-copilot"];
  // Go starts a local callback forwarder for these when asked by a web UI.
  const forwarded = ["claude", "codex", "antigravity", "xai", "devin"];
  if (!store.plugins.data) store.plugins.load();
  const providers = $derived([
    ...builtIn,
    ...(store.plugins.data || []).filter((p) => p.supports_oauth).map((p) => String(p.oauth_provider || p.id)),
  ]);
  let gone = $state<string[]>([]),
    session = $state<Data | null>(null),
    status = $state(""),
    problem = $state(""),
    callback = $state("");
  const can = $derived(store.can("GET", "/oauth/auth-url"));

  async function start(p: string) {
    if (session && status === "wait" && !(await cancel())) return;
    store.act(async () => {
      const r = await api(`/oauth/auth-url?provider=${encodeURIComponent(p)}${forwarded.includes(p) ? "&is_webui=true" : ""}`).catch((e) => {
        // Go knows every built-in provider; a server that lacks one answers provider_not_found.
        if (e instanceof ApiError && e.code === "provider_not_found") {
          gone = [...gone, p];
          throw new Error(t("cn.unavailable", { provider: label(p, t) }));
        }
        throw e;
      });
      if (!/^https?:/.test(new URL(r.url).protocol)) throw new Error(t("cn.unsafe"));
      session = { ...r, provider: p, started: Date.now() };
      status = "wait";
      problem = callback = "";
    });
  }
  /** Ends the pending sign-in; false when the server did not take the request. */
  async function cancel() {
    const s = session!;
    // "Cancelled" only when the server says so. A session that already ended answers
    // cancelled: false, and the next status read shows how it really ended.
    try {
      const r = await api(`/oauth/session?state=${encodeURIComponent(s.state)}`, "DELETE");
      if (s === session && r.cancelled !== false) finish("cancelled");
      return true;
    } catch (e) {
      store.notify(t("cn.notCancelled", { message: e instanceof Error ? e.message : String(e) }), true);
      return false;
    }
  }
  // A finished session replaces any in-progress message ("Callback sent…") so the toast
  // never contradicts the panel. Errors stay: the panel shows them in place.
  function finish(next: string) {
    status = next;
    if (store.toast && !store.toast.bad) store.toast = null;
  }
  $effect(() =>
    every(2000, async () => {
      const s = session;
      if (!s || status !== "wait") return;
      const r = await api(`/oauth/status?state=${encodeURIComponent(s.state)}`).catch((e) => ({ status: "error", error: e.message }));
      // A reply for a session that was cancelled or replaced meanwhile is ignored.
      if (r.status === "wait" || s !== session || status !== "wait") return;
      problem = r.error || "";
      finish(r.status);
      if (r.status === "ok") {
        store.notify(t("cn.connected", { provider: label(s.provider, t) }));
        store.creds.load(true);
      }
    }),
  );
  function vertex(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    store.act(async () => {
      await api("/oauth/import?provider=vertex", "POST", form).catch((e) => {
        if (!(e instanceof ApiError && e.code === "provider_not_found")) throw e;
        gone = [...gone, "vertex"];
        throw new Error(t("cn.vertexNA"));
      });
      await store.creds.load(true);
    }, t("cn.vertexDone"));
  }
</script>

<div class="head"><h1>{t("page.connect")}</h1></div>
<Missing actions={[["GET", "/oauth/auth-url", t("cn.miss.signin")], ["POST", "/oauth/import", t("cn.miss.vertex")]]} />

<section class="section">
  <h2>{t("cn.signInWith")}</h2>
  <p class="muted">{t("cn.oauth")}</p>
  <div class="providers">
    {#each providers as p}
      <button
        class="key"
        aria-pressed={session?.provider === p && status === "wait"}
        disabled={store.busy || !can || gone.includes(p)}
        onclick={() => start(p)}>{label(p, t)}</button
      >
    {/each}
  </div>
</section>

{#if session}
  <section class="window flow" aria-live="polite">
    <div class="section-head">
      <h2>{label(session.provider, t)}</h2>
      <span class="row">
        <span class="lamp {status === 'ok' ? 'ok' : status === 'wait' ? 'warn live' : status === 'error' ? 'bad' : 'off'}"></span>
        {status === "wait" ? t("cn.wait") : status === "ok" ? t("cn.ok") : status === "error" ? t("cn.fail") : t("cn.cancelled")}
      </span>
    </div>
    {#if status === "wait"}
      <ol class="steps">
        <li>
          <span>{session.user_code ? t("cn.step1Code") : t("cn.step1")}</span>
          {#if session.user_code}<code class="code-big">{session.user_code}</code>{/if}
          <div class="row">
            <a class="key primary" href={session.url} target="_blank" rel="noopener noreferrer"><svg class="i" aria-hidden="true"><use href="#i-open" /></svg>{t("cn.open")}</a>
            <button class="key" onclick={() => store.act(() => navigator.clipboard.writeText(session!.url), t("cn.linkCopied"))}><svg class="i" aria-hidden="true"><use href="#i-copy" /></svg>{t("cn.copyLink")}</button>
          </div>
        </li>
        {#if session.flow !== "device"}
          <li>
            <span>{session.provider === "command-code" ? t("cn.pasteKey") : t("cn.pasteUrl")}</span>
            <form
              class="form"
              onsubmit={(e) => {
                e.preventDefault();
                const key = session!.provider === "command-code";
                store.act(() => api("/oauth/callback", "POST", key ? { provider: "command-code", state: session!.state, code: callback.trim() } : { provider: session!.provider, redirect_url: callback.trim() }), t("cn.callbackSent"));
              }}
            >
              <label class="field"><span class="sr">{session.provider === "command-code" ? t("cn.apiKey") : t("cn.callbackAddr")}</span><input type={session.provider === "command-code" ? "password" : "url"} required bind:value={callback} placeholder={session.provider === "command-code" ? t("cn.ccKey") : "http://localhost:…/callback?code=…"} autocomplete="off" /></label>
              <button class="key" disabled={store.busy}>{t("common.send")}</button>
            </form>
          </li>
        {/if}
      </ol>
      <div class="row"><button class="key quiet" onclick={cancel}>{t("cn.cancel")}</button></div>
    {:else if status === "ok"}
      <p>{t("cn.saved")}</p>
      <div class="row"><a class="key primary" href="#credentials">{t("cn.viewCreds")}</a></div>
    {:else}
      {#if problem}<p class="error">{problem}</p>{/if}
      <div class="row"><button class="key" onclick={() => start(session!.provider)}>{t("cn.again")}</button></div>
    {/if}
  </section>
{/if}

<section class="section">
  <h2>{t("cn.other")}</h2>
  <ul class="list">
    <li class="item">
      <span class="grow">{t("cn.vertexUse")}</span>
      <label class="key" aria-disabled={!store.can("POST", "/oauth/import") || gone.includes("vertex")}
        ><svg class="i" aria-hidden="true"><use href="#i-upload" /></svg>{t("cn.import")}<input
          class="file"
          type="file"
          accept=".json,application/json"
          disabled={store.busy || !store.can("POST", "/oauth/import") || gone.includes("vertex")}
          onchange={(e) => vertex(e.currentTarget)}
        /></label
      >
    </li>
    <li class="item">
      <span class="grow">{t("cn.useKey")}</span>
      <a class="key" href="#providers">{t("cn.providers")}</a>
    </li>
  </ul>
</section>
