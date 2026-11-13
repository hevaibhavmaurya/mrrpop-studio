import { useEffect, useState } from 'react';
import { Icon, ThemeProvider, themeIds, themes } from '@mrrpop/theme';
import { packIds } from '@mrrpop/character';
import { studioConfig } from './config';
import { BrandPage } from './pages/Brand';
import { CharacterPage } from './pages/Character';
import { Placeholder } from './pages/Placeholder';
import { VoicesPage } from './pages/Voices';
import { StoriesPage } from './pages/Stories';
import { CanvasPage } from './pages/Canvas';

const PAGES = [
  { id: 'brand', label: 'Brand', icon: 'palette', ready: true },
  { id: 'character', label: 'Character', icon: 'face', ready: true },
  { id: 'components', label: 'Components', icon: 'blocks', ready: false },
  { id: 'canvas', label: 'Canvas', icon: 'play', ready: true },
  { id: 'carousels', label: 'Carousels', icon: 'slides', ready: false },
  { id: 'voices', label: 'Voices', icon: 'mic', ready: true },
  { id: 'stories', label: 'Stories', icon: 'book', ready: true },
  { id: 'skills', label: 'Skills', icon: 'sparkle', ready: false },
] as const;
type PageId = (typeof PAGES)[number]['id'];

const usePage = (): [PageId, (p: PageId) => void] => {
  const read = () => (location.hash.slice(2) || 'brand') as PageId;
  const [page, setPage] = useState<PageId>(read);
  useEffect(() => {
    const on = () => (setPage(read()), window.scrollTo(0, 0));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return [page, (p) => (location.hash = '/' + p)];
};

const stored = (k: string, fallback: string, valid: string[]) => {
  try {
    const v = localStorage.getItem(k);
    if (v && valid.includes(v)) return v;
  } catch {}
  return valid.includes(fallback) ? fallback : valid[0];
};
const save = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {}
};

export function App() {
  const [page, setPage] = usePage();
  const [themeId, setThemeId] = useState(() => stored('mp.theme', studioConfig.theme, themeIds));
  const [packId, setPackId] = useState(() => stored('mp.pack', studioConfig.character, packIds));

  const chooseTheme = (id: string) => (setThemeId(id), save('mp.theme', id));
  const choosePack = (id: string) => (setPackId(id), save('mp.pack', id));
  const theme = themes[themeId];

  return (
    <ThemeProvider themeId={themeId} className="app">
      <aside className="side">
        <div className="side-logo" dangerouslySetInnerHTML={{ __html: theme.logoSvg }} />
        <div className="side-sub">Studio</div>
        <nav>
          {PAGES.map((p) => (
            <button key={p.id} className={'nav' + (page === p.id ? ' on' : '')} onClick={() => setPage(p.id)}>
              <span className="nav-ic"><Icon name={p.icon} size={20} fill={page === p.id ? "var(--mp-role-highlight)" : "none"} /></span>
              {p.label}
              {!p.ready && <span className="soon">soon</span>}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <div>
            theme <b>{themeId}</b>
          </div>
          <div>
            character <b>{packId}</b>
          </div>
          <div>
            exports <b>{studioConfig.exportsDir}/</b>
          </div>
        </div>
      </aside>
      <main className="main">
        {page === 'brand' && <BrandPage themeId={themeId} onTheme={chooseTheme} />}
        {page === 'character' && <CharacterPage packId={packId} onPack={choosePack} />}
        {page === 'voices' && <VoicesPage packId={packId} />}
        {page === 'stories' && <StoriesPage />}
        {page === 'canvas' && <CanvasPage packId={packId} />}
        {!PAGES.find((p) => p.id === page)?.ready && <Placeholder name={PAGES.find((p) => p.id === page)?.label ?? page} />}
      </main>
    </ThemeProvider>
  );
}
