// Translation: t/n/has over per-locale tables with a
// locale -> fallback chain, {name} interpolation, and opinionated
// missing-key rendering. t()/has() never cross the bridge (pure table
// lookups); n() asks the catalog handle for the plural index (one int
// call) and looks the form up the same way. Empty translations never
// match, so gaps always fall through the chain down to the key.

var gettext = require("std/gettext");

var errors = require("./errors.js");

/**
 * Checks the vars argument shared by t/n.
 * @param {*} vars the caller-supplied vars
 * @param {string} method the method name, for error messages
 * @returns {object} the vars, or `{}` when omitted
 */
function checkVars(vars, method) {
  if (vars === undefined || vars === null) return {};
  if (typeof vars !== "object" || Array.isArray(vars)) {
    throw errors.I18nError(method + ": vars must be an object");
  }
  return vars;
}

/**
 * Checks the context argument shared by t/n.
 * @param {*} context the caller-supplied context
 * @param {string} method the method name, for error messages
 * @returns {string|undefined} the context, or undefined when omitted
 */
function checkContext(context, method) {
  if (context === undefined || context === null || context === "") {
    return undefined;
  }
  if (typeof context !== "string") {
    throw errors.I18nError(method + ": context must be a string");
  }
  return context;
}

/**
 * Renders `{name}` placeholders from vars. Unknown names stay
 * intact, `{{`/`}}` escape to literal braces, other text passes
 * through untouched.
 * @param {string} text the translated string
 * @param {object} vars the placeholder values (stringified)
 * @returns {string} the rendered string
 */
