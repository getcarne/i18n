<p align="center">
  <img src="https://github.com/getcarne/carne/blob/main/.github/carne_logo.png" alt="Carne Logo" width="140px" height="140px"><br>
  <strong>i18n</strong>, opinionated translations for <a href="https://github.com/getcarne/carne">Carne</a><br>
  Msgid or nested keys, plurals, interpolation and fallback chains on top of <code>std/gettext</code>.
</p>

<p align="center">
  <a href="https://getcarne.github.io/i18n/">API reference</a><br>
  <img src="https://github.com/getcarne/i18n/workflows/test/badge.svg" alt="Github Actions">
</p>

## Features

- `locales/<locale>.po` parsed once at creation, `.mo` wins when both exist
- Natural msgids or nested keys (`"nav.home"`), one lookup either way
- Real plural rules from `Plural-Forms`, evaluated once per `n()` by the bridge
- `{name}` interpolation, `{{`/`}}` escapes, `{count}` auto-injected
- `locale -> fallback -> onMissing -> key` chain, fuzzy/empty always fall through
- Context (`msgctxt`) disambiguation for repeated words
- One error type (`I18nError`), fail fast on bad dirs and locales
- Pure JS on `std/gettext` + `std/os`, no other dependencies


## Usage

```js
const { createI18n } = require("pkg/i18n");
const i18n = createI18n({locale: "fr", fallback: "en",
  localesDir: "locales"});

i18n.t("Hello");                       // "Bonjour"
i18n.t("Hello {name}", {name: "Ada"}); // "Bonjour Ada"
i18n.n("apple", "apples", 5);          // "pommes"
i18n.t("nav.home");                    // "Accueil"
i18n.t("Open", {}, "menu");            // "Ouvrir" (msgctxt)
i18n.setLocale("ru");
```

## Catalogs

One file per locale in `localesDir`:

```
locales/en.po
locales/fr.po
locales/fr.mo   // optional: wins over fr.po when present
```

Standard gettext files. Build the `.mo` from source with the
bridge itself (a pure-carne msgfmt):

```js
const gettext = require("std/gettext");
gettext.writeMo(poText, "locales/fr.mo");
```

Only entries with a non-empty translation count: untranslated,
fuzzy and empty strings fall through the chain exactly like
`std/gettext`'s own `translate` does.

## Key styles

`keys: "msgid"` (default) uses source strings as keys and renders a
totally missing key whole. `keys: "nested"` is for key-based apps
and renders the last segment (`"nav.missing"` → `"missing"`).
Interpolation applies to the rendering either way.

## API

`createI18n(opts)` where `opts` is:

- `locale` (string, default `"en"`). Active locale; must have a
  catalog unless `fallback` does.
- `fallback` (string, default `"en"`). Second stop in the chain.
- `localesDir` (string, default `"locales"`). Scanned once at
  creation; unreadable dir throws.
- `keys` (`"msgid"` | `"nested"`, default `"msgid"`). Key
  convention, governs missing-key rendering only.
- `onMissing(key, locale)` (function). Called on a total miss;
  a string return wins over the default rendering.

The instance:

- `t(msgid[, vars[, context]])` — form 0 down the chain.
- `n(singular, plural, count[, vars[, context]])` — form by each
  locale's plural rule; `{count}` always available (the `count`
  argument wins over `vars.count`).
- `has(key[, locale])` — true when `t()` would translate it.
- `setLocale(locale)` — switches; unknown locales throw.
- `availableLocales()` — sorted list of loaded locales.
- `locale` — the current locale.
- `close()` — releases the compiled handles (idempotent).

## Tests

```bash
carne test tests/create.test.js
carne test tests/translate.test.js
carne test tests/interpolate.test.js
carne test tests/fallback.test.js
```

## License

MIT.
