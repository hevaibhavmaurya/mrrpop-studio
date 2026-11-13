# @mrrpop/theme

A theme is a folder in `themes/<id>/`:

| File | What |
|---|---|
| `theme.json` | every token — colours, evidence labels, series, fonts, type scale, radius, shadow, motion, layout |
| `logo.svg`, `logo-mark.svg` | wordmark + square app mark (text uses the theme fonts when inlined) |
| `fonts/` | font files + licences referenced from `theme.json` |

To add a brand: copy `themes/mrrpop-v5` → edit → set `"theme"` in `studio.config.json`. Themes are discovered automatically.

```tsx
import { ThemeProvider, useTheme, cssVar } from '@mrrpop/theme';
<ThemeProvider themeId="mrrpop-v5"> … </ThemeProvider>
// in components: style={{ background: cssVar('scene.mint'), color: cssVar('base.ink') }}
```
`ThemeProvider` writes every colour as a CSS variable (`--mp-<group>-<name>`, e.g. `--mp-accent-violet`) plus
`--mp-font-sans`, `--mp-font-accent`, `--mp-radius-*`, `--mp-shadow-*`, and registers the `@font-face`s.
Components must never hard-code colours — read them through `cssVar()` / `useTheme()`.
