import { Character } from '@mrrpop/character';

export function Placeholder({ name }: { name: string }) {
  return (
    <div className="card dots" style={{ display: 'flex', alignItems: 'center', gap: 32, padding: 40, background: 'var(--mp-role-card-a)' }}>
      <Character pose="shrug" expression="thinking" crop="bust" width={200} />
      <div>
        <h1 style={{ fontSize: 44, fontWeight: 900, letterSpacing: -1.6 }}>
          {name} is <span className="it" style={{ color: 'var(--mp-role-primary)', fontSize: 52 }}>coming</span>
        </h1>
        <p style={{ marginTop: 10, color: 'var(--mp-role-muted)', maxWidth: 480 }}>
          Brand and Character come first (theme + character packs). This page lands in the next build step — see the roadmap in
          README.md.
        </p>
      </div>
    </div>
  );
}
