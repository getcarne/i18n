// i18n basic example. Run: carne run examples/basic.js
var i18n = require("../index.js");

var t = i18n.createI18n({locale: "fr", fallback: "en",
  localesDir: "tests/fixtures/locales"});

console.log(t.availableLocales());
console.log(t.t("Hello"));
console.log(t.t("Hello {name}", {name: "Ada"}));
console.log(t.n("apple", "apples", 1));
console.log(t.n("apple", "apples", 5));
console.log(t.t("nav.home"));
console.log(t.t("Open", {}, "menu"));
console.log(t.t("Welcome"));
console.log(t.has("Todo"));

t.setLocale("ru");
console.log(t.t("Hello"));
console.log(t.n("file", "files", 1));
console.log(t.n("file", "files", 3));
console.log(t.n("file", "files", 11));
