// Fallback: locale -> fallback chain, missing-key rendering,
// onMissing hook, .mo wins over .po.
const { test, expect } = require("std/test");
const i18n = require("../index.js");

const FIX = "tests/fixtures/locales";

test("fallback: gaps resolve through the fallback locale", () => {
  var t = i18n.createI18n({locale: "fr", fallback: "en", localesDir: FIX});
  expect(t.t("Welcome")).toBe("Welcome back");
  expect(t.has("Welcome")).toBe(true);
  expect(t.has("Hello")).toBe(true);
  expect(t.has("Nope")).toBe(false);
});

test("fallback: .mo wins over .po for the same locale", () => {
  var t = i18n.createI18n({locale: "es", fallback: "en", localesDir: FIX});
  expect(t.availableLocales()).toContain("es");
  expect(t.t("Hello")).toBe("Hola MO");
});

test("fallback: missing keys render per keys pref", () => {
  var msgid = i18n.createI18n({locale: "fr", fallback: "en", localesDir: FIX});
  var nested = i18n.createI18n({locale: "fr", fallback: "en",
    localesDir: FIX, keys: "nested"});
  expect(msgid.t("nav.missing")).toBe("nav.missing");
  expect(nested.t("nav.missing")).toBe("missing");
  expect(nested.t("plain")).toBe("plain");
  expect(msgid.t("Hi {name}", {name: "Al"})).toBe("Hi Al");
  expect(msgid.n("one thing", "many things", 3)).toBe("many things");
  expect(msgid.n("one thing", "many things", 1)).toBe("one thing");
});

test("fallback: onMissing hook wins, non-strings ignored", () => {
  var seen = [];
  var t = i18n.createI18n({locale: "fr", fallback: "en", localesDir: FIX,
    onMissing: function (key, locale) {
      seen.push([key, locale]);
      return "[" + key + "]";
    }});
  expect(t.t("Nope")).toBe("[Nope]");
  expect(seen).toEqual([["Nope", "fr"]]);
  var lax = i18n.createI18n({locale: "fr", fallback: "en", localesDir: FIX,
    onMissing: function () { return 42; }});
  expect(lax.t("Nope")).toBe("Nope");
});
