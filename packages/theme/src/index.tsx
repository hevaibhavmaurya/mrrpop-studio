import { createContext, useContext, useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';
import type { Theme } from './types';

export type * from './types';

// Themes are discovered from packages/theme/themes/<id>/ — drop in a folder, it shows up.
const themeJson = import.meta.glob<Theme>('../themes/*/theme.json', { eager: true, import: 'default' });
const logoRaw = import.meta.glob<string>('../themes/*/*.svg', { eager: true, query: '?raw', import: 'default' });
const fontUrls = import.meta.glob<string>('../themes/*/fonts/*.{ttf,otf,woff,woff2}', { eager: true, query: '?url', import: 'default' });

const idFromPath = (p: string) => p.split('/')[2];

export interface LoadedTheme extends Theme {
  logoSvg: string;
  logoMarkSvg: string;
  fontUrl: (rel: string) => string;
}

export const themes: Record<string, LoadedTheme> = Object.fromEntries(
  Object.entries(themeJson).map(([path, t]) => {
    const id = idFromPath(path);
    const base = `../themes/${id}/`;
    return [
      id,
      {
        ...t,
        id,
        logoSvg: logoRaw[base + (t.logo?.wordmark ?? 'logo.svg')] ?? '',
        logoMarkSvg: logoRaw[base + (t.logo?.mark ?? 'logo-mark.svg')] ?? '',
        fontUrl: (rel: string) => fontUrls[base + rel] ?? '',
      } satisfies LoadedTheme,
    ];
  }),
);

export const themeIds = Object.keys(themes);

/** Resolve a token path ('accent.violet'), role ('role.primary') or literal colour to a value. */
export function resolveColor(t: Theme, ref: string): string {
  if (!ref || ref.startsWith('#') || ref.startsWith('rgb') || ref.startsWith('var(')) return ref;
  if (ref.startsWith('role.')) return resolveColor(t, t.roles?.[ref.slice(5)] ?? '');
  return flatColors(t)[ref] ?? ref;
}

/** Flatten colours to { 'accent.violet': '#7467E8', … } */
export function flatColors(t: Theme): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [group, entries] of Object.entries(t.colors)) {
    for (const [name, tok] of Object.entries(entries)) out[`${group}.${name}`] = tok.value;
  }
  return out;
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
/** 'accent.violet' → 'var(--mp-accent-violet)' */
export const cssVar = (token: string) => `var(--mp-${token.split('.').map(kebab).join('-')})`;
export const cssVarName = (token: string) => `--mp-${token.split('.').map(kebab).join('-')}`;

export function themeCssVars(t: Theme): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(flatColors(t))) vars[cssVarName(k)] = v;
  for (const [k, ref] of Object.entries(t.roles ?? {})) vars[`--mp-role-${kebab(k)}`] = resolveColor(t, ref);
  vars['--mp-font-sans'] = t.fonts.sans.stack;
  vars['--mp-font-accent'] = t.fonts.accent.stack;
  for (const [k, v] of Object.entries(t.radius)) vars[`--mp-radius-${kebab(k)}`] = `${v}px`;
  for (const [k, v] of Object.entries(t.shadow)) vars[`--mp-shadow-${kebab(k)}`] = v;
  for (const [k, v] of Object.entries(t.motion.easing)) vars[`--mp-ease-${kebab(k)}`] = v;
  const d = t.texture.dotGrid;
  vars['--mp-dot-grid'] = `radial-gradient(${d.color} ${d.dot}px, transparent ${d.dot}px) 0 0 / ${d.gap}px ${d.gap}px`;
  return vars;
}

function fontFaceCss(t: LoadedTheme): string {
  return [t.fonts.sans, t.fonts.accent]
    .flatMap((f) =>
      f.files.map(
        (file) =>
          `@font-face{font-family:"${f.family}";src:url("${t.fontUrl(file.src)}");font-weight:${file.weight};font-style:${file.style};font-display:block}`,
      ),
    )
    .join('\n');
}

const ThemeCtx = createContext<LoadedTheme | null>(null);

export function useTheme(): LoadedTheme {
  const t = useContext(ThemeCtx);
  if (!t) throw new Error('useTheme() must be used inside <ThemeProvider>');
  return t;
}

/** Resolve a token like 'accent.violet' to its hex value (for canvas / SVG attributes). */
export function useToken(token: string): string {
  return resolveColor(useTheme(), token);
}

export function ThemeProvider({
  themeId,
  children,
  style,
  className,
}: {
  themeId: string;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  const theme = themes[themeId] ?? themes[themeIds[0]];
  if (!theme) throw new Error(`No themes found in packages/theme/themes/`);

  // @font-face must live in the document, not inline styles.
  useEffect(() => {
    const id = `mp-fonts-${theme.id}`;
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = fontFaceCss(theme);
    document.head.appendChild(el);
  }, [theme]);

  const vars = useMemo(() => themeCssVars(theme), [theme]);

  return (
    <ThemeCtx.Provider value={theme}>
      <div
        className={className}
        data-theme={theme.id}
        style={{
          ...(vars as CSSProperties),
          fontFamily: 'var(--mp-font-sans)',
          fontFeatureSettings: theme.fonts.sans.features,
          color: 'var(--mp-role-ink)',
          ...style,
        }}
      >
        {children}
      </div>
    </ThemeCtx.Provider>
  );
}
export * from './icons';
