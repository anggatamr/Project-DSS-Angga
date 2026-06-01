import React from 'react';

/**
 * MLFeatureImportance — Horizontal bar chart of feature importance scores.
 * Props:
 *   featureImportance: { [featureName]: number }
 *   taskType: 'regression' | 'classification'
 */
const MLFeatureImportance = ({ featureImportance, taskType }) => {
  if (!featureImportance || Object.keys(featureImportance).length === 0) return null;

  const entries = Object.entries(featureImportance).slice(0, 12);
  const maxVal = Math.max(...entries.map(([, v]) => v), 0.001);

  const barColor = (rank) => {
    if (rank === 0) return 'linear-gradient(90deg, #D37B55, #f39b75)';
    if (rank === 1) return 'linear-gradient(90deg, #5A67D8, #818CF8)';
    if (rank === 2) return 'linear-gradient(90deg, #7A9D54, #a3c97a)';
    return 'linear-gradient(90deg, #A38E7A, #cbbab9)';
  };

  return (
    <div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', fontWeight: '500' }}>
        {taskType === 'regression'
          ? 'Menunjukkan seberapa besar kontribusi setiap fitur terhadap prediksi nilai target.'
          : 'Menunjukkan fitur mana yang paling berpengaruh dalam klasifikasi.'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {entries.map(([name, importance], i) => {
          const pct = (importance / maxVal) * 100;
          return (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: i < 3 ? 'var(--accent-primary)' : 'var(--border-color)', color: i < 3 ? 'white' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800', flexShrink: 0 }}>
                {i + 1}
              </div>
              <div style={{ width: '140px', fontSize: '12px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }} title={name}>
                {name}
              </div>
              <div style={{ flexGrow: 1, height: '20px', background: 'var(--canvas-bg)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: barColor(i), borderRadius: '4px', transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ width: '50px', textAlign: 'right', fontSize: '12px', fontWeight: '800', color: 'var(--accent-primary)', flexShrink: 0 }}>
                {(importance * 100).toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>

      {Object.keys(featureImportance).length > 12 && (
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', fontStyle: 'italic' }}>
          Menampilkan 12 fitur teratas dari {Object.keys(featureImportance).length} total fitur.
        </div>
      )}
    </div>
  );
};

export default MLFeatureImportance;
