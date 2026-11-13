// i18n errors: every failure surfaces as I18nError (bad options,
// unreadable locales dir, bad Plural-Forms, unknown locale, bad
// key/count args) so callers catch one type via err.name.

/**
 * Creates an i18n failure. A plain Error with name set (not a
 * subclass) so it survives any serialization a host might do.
 * @param {string} message what went wrong, without the prefix
 * @returns {Error} the error, named `"I18nError"`
 */
function I18nError(message) {
  var err = new Error("i18n: " + message);
  err.name = "I18nError";
  return err;
}

module.exports = {I18nError: I18nError};
