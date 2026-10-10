import { detect, translator, type Key, type Lang, type Params, type Tr } from "./i18n.ts";

const STORE = "cliproxy-lang";
const saved = () => {
  try {
    return localStorage.getItem(STORE);
  } catch {
    return null;
  }
};
const books = { en: translator("en"), ko: translator("ko") };
let current = $state<Lang>(detect(navigator.languages, saved()));
document.documentElement.lang = current;

/** Reading this inside a template or $derived makes it follow the language. */
export const t: Tr = Object.defineProperty((key: Key, params?: Params) => books[current](key, params), "lang", {
  get: () => current,
}) as Tr;
export const lang = () => current;
export function setLang(next: Lang) {
  current = next;
  document.documentElement.lang = next;
  try {
    localStorage.setItem(STORE, next);
  } catch {}
}
