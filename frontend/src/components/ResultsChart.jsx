import React from 'react';
import EmptyState from './EmptyState';
import AnimatedNumber from './AnimatedNumber';

const ResultsChart = ({ rankings, stabilityRates = {}, showDual = false, sawRankings = [], spearman = null }) => {
  if (!rankings || rankings.length === 0) {
    return (
      <EmptyState 
        icon="chart" 
        title="Tidak Ada Data Peringkat" 
        subtitle="Selesaikan konfigurasi matriks kriteria untuk mengkalkulasi visualisasi peringkat." 
      />
    );
  }

  // Find max score to normalize bar width representing ratios properly
  const maxScore = Math.max(...rankings.map(r => r.score), 1e-9);

  return (
    <div className="chart-container">
      {/* Spearman Correlation Display */}
      {showDual && spearman && (
        <div 
          className="alert alert-info step-transition" 
          style={{ 
            padding: '12px 16px', 
            borderRadius: 'var(--radius-md)', 
            marginBottom: '16px', 
            borderLeft: '4px solid #3182CE',
            backgroundColor: '#EBF8FF'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ color: '#2B6CB0', fontSize: '13px' }}>📊 Spearman Rank Correlation:</strong>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#2B6CB0' }}>
                Koefisien Korelasi ($r_s$): <strong>{spearman.coefficient.toFixed(4)}</strong> ({spearman.interpretation})
              </p>
            </div>
            <span style={{ fontSize: '20px' }}>🧪</span>
          </div>
        </div>
      )}

      {showDual ? (
        // Dual Method side-by-side view
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Metode TOPSIS (Acuan Utama)</h4>
            <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Metode SAW (Komparator)</h4>
          </div>
          
          {rankings.map((topsisItem, idx) => {
            const topsisPercentage = (topsisItem.score / maxScore) * 100;
            
            // Find corresponding SAW score/rank
            const sawItem = sawRankings.find(r => r.name === topsisItem.name) || { score: 0, rank: '-' };
            const maxSawScore = Math.max(...sawRankings.map(r => r.score), 1e-9);
            const sawPercentage = (sawItem.score / maxSawScore) * 100;

            return (
              <div key={topsisItem.id || idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'center' }}>
                {/* TOPSIS Column */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800' }}>
                    {topsisItem.rank}
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>{topsisItem.name}</div>
                    <div className="chart-bar-bg" style={{ height: '14px', borderRadius: '3px' }}>
                      <div className="chart-bar-fill" style={{ width: `${topsisPercentage}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-primary), #e29472)' }} />
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', width: '40px', textAlign: 'right' }}>{topsisItem.score.toFixed(4)}</span>
                </div>

                {/* SAW Column */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px dashed var(--border-color)', paddingLeft: '12px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#5A67D8', color: 'white', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800' }}>
                    {sawItem.rank}
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>{sawItem.name}</div>
                    <div className="chart-bar-bg" style={{ height: '14px', borderRadius: '3px' }}>
                      <div className="chart-bar-fill" style={{ width: `${sawPercentage}%`, height: '100%', background: 'linear-gradient(90deg, #5A67D8, #818CF8)' }} />
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', width: '40px', textAlign: 'right' }}>{sawItem.score.toFixed(4)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Standard single method view
        rankings.map((item, idx) => {
          const percentage = (item.score / maxScore) * 100;
          const rate = stabilityRates[item.name];
          
          let rankBadgeBg = 'var(--text-secondary)';
          let rankBadgeColor = 'white';
          let barColor = 'linear-gradient(90deg, var(--accent-primary), #e29472)';
          
          if (item.rank === 1) {
            rankBadgeBg = 'var(--accent-primary)';
            barColor = 'linear-gradient(90deg, #D37B55, #f39b75)';
          } else if (item.rank === 2) {
            rankBadgeBg = '#7C7267';
            barColor = 'linear-gradient(90deg, #8c7f72, #ab9b8e)';
          } else if (item.rank === 3) {
            rankBadgeBg = '#A38E7A';
            barColor = 'linear-gradient(90deg, #a38e7a, #cbbab9)';
          }

          return (
            <div 
              key={item.id || idx} 
              className="chart-bar-wrapper animate-item"
              style={{ 
                animationDelay: `${idx * 80}ms`,
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                marginBottom: '4px'
              }}
            >
              <div 
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: rankBadgeBg,
                  color: rankBadgeColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '13px',
                  flexShrink: 0,
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}
              >
                {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : item.rank}
              </div>
              
              <div className="chart-label" title={item.name} style={{ width: '150px', paddingLeft: '8px' }}>
                {item.name}
              </div>
              
              <div className="chart-bar-bg" style={{ position: 'relative' }}>
                <div 
                  className="chart-bar-fill" 
                  style={{ 
                    width: `${percentage}%`,
                    background: barColor,
                    boxShadow: 'inset 0 -2px 6px rgba(0,0,0,0.06)'
                  }}
                />
                {rate !== undefined && (
                  <span 
                    style={{ 
                      position: 'absolute', 
                      left: '10px', 
                      top: '6px', 
                      fontSize: '9px', 
                      fontWeight: '800', 
                      color: 'white',
                      textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                      pointerEvents: 'none',
                      letterSpacing: '0.02em'
                    }}
                  >
                    ⚡ Stabilitas: {rate.toFixed(0)}%
                  </span>
                )}
              </div>
              
              <div className="chart-value" style={{ fontSize: '13px', width: '55px' }}>
                <AnimatedNumber value={item.score} decimals={4} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default ResultsChart;
