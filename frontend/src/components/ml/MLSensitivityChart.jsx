import React, { useMemo } from 'react';

/**
 * MLSensitivityChart — Line chart showing rank changes + ML confidence bounds
 * as one criterion weight is swept from 5% to 95%.
 * Props:
 *   data: array from /sensitivity-with-ml endpoint
 *   variedCriterion: string name of the varied criterion
 */
const MLSensitivityChart = ({ data, variedCriterion }) => {
  if (!data || data.length === 0) return null;

  const WIDTH = 520;
  const HEIGHT = 220;
  const PAD = { top: 20, right: 20, bottom: 40, left: 40 };
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  // Group by alternative
  const alternatives = [...new Set(data.map(d => d.alternative))];
  const weights = [...new Set(data.map(d => d.varied_weight))].sort((a, b) => a - b);
  const maxRank = Math.max(...data.map(d => d.rank));

  const COLORS = ['#D37B55', '#5A67D8', '#7A9D54', '#A38E7A', '#E07070', '#68d391'];

  const xScale = (w) => PAD.left + ((w - weights[0]) / (weights[weights.length - 1] - weights[0])) * innerW;
  const yScale = (rank) => PAD.top + ((rank - 1) / Math.max(maxRank - 1, 1)) * innerH;

  const altData = useMemo(() => {
    return alternatives.map((alt, ai) => {
      const points = weights.map(w => {
        const row = data.find(d => d.alternative === alt && d.varied_weight === w);
        return row ? { w, rank: row.rank, conf: row.ml_confidence } : null;
      }).filter(Boolean);
      return { alt, points, color: COLORS[ai % COLORS.length] };
    });
  }, [data, alternatives, weights]);

  // Current weight (middle of sweep)
  const midWeight = weights[Math.floor(weights.length / 2)];

  return (
    <div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '500' }}>
        Grafik menunjukkan bagaimana peringkat berubah saat bobot <strong>"{variedCriterion}"</strong> diubah dari 5% hingga 95%.
        Garis putus-putus menunjukkan batas kepercayaan ML.
      </div>

      <div style={{ overflowX: 'auto' }}>
        <svg width={WIDTH} height={HEIGHT} style={{ fontFamily: 'var(--font-family)' }}>
          {/* Grid lines */}
          {Array.from({ length: maxRank }, (_, i) => i + 1).map(rank => (
            <line
              key={rank}
              x1={PAD.left} y1={yScale(rank)}
              x2={PAD.left + innerW} y2={yScale(rank)}
              stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4,4"
            />
          ))}

          {/* X axis */}
          <line x1={PAD.left} y1={PAD.top + innerH} x2={PAD.left + innerW} y2={PAD.top + innerH} stroke="var(--text-secondary)" strokeWidth="1.5" />
          {/* Y axis */}
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + innerH} stroke="var(--text-secondary)" strokeWidth="1.5" />

          {/* Y axis labels (ranks) */}
          {Array.from({ length: maxRank }, (_, i) => i + 1).map(rank => (
            <text key={rank} x={PAD.left - 8} y={yScale(rank) + 4} textAnchor="end" fontSize="10" fill="var(--text-secondary)" fontWeight="600">
              #{rank}
            </text>
          ))}

          {/* X axis labels */}
          {weights.filter((_, i) => i % 2 === 0).map(w => (
            <text key={w} x={xScale(w)} y={PAD.top + innerH + 16} textAnchor="middle" fontSize="10" fill="var(--text-secondary)">
              {(w * 100).toFixed(0)}%
            </text>
          ))}

          {/* X axis title */}
          <text x={PAD.left + innerW / 2} y={HEIGHT - 4} textAnchor="middle" fontSize="11" fill="var(--text-secondary)" fontWeight="600">
            Bobot "{variedCriterion}"
          </text>

          {/* Current weight marker */}
          <line
            x1={xScale(midWeight)} y1={PAD.top}
            x2={xScale(midWeight)} y2={PAD.top + innerH}
            stroke="var(--accent-primary)" strokeWidth="1.5" strokeDasharray="6,3"
          />
          <text x={xScale(midWeight) + 4} y={PAD.top + 12} fontSize="9" fill="var(--accent-primary)" fontWeight="700">
            Saat ini
          </text>

          {/* Lines per alternative */}
          {altData.map(({ alt, points, color }) => {
            if (points.length < 2) return null;
            const pathD = points.map((p, i) =>
              `${i === 0 ? 'M' : 'L'} ${xScale(p.w).toFixed(1)} ${yScale(p.rank).toFixed(1)}`
            ).join(' ');

            // Confidence band (±0.1 rank equivalent)
            const bandTop = points.map((p, i) =>
              `${i === 0 ? 'M' : 'L'} ${xScale(p.w).toFixed(1)} ${(yScale(p.rank) - (1 - p.conf) * 15).toFixed(1)}`
            ).join(' ');
            const bandBottom = [...points].reverse().map((p, i) =>
              `${i === 0 ? 'M' : 'L'} ${xScale(p.w).toFixed(1)} ${(yScale(p.rank) + (1 - p.conf) * 15).toFixed(1)}`
            ).join(' ');

            return (
              <g key={alt}>
                {/* Confidence band */}
                <path d={`${bandTop} ${bandBottom} Z`} fill={color} fillOpacity="0.08" />
                {/* Main line */}
                <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {/* Dots */}
                {points.map((p, pi) => (
                  <circle key={pi} cx={xScale(p.w)} cy={yScale(p.rank)} r="3.5" fill={color} stroke="white" strokeWidth="1.5">
                    <title>{alt}: Rank #{p.rank} @ {(p.w * 100).toFixed(0)}% (conf: {(p.conf * 100).toFixed(0)}%)</title>
                  </circle>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px' }}>
        {altData.map(({ alt, color }) => (
          <div key={alt} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '20px', height: '3px', background: color, borderRadius: '2px' }} />
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>{alt}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '20px', height: '8px', background: 'rgba(211,123,85,0.15)', borderRadius: '2px' }} />
          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>Batas kepercayaan ML</span>
        </div>
      </div>
    </div>
  );
};

export default MLSensitivityChart;
