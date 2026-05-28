import React from 'react';
import EmptyState from './EmptyState';
import AnimatedNumber from './AnimatedNumber';

const ResultsChart = ({ rankings, stabilityRates = {} }) => {
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
      {rankings.map((item, idx) => {
        const percentage = (item.score / maxScore) * 100;
        const rate = stabilityRates[item.name];
        
        // Highlight top 3 with different styling badges
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
              {/* Display stability percentage inside bar if available */}
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
      })}
    </div>
  );
};

export default ResultsChart;
