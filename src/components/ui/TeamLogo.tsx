import { useState } from 'react';

const TEAM_COLORS: Record<string, string> = {
  GS: '#FDB913', FB: '#003DA5', BJK: '#111827', TS: '#8B0000',
  BAS: '#D85F1E', ADS: '#1B4F8B', SIV: '#0066B3', KYS: '#d97706',
  ANT: '#C8102E', KON: '#005C2E', RMA: '#FEBE10', BAR: '#A50044',
  LIV: '#C8102E', MCI: '#6CABDD', BAY: '#DC052D', BVB: '#FDE100',
  JUV: '#111827', MIL: '#FB090B', ARS: '#EF0107', CHE: '#034694',
  TOT: '#132257', MUN: '#DA291C', ATM: '#CB3524', SEV: '#CB3524',
};

type Props = { shortName: string; logoUrl?: string; size?: number };

function InitialsBadge({ shortName, size }: { shortName: string; size: number }) {
  const bg = TEAM_COLORS[shortName] ?? '#6b7280';
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: bg, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.35), fontWeight: 500,
        letterSpacing: '-0.02em',
      }}
    >
      {shortName.slice(0, 2)}
    </div>
  );
}

export function TeamLogo({ shortName, logoUrl, size = 40 }: Props) {
  const [failed, setFailed] = useState(false);

  if (!logoUrl || failed) {
    return <InitialsBadge shortName={shortName} size={size} />;
  }

  return (
    <img
      src={logoUrl}
      alt={shortName}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{
        width: size, height: size, flexShrink: 0,
        objectFit: 'contain', borderRadius: '50%',
      }}
    />
  );
}
