// Interpolation: {name} placeholders, missing vars, escaping,
// {count} injection.
const { test, expect } = require("std/test");
const i18n = require("../index.js");

const FIX = "tests/fixtures/locales";

function fr() {
  return i18n.createI18n({locale: "fr", fallback: "en", localesDir: FIX});
}

test("interpolate: named placeholders render", () => {
  var t = fr();
  expect(t.t("Hello {name}", {name: "Ada"})).toBe("Bonjour Ada");
  expect(t.t("Hello {name}", {name: 42})).toBe("Bonjour 42");
});

test("interpolate: unknown vars stay intact", () => {
  var t = fr();
  expect(t.t("Hello {name}")).toBe("Bonjour {name}");
  // Key in neither catalog: miss renders the key, still interpolated.
  expect(t.t("Hello {name} {other}", {name: "Ada"}))
    .toBe("Hello Ada {other}");
});

test("interpolate: braces escape on missing keys", () => {
  var t = fr();
  expect(t.t("A {{x}} {y}", {y: 1})).toBe("A {x} 1");
  expect(t.t("A {{x}}")).toBe("A {x}");
});

test("interpolate: count auto-injects, arg wins over vars", () => {
  var t = i18n.createI18n({locale: "en", localesDir: FIX});
  expect(t.n("{count} file", "{count} files", 1)).toBe("1 file");
  expect(t.n("{count} file", "{count} files", 5)).toBe("5 files");
  expect(t.n("{count} file", "{count} files", 5, {count: 9}))
    .toBe("5 files");
});
