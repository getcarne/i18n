// Catalog loading: scans a locales dir for `<locale>.po`/`<locale>.mo`
// files, parses each once via std/gettext into a JS lookup table, and
// opens one compiled handle per locale for plural math. When both
// exist for one locale the .mo wins (compiled prod artifact). Fuzzy
// entries and entries with only empty translations are skipped, so
// they fall through the fallback chain exactly like the bridge's own
// translate does. Tables make t()/has() zero-crossing lookups; the
// handle answers plural indexes (one int call) so the package never
// re-implements the Plural-Forms grammar.

var os = require("std/os");
var gettext = require("std/gettext");

var errors = require("./errors.js");

/**
 * Joins a dir and a file name with exactly one slash.
 * @param {string} dir the directory
 * @param {string} name the file name
 * @returns {string} the joined path
 */
function joinPath(dir, name) {
  if (dir.slice(-1) === "/") return dir + name;
  return dir + "/" + name;
}

/**
 * Scans the locales dir, grouping .po/.mo files by locale
 * (the file basename). Anything else is ignored.
 * @param {string} dir the locales directory
 * @returns {object} `{locale: {po?: path, mo?: path}}`
 */
function listLocaleFiles(dir) {
  var names;
  try {
    names = os.readDir(dir);
  } catch (e) {
    throw errors.I18nError("cannot read locales dir \"" + dir + "\": " +
      e.message);
  }
  var files = {};
  for (var i = 0; i < names.length; i++) {
    var name = names[i].name;
    var locale = null;
    if (name.slice(-3) === ".po") locale = name.slice(0, -3);
    else if (name.slice(-3) === ".mo") locale = name.slice(0, -3);
    if (locale === null || locale === "") continue;
    if (!Object.prototype.hasOwnProperty.call(files, locale)) {
      files[locale] = {};
    }
    files[locale][name.slice(-2)] = joinPath(dir, name);
  }
  return files;
}

/**
 * Compiles one parsed catalog ({headers, entries} from
 * gettext.parse/parseMoFile) into a lookup table keyed by msgid (or
 * `msgctxt\x04msgid` for contextual entries).
 * @param {object} parsed the parsed catalog
 * @returns {object} the table: key to non-empty-checked forms array
 */
function compileTable(parsed) {
  var table = {};
  var entries = parsed.entries || [];
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    if (e.fuzzy === true) continue;
    if (typeof e.msgid !== "string" || e.msgid === "") continue;
    var forms = Array.isArray(e.msgstr) ? e.msgstr : [];
    var usable = false;
    for (var f = 0; f < forms.length; f++) {
      if (forms[f] !== "") {
        usable = true;
        break;
      }
    }
    if (!usable) continue;
    var key = e.msgid;
    if (typeof e.msgctxt === "string" && e.msgctxt !== "") {
      key = e.msgctxt + "\x04" + e.msgid;
    }
    table[key] = forms;
  }
  return table;
}

/**
 * Loads one locale: parses the file into a lookup table and opens a
 * compiled handle for plural indexes. Throws I18nError on any
 * failure, naming the locale.
 * @param {string} locale the locale
 * @param {{po?: string, mo?: string}} paths the candidate paths
 * @returns {{table: object, handle: number}} the table and the
 *   bridge handle
 */
function loadOne(locale, paths) {
  var path = paths.mo !== undefined ? paths.mo : paths.po;
  var fail = function (e) {
    throw errors.I18nError("locale \"" + locale + "\": " + e.message);
  };
  var text = null;
  if (paths.mo === undefined) {
    try {
      text = os.readFile(path);
    } catch (e) {
      fail(e);
    }
  }
  var table;
  try {
    table = paths.mo !== undefined ?
      compileTable(gettext.parseMoFile(path)) :
      compileTable(gettext.parse(text));
  } catch (e) {
    fail(e);
  }
  var handle;
  try {
    handle = paths.mo !== undefined ?
      gettext.openCatalogMo(path) :
      gettext.openCatalog(text);
  } catch (e) {
    fail(e);
  }
  return {table: table, handle: handle};
}

/**
 * Loads every locale in the dir: one table plus one handle each.
 * @param {string} dir the locales directory
 * @returns {object} `{locale: {table, handle}}`
 */
function loadLocales(dir) {
  var files = listLocaleFiles(dir);
  var out = {};
  for (var locale in files) {
    if (Object.prototype.hasOwnProperty.call(files, locale)) {
      out[locale] = loadOne(locale, files[locale]);
    }
  }
  return out;
}

/**
 * Closes every handle in a loaded set. Idempotent; safe to call
 * twice or after partial loads.
 * @param {object} locales the loaded `{locale: {table, handle}}`
 * @returns {undefined}
 */
function closeLocales(locales) {
  for (var locale in locales) {
    if (Object.prototype.hasOwnProperty.call(locales, locale)) {
      try {
        gettext.closeCatalog(locales[locale].handle);
      } catch (e) {}
    }
  }
}

module.exports = {loadLocales: loadLocales, closeLocales: closeLocales};
