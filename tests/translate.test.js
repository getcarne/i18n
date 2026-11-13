// Translation: t/n lookups, context, plural rules (fr 2-form,
// ru 3-form), fuzzy and empty skipping.
const { test, expect } = require("std/test");
const i18n = require("../index.js");

const FIX = "tests/fixtures/locales";

function fr() {
  return i18n.createI18n({locale: "fr", fallback: "en", localesDir: FIX});
}

test("translate: basic lookup and nested keys", () => {
  var t = fr();
  expect(t.t("Hello")).toBe("Bonjour");
  expect(t.t("nav.home")).toBe("Accueil");
});

test("translate: context disambiguates", () => {
  var t = fr();
  expect(t.t("Open", {}, "menu")).toBe("Ouvrir");
  expect(t.t("Open")).toBe("Open");
});

test("translate: french plurals (n > 1)", () => {
  var t = fr();
  expect(t.n("apple", "apples", 0)).toBe("pomme");
  expect(t.n("apple", "apples", 1)).toBe("pomme");
  expect(t.n("apple", "apples", 2)).toBe("pommes");
  expect(t.n("apple", "apples", 5)).toBe("pommes");
});

test("translate: russian three-form plurals", () => {
  var t = i18n.createI18n({locale: "ru", fallback: "en", localesDir: FIX});
  expect(t.t("Hello")).toBe("Привет");
  expect(t.n("file", "files", 1)).toBe("файл");
  expect(t.n("file", "files", 2)).toBe("файла");
  expect(t.n("file", "files", 5)).toBe("файлов");
  expect(t.n("file", "files", 11)).toBe("файлов");
  expect(t.n("file", "files", 21)).toBe("файл");
  expect(t.n("file", "files", 22)).toBe("файла");
  expect(t.n("file", "files", 25)).toBe("файлов");
});

test("translate: fuzzy and empty translations fall through", () => {
  var t = fr();
  expect(t.t("Draft")).toBe("Draft");
  expect(t.t("Todo")).toBe("Todo");
});

test("translate: validates args", () => {
  var t = fr();
  expect(function () { t.t(""); }).toThrow(/non-empty string/);
  expect(function () { t.t("Hello", ["x"]); }).toThrow(/vars must be/);
  expect(function () { t.n("a", "b", "x"); }).toThrow(/count must be/);
  expect(function () { t.n("", "b", 1); }).toThrow(/singular must be/);
  expect(function () { t.has(""); }).toThrow(/non-empty string/);
  expect(function () { t.has("Hello", "xx"); }).toThrow(/unknown locale/);
});

test("translate: negative counts miss instead of translating", () => {
  var t = fr();
  expect(t.n("one thing", "many things", -1)).toBe("many things");
});
