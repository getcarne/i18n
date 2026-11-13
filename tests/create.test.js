// Factory: options, locales dir scanning, setLocale, validation.
const { test, expect } = require("std/test");
const i18n = require("../index.js");

const FIX = "tests/fixtures/locales";

test("create: defaults and available locales", () => {
  var t = i18n.createI18n({localesDir: FIX});
  expect(t.locale).toBe("en");
  expect(t.availableLocales()).toEqual(["en", "es", "fr", "ru"]);
  expect(t.t("Hello")).toBe("Hello");
});

test("create: accepts locale, fallback and keys prefs", () => {
  var t = i18n.createI18n({locale: "fr", fallback: "en", localesDir: FIX});
  expect(t.locale).toBe("fr");
  expect(t.t("Hello")).toBe("Bonjour");
  var nested = i18n.createI18n({locale: "fr", localesDir: FIX, keys: "nested"});
  expect(nested.t("nav.home")).toBe("Accueil");
});

test("create: unknown locale with known fallback still loads", () => {
  var t = i18n.createI18n({locale: "xx", fallback: "en", localesDir: FIX});
  expect(t.t("Hello")).toBe("Hello");
});

test("create: throws when neither locale nor fallback has a catalog", () => {
  expect(function () {
    i18n.createI18n({locale: "xx", fallback: "yy", localesDir: FIX});
  }).toThrow(/no catalog/);
});

test("create: throws on unreadable locales dir", () => {
  expect(function () {
    i18n.createI18n({localesDir: "tests/fixtures/nope"});
  }).toThrow(/cannot read locales dir/);
});

test("create: validates options", () => {
  expect(function () { i18n.createI18n("fr"); }).toThrow(/options must be/);
  expect(function () {
    i18n.createI18n({localesDir: FIX, keys: "both"});
  }).toThrow(/keys must be/);
  expect(function () {
    i18n.createI18n({localesDir: FIX, onMissing: "x"});
  }).toThrow(/onMissing must be/);
  expect(function () {
    i18n.createI18n({localesDir: FIX, locale: ""});
  }).toThrow(/locale must be/);
});

test("create: setLocale switches and rejects unknown", () => {
  var t = i18n.createI18n({locale: "en", localesDir: FIX});
  expect(t.setLocale("fr")).toBe("fr");
  expect(t.locale).toBe("fr");
  expect(t.t("Hello")).toBe("Bonjour");
  expect(function () { t.setLocale("xx"); }).toThrow(/unknown locale/);
  expect(t.locale).toBe("fr");
});

test("create: exposes I18nError", () => {
  var err = i18n.I18nError("boom");
  expect(err.name).toBe("I18nError");
  expect(err.message).toContain("boom");
});

test("create: close releases handles and is idempotent", () => {
  var t = i18n.createI18n({locale: "fr", localesDir: FIX});
  expect(t.t("Hello")).toBe("Bonjour");
  t.close();
  t.close();
  expect(t.t("Hello")).toBe("Bonjour");
  expect(t.has("Hello")).toBe(true);
  expect(function () { t.n("apple", "apples", 2); })
    .toThrow(/unknown or closed catalog/);
});
