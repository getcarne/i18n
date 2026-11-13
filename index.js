// i18n: opinionated translations for Carne on top of std/gettext.
//
//   const { createI18n } = require("pkg/i18n");
//   const i18n = createI18n({locale: "fr", fallback: "en",
//     localesDir: "locales"});
//   i18n.t("Hello");                       // "Bonjour"
//   i18n.t("Hello {name}", {name: "Ada"}); // "Bonjour Ada"
//   i18n.n("apple", "apples", 5);          // "pommes"
//
// Catalogs live in `localesDir` as `<locale>.po`/`<locale>.mo`
// (`.mo` wins when both exist). At creation each file parses once
// into a lookup table and opens one compiled handle for plural
// math; t()/has() then run zero-crossing, n() pays one int call.
// Keys are gettext msgids either way: natural strings
// (`t("Hello")`) or nested keys (`t("nav.home")`); the `keys`
// preference only governs how totally missing keys render. Lookups
// run locale -> fallback -> onMissing hook -> key rendering, and
// empty/fuzzy translations always fall through like the bridge's
// own translate does.

var errors = require("./lib/errors.js");
var catalog = require("./lib/catalog.js");
var translate = require("./lib/translate.js");

/**
 * Checks a non-empty string option.
 * @param {*} value the supplied value
 * @param {string} name the option name, for error messages
 * @param {string} dflt the default when omitted
 * @returns {string} the value, or the default
 */
function checkName(value, name, dflt) {
  if (value === undefined) return dflt;
  if (typeof value !== "string" || value === "") {
    throw errors.I18nError(name + " must be a non-empty string");
  }
  return value;
}

/**
 * Creates an i18n instance bound to one locales dir. All catalogs
 * parse once here and each locale opens one compiled handle;
 * t/has are pure table lookups afterwards, n adds one
 * plural-index call per locale tried.
 * @param {object} [opts] `{locale?, fallback?, localesDir?, keys?,
 *   onMissing?}`: active locale (default `"en"`), fallback locale
 *   (default `"en"`), catalog dir (default `"locales"`), key
 *   convention `"msgid"` | `"nested"` (default `"msgid"`, governs
 *   missing-key rendering only), and `onMissing(key, locale)` whose
 *   string return wins over the default rendering
 * @returns {object} the instance: `{locale, t, n, has, setLocale,
 *   availableLocales, close}`
 */
function createI18n(opts) {
  if (opts === undefined) opts = {};
  if (opts === null || typeof opts !== "object" || Array.isArray(opts)) {
    throw errors.I18nError("options must be an object");
  }
  var locale = checkName(opts.locale, "locale", "en");
  var fallback = checkName(opts.fallback, "fallback", "en");
  var localesDir = checkName(opts.localesDir, "localesDir", "locales");
  var keys = opts.keys === undefined ? "msgid" : opts.keys;
  if (keys !== "msgid" && keys !== "nested") {
    throw errors.I18nError("keys must be \"msgid\" or \"nested\"");
  }
  if (opts.onMissing !== undefined && typeof opts.onMissing !== "function") {
    throw errors.I18nError("onMissing must be a function");
  }
  var locales = catalog.loadLocales(localesDir);
  var available = Object.keys(locales).sort();
  if (locales[locale] === undefined && locales[fallback] === undefined) {
    throw errors.I18nError("no catalog for locale \"" + locale +
      "\" nor fallback \"" + fallback + "\" in " + localesDir +
      (available.length > 0 ? " (available: " + available.join(", ") + ")" :
        " (no catalogs found)"));
  }
  var state = {
    locale: locale,
    fallback: fallback,
    keys: keys,
    onMissing: opts.onMissing,
    locales: locales,
    closed: false
  };
  var api = {
    locale: locale,
    /**
     * Translates a key (form 0) down the locale -> fallback chain.
     * @param {string} msgid the key
     * @param {object} [vars] `{name: value}` placeholders
     * @param {string} [context] the msgctxt for disambiguation
     * @returns {string} the translation, or the missing-key rendering
     */
    t: function (msgid, vars, context) {
      return translate.t(state, msgid, vars, context);
    },
    /**
     * Translates a plural, selecting the form by each locale's own
     * plural rule. `{count}` is always available for interpolation.
     * @param {string} singular the singular form (and lookup key)
     * @param {string} plural the plural form
     * @param {number} count the amount selecting the form
     * @param {object} [vars] `{name: value}` placeholders
     * @param {string} [context] the msgctxt for disambiguation
     * @returns {string} the translation, or the missing-key rendering
     */
    n: function (singular, plural, count, vars, context) {
      return translate.n(state, singular, plural, count, vars, context);
    },
    /**
     * Whether a key resolves to a real translation (locale, then
     * fallback). Contextual entries need their context via t();
     * has() only probes the plain key.
     * @param {string} key the key
     * @param {string} [locale] the locale to check (default current)
     * @returns {boolean} true when t() would translate it
     */
    has: function (key, locale) {
      return translate.has(state, key, locale);
    },
    /**
     * Switches the active locale. Unknown locales throw (fail fast)
     * instead of silently rendering fallback text.
     * @param {string} next the new locale
     * @returns {string} the new locale
     */
    setLocale: function (next) {
      if (typeof next !== "string" || state.locales[next] === undefined) {
        throw errors.I18nError("unknown locale \"" + next +
          "\", available: " + available.join(", "));
      }
      state.locale = next;
      api.locale = next;
      return next;
    },
    /**
     * Lists the loaded locales, sorted.
     * @returns {string[]} the locale names
     */
    availableLocales: function () {
      return available.slice();
    },
    /**
     * Closes the compiled handles. Idempotent; the instance still
     * answers from its tables for t()/has(), but n() throws once
     * the handles are gone. Runtime teardown closes them anyway.
     * @returns {undefined}
     */
    close: function () {
      if (!state.closed) {
        state.closed = true;
        catalog.closeLocales(state.locales);
      }
    }
  };
  return api;
}

module.exports = {createI18n: createI18n, I18nError: errors.I18nError};
