import React from 'react';

/**
 * RobustnessIndex — Visual display of Monte Carlo stability rates as a robustness gauge.
 * Props:
 *   rankings: array of { name, rank, score }
 *   stabilityRates: { [altName]: number (0-100) }
 */
const RobustnessIndex = ({ rankings, stabilityRates }) => {
  if (!rankings || rankings.length === 0) return null;

  const topAlt = rankings[0];
  const topRate = stabilityRates[topAlt?.name];

  if (topRate === undefined) return null;

  // Determine robustness level
  let level, color, bgColor, icon, description;
  if (topRate >= 70) {
    level = 'Sangat Stabil';
    color = '#276749';
    bgColor = '#c6f6d5';
    icon = '🛡️';
    description = 'Peringkat 1 sangat konsisten meskipun bobot diubah secara acak.';
  } else if (topRate >= 45) {
    level = 'Cukup Stabil';
    color = '#744210';
    bgColor = '#fefcbf';
    icon = '⚠️';
    description = 'Peringkat 1 relatif stabil, namun bisa berubah jika bobot dimodifikasi signifikan.';
  } else if (topRate >= 25) {
    level = 'Kurang Stabil';
    color = '#7b341e';
    bgColor = '#fed7aa';
    icon = '🔶';
    description = 'Peringkat 1 rentan berubah. Pertimbangkan untuk menyesuaikan bobot kriteria.';
  } else {
    level = 'Tidak Stabil';
    color = '#742a2a';
    bgColor = '#fed7d7';
    icon = '🚨';
    description = 'Peringkat sangat tidak stabil. Hasil keputusan sangat sensitif terhadap perubahan bobot.';
  }

  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${color}30`,
      borderRadius: 'var(--radius-md)',
      padding: '16px 20px',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: '800', color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {icon} Indeks Robustness Keputusan
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color, marginTop: '4px' }}>
            {level}
          </div>
          <div style={{ fontSize: '12px', color, marginTop: '4px', fontWeight: '500', maxWidth: '280px' }}>
            {description}
          </div>
        </div>
        {/* Gauge circle */}
        <div style={{ position: 'relative', width: '72px', height: '72px', flexShrink: 0 }}>
          <svg viewBox="0 0 72 72" style={{ width: '72px', height: '72px', transform: 'rotate(-90deg)' }}>
            <circle cx="36" cy="36" r="28" fill="none" stroke={`${color}20`} strokeWidth="8" />
            <circle
              cx="36" cy="36" r="28"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeDasharray={`${(topRate / 100) * 175.9} 175.9`}
              strokeLinecap="round"
            />
          </svg>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '14px', fontWeight: '800', color
          }}>
            {topRate.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* All alternatives stability bar */}
      <div style={{ borderTop: `1px solid ${color}20`, paddingTop: '10px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color, marginBottom: '6px' }}>
          Distribusi Stabilitas Semua Alternatif (1.000 iterasi Monte Carlo):
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {rankings.map(r => {
            const rate = stabilityRates[r.name] ?? 0;
            return (
              <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', width: '16px', color }}>{r.rank}</span>
                <span style={{ fontSize: '11px', fontWeight: '600', width: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color }}>
                  {r.name}
                </span>
                <div style={{ flexGrow: 1, height: '10px', background: `${color}15`, borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${rate}%`,
                    background: color,
                    borderRadius: '5px',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
                <span style={{ fontSize: '10px', fontWeight: '800', width: '36px', textAlign: 'right', color }}>
                  {rate.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RobustnessIndex;
