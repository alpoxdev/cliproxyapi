<script lang="ts">
  import { store, Res } from "../store.svelte";
  import { api, endpoint, ApiError } from "../api";
  import { readPath } from "../core";
  import Load from "../Load.svelte";
  import Rich from "../Rich.svelte";
  import { t } from "../lang.svelte";

  const latest = new Res<string>(async () => String((await api("/server/latest-version"))["latest-version"] || ""));
  const c = $derived(store.config.data || {});
  const facts = $derived(
    [
      [t("sy.api"), new URL(endpoint()).pathname, true],
      [
        t("sy.server"),
        store.kind === "go"
          ? `CLIProxyAPI ${store.meta.version} (Go)`
          : store.kind === "rust"
            ? store.meta.version.replace("/", " ")
            : store.meta.version || t("sy.notReported"),
      ],
      [t("sy.commit"), store.meta.commit !== "none" && store.meta.commit, true],
      [t("sy.built"), !isNaN(Date.parse(store.meta.built)) && new Date(store.meta.built).toLocaleString(t.lang)],
      [t("sy.layout"), c["config-version"] ? `v${c["config-version"]}` : t("sy.legacy")],
      [t("sy.strategy"), readPath(c, "routing/strategy", t("sy.default"))],
      [t("sy.authDir"), readPath(c, "oauth/auth-dir", t("sy.default"))],
      // The config cannot show the effective policy: MANAGEMENT_PASSWORD allows remote access too.
      [t("sy.remote"), readPath(c, "management/allow-remote", false) ? t("sy.allowed") : t("sy.localOnly")],
      // Where this page's code comes from: it runs with the management key.
      [
        t("sy.dashboard"),
        store.kind === "rust"
          ? t("sy.builtIn")
          : readPath(c, "management/disable-auto-update-panel", false)
            ? t("sy.localFile")
            : t("sy.autoUpdate"),
      ],
    ].filter((f) => f[1]),
  );
  const clean = (v: string) => v.replace(/^cliproxy-rs[/-]/, "").replace(/^v/, "");
  const disabled = $derived(latest.error instanceof ApiError && latest.error.code === "update_check_disabled");
</script>

<div class="head"><h1>{t("sy.title")}</h1></div>

<section class="section">
  <dl class="facts">
    {#each facts as [k, v, mono]}<div><dt>{k}</dt><dd class:mono>{v}</dd></div>{/each}
  </dl>
  <p class="note">{t("sy.noProc")}</p>
</section>

<section class="section">
  <div class="section-head">
    <h2>{t("sy.updates")}</h2>
    <button class="key" disabled={latest.loading || disabled} onclick={() => latest.load()}>{t("sy.checkNew")}</button>
  </div>
  {#if disabled}
    <p class="note" role="status"><Rich text={t("sy.disabled")} /></p>
  {:else if latest.data !== undefined || latest.error || latest.loading}
    <Load res={latest} what={t("what.release")}>
      {#snippet children(v)}
        <p class="row">
          <span class="lamp {clean(v) === clean(store.meta.version) ? 'ok' : 'warn'}"></span>
          {t("sy.latest", { name: store.kind === "rust" ? "cliproxy-rs" : "CLIProxyAPI", v: v || t("sy.unknown"), upToDate: clean(v) === clean(store.meta.version) ? t("sy.upToDate") : "" })}
        </p>
      {/snippet}
    </Load>
  {:else}<p class="muted">{t("sy.nothing")}{store.kind === "rust" ? t("sy.rustNote") : t("sy.goNote")}</p>{/if}
</section>