function interpolate(text, vars) {
  var out = "";
  var i = 0;
  while (i < text.length) {
    var c = text[i];
    if (c === "{" && text[i + 1] === "{") {
      out += "{";
      i += 2;
      continue;
    }
    if (c === "}" && text[i + 1] === "}") {
      out += "}";
      i += 2;
      continue;
    }
    if (c === "{") {
      var end = text.indexOf("}", i + 1);
      if (end > i + 1) {
        var name = text.slice(i + 1, end);
        if (/^[A-Za-z0-9_]+$/.test(name) &&
            Object.prototype.hasOwnProperty.call(vars, name)) {
          out += String(vars[name]);
          i = end + 1;
          continue;
        }
      }
      out += c;
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/**
 * Renders a totally missing key per the `keys` preference: the whole
 * key for msgid-style catalogs, the last dot segment for nested-key
 * apps.
 * @param {string} key the missing key
 * @param {string} keys the `keys` preference
 * @returns {string} the display string
 */
function renderMissing(key, keys) {
  if (keys === "nested") {
    var dot = key.lastIndexOf(".");
    if (dot >= 0 && dot < key.length - 1) return key.slice(dot + 1);
  }
  return key;
}

/**
 * Handles a total miss (key in neither locale nor fallback): the
 * onMissing hook wins when it returns a string, otherwise the
 * preference-based rendering. Either way vars still interpolate.
 * @param {object} state the i18n state
 * @param {string} key the missing key (singular form for n)
 * @param {object} vars the placeholder values
 * @returns {string} the fallback string
 */
function miss(state, key, vars) {
  if (typeof state.onMissing === "function") {
    var replacement = state.onMissing(key, state.locale);
    if (typeof replacement === "string") {
      return interpolate(replacement, vars);
    }
  }
  return interpolate(renderMissing(key, state.keys), vars);
}

/**
 * Finds one form in a lookup table: the entry must exist and the
 * selected form must be a non-empty string.
 * @param {object} table the locale's lookup table
 * @param {string} msgid the key
 * @param {string|undefined} context the msgctxt, if any
 * @param {number} idx the form index
 * @returns {string|undefined} the form, or nothing on a miss
 */
function findForm(table, msgid, context, idx) {
  var key = context !== undefined ? context + "\x04" + msgid : msgid;
  if (!Object.prototype.hasOwnProperty.call(table, key)) {
    return undefined;
  }
  var form = table[key][idx];
  return (typeof form === "string" && form !== "") ? form : undefined;
}

/**
 * The locale -> fallback chain for one lookup, deduplicated.
 * @param {object} state the i18n state
 * @returns {string[]} the locales to try in order
 */
function chain(state) {
  if (state.fallback === state.locale) return [state.locale];
  return [state.locale, state.fallback];
}

/**
 * Asks the catalog handle for the plural form index of a count. The
 * rule (grammar, C division semantics, clamping, header inference)
 * lives in openparser; the package never re-implements it.
 * @param {number} handle the bridge catalog handle
 * @param {number} amount the truncated count
 * @param {string} locale the locale, for error messages
 * @returns {number} the form index
 */
function formIndex(handle, amount, locale) {
  try {
    return gettext.pluralIndexCatalog(handle, amount);
  } catch (e) {
    throw errors.I18nError("locale \"" + locale + "\": " + e.message);
  }
}

/**
 * Translates a key: first non-empty form 0 down the chain, else the
 * missing-key path.
 * @param {object} state the i18n state
 * @param {string} msgid the key
 * @param {object} [vars] the placeholder values
 * @param {string} [context] the msgctxt for disambiguation
 * @returns {string} the translation
 */
function t(state, msgid, vars, context) {
  if (typeof msgid !== "string" || msgid === "") {
    throw errors.I18nError("t: key must be a non-empty string");
  }
  var values = checkVars(vars, "t");
  var ctxt = checkContext(context, "t");
  var locales = chain(state);
  for (var i = 0; i < locales.length; i++) {
    var entry = state.locales[locales[i]];
    if (entry === undefined) continue;
    var found = findForm(entry.table, msgid, ctxt, 0);
    if (found !== undefined) return interpolate(found, values);
  }
  return miss(state, msgid, values);
}

/**
 * Translates a plural: selects the form by the locale's plural rule
 * down the chain, else `count === 1 ? singular : plural` through the
 * missing-key path. `{count}` is always available; an explicit
 * `vars.count` never overrides the count argument.
 * @param {object} state the i18n state
 * @param {string} singular the singular form (and lookup key)
 * @param {string} plural the plural form
 * @param {number} count the amount selecting the form
 * @param {object} [vars] the placeholder values
 * @param {string} [context] the msgctxt for disambiguation
 * @returns {string} the translation
 */
function n(state, singular, plural, count, vars, context) {
  if (typeof singular !== "string" || singular === "") {
    throw errors.I18nError("n: singular must be a non-empty string");
  }
  if (typeof plural !== "string" || plural === "") {
    throw errors.I18nError("n: plural must be a non-empty string");
  }
  if (typeof count !== "number" || !isFinite(count)) {
    throw errors.I18nError("n: count must be a finite number");
  }
  var values = checkVars(vars, "n");
  var ctxt = checkContext(context, "n");
  var amount = Math.trunc(count);
  var merged = {};
  for (var k in values) {
    if (Object.prototype.hasOwnProperty.call(values, k)) {
      merged[k] = values[k];
    }
  }
  merged.count = amount;
  // Negative counts are nonsense input: miss rather than letting a
  // clamped rule index invent a translation.
  if (amount < 0) {
    return miss(state, amount === 1 ? singular : plural, merged);
  }
  var locales = chain(state);
  for (var i = 0; i < locales.length; i++) {
    var entry = state.locales[locales[i]];
    if (entry === undefined) continue;
    var idx = formIndex(entry.handle, amount, locales[i]);
    var found = findForm(entry.table, singular, ctxt, idx);
    if (found !== undefined) return interpolate(found, merged);
  }
  return miss(state, amount === 1 ? singular : plural, merged);
}

/**
 * Whether a key resolves to a real translation down the chain
 * (locale, then fallback) for the given locale.
 * @param {object} state the i18n state
 * @param {string} key the key
 * @param {string} [locale] the locale to check (default current)
 * @returns {boolean} true when t() would translate it
 */
function has(state, key, locale) {
  if (typeof key !== "string" || key === "") {
    throw errors.I18nError("has: key must be a non-empty string");
  }
  var loc = locale === undefined ? state.locale : locale;
  if (typeof loc !== "string" || state.locales[loc] === undefined) {
    throw errors.I18nError("has: unknown locale \"" + loc + "\", available: " +
      Object.keys(state.locales).sort().join(", "));
  }
  var locales = loc === state.fallback ? [loc] : [loc, state.fallback];
  for (var i = 0; i < locales.length; i++) {
    var entry = state.locales[locales[i]];
    if (entry === undefined) continue;
    if (findForm(entry.table, key, undefined, 0) !== undefined) return true;
  }
  return false;
}

module.exports = {t: t, n: n, has: has};
