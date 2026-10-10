import { strict as assert } from "node:assert";
import { test } from "node:test";
import { detect, translator } from "./i18n.ts";
import { en } from "./locales/en.ts";
import { ko } from "./locales/ko.ts";
import { credState, span } from "./core.ts";

const slots = (m: string | readonly string[]) => [...new Set([m].flat().join(" ").match(/\{\w+\}/g) ?? [])].sort();

test("browser language picks the dictionary; a saved choice wins; unknown falls back to English", () => {
  assert.equal(detect(["ko-KR", "en-US"]), "ko");
  assert.equal(detect(["fr-FR", "ko"]), "ko");
  assert.equal(detect(["en-GB"]), "en");
  assert.equal(detect(["ja-JP"]), "en");
  assert.equal(detect([]), "en");
  assert.equal(detect(["ko"], "en"), "en");
  assert.equal(detect(["en"], "ko"), "ko");
  assert.equal(detect(["en"], "fr"), "en");
});

test("both dictionaries have the same keys and the same {placeholders}", () => {
  assert.deepEqual(Object.keys(ko).sort(), Object.keys(en).sort());
  for (const key of Object.keys(en) as (keyof typeof en)[])
    assert.deepEqual(slots(ko[key]), slots(en[key]), key);
});

test("placeholders fill in and English plurals follow the count", () => {
  const e = translator("en"),
    k = translator("ko");
  assert.equal(e("cred.modelsCooling", { n: 1 }), "1 model cooling");
  assert.equal(e("cred.modelsCooling", { n: 3 }), "3 models cooling");
  assert.equal(k("cred.modelsCooling", { n: 3 }), "모델 3개 쉬는 중");
  assert.equal(k("time.hm", { h: 2, m: 5 }), "2시간 5분");
  assert.equal(span(125 * 60_000, k), "2시간 5분");
  assert.equal(credState({ status: "active" }, 0, k).label, "사용 가능");
});
