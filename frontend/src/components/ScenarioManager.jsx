import React, { useState } from 'react';

/**
 * ScenarioManager — Save, compare, and restore What-If weight scenarios.
 * Props:
 *   criterias: current criteria array
 *   rankings: current TOPSIS rankings
 *   sawRankings: current SAW rankings
 *   onRestoreScenario: (criterias) => void
 */
const ScenarioManager = ({ criterias, rankings, sawRankings, onRestoreScenario }) => {
  const [scenarios, setScenarios] = useState([]);
  const [scenarioName, setScenarioName] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const saveScenario = () => {
    const name = scenarioName.trim() || `Skenario ${scenarios.length + 1}`;
    const snapshot = {
      id: Date.now(),
      name,
      weights: criterias.map(c => ({ name: c.name, weight: c.weight, type: c.type })),
      rankings: rankings.map(r => ({ name: r.name, rank: r.rank, score: r.score })),
      sawRankings: sawRankings.map(r => ({ name: r.name, rank: r.rank, score: r.score })),
      savedAt: new Date().toLocaleTimeString('id-ID')
    };
    setScenarios(prev => [...prev, snapshot]);
    setScenarioName('');
  };

  const deleteScenario = (id) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
  };

  const restoreScenario = (scenario) => {
    // Merge saved weights back into current criterias
    const restored = criterias.map(c => {
      const saved = scenario.weights.find(w => w.name === c.name);
      return saved ? { ...c, weight: saved.weight } : c;
    });
    onRestoreScenario(restored);
  };

  return (
    <div className="card" style={{ padding: '20px', marginBottom: 0 }}>
      {/* Header with toggle */}
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setIsOpen(prev => !prev)}
      >
        <h3 style={{ margin: 0, fontSize: '15px' }}>
          💾 Manajer Skenario What-If
          {scenarios.length > 0 && (
            <span style={{
              marginLeft: '8px', fontSize: '11px', fontWeight: '800',
              background: 'var(--accent-primary)', color: 'white',
              padding: '2px 8px', borderRadius: '10px'
            }}>
              {scenarios.length}
            </span>
          )}
        </h3>
        <span style={{ color: 'var(--text-secondary)', fontSize: '18px', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▾
        </span>
      </div>

      {isOpen && (
        <div style={{ marginTop: '16px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '500' }}>
            Simpan konfigurasi bobot saat ini sebagai skenario untuk dibandingkan nanti.
          </p>

          {/* Save current scenario */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              className="form-control"
              style={{ padding: '8px 12px', fontSize: '13px' }}
              placeholder="Nama skenario (opsional)..."
              value={scenarioName}
              onChange={e => setScenarioName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveScenario()}
            />
            <button
              className="btn btn-primary"
              style={{ whiteSpace: 'nowrap', padding: '8px 16px', fontSize: '13px' }}
              onClick={saveScenario}
            >
              + Simpan
            </button>
          </div>

          {scenarios.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>
              Belum ada skenario tersimpan. Atur bobot lalu klik "+ Simpan".
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Comparison header */}
              {scenarios.length >= 2 && (
                <div style={{
                  background: 'linear-gradient(135deg, #f0f7ff, #e8f4fd)',
                  border: '1px solid #bee3f8',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: '#2b6cb0',
                  fontWeight: '600'
                }}>
                  📊 Perbandingan {scenarios.length} skenario tersimpan:
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {scenarios.map((s, idx) => (
                      <div key={s.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontWeight: '800', minWidth: '20px' }}>#{idx + 1}</span>
                        <span style={{ fontWeight: '700', minWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                        <span style={{ color: '#4a5568' }}>
                          🥇 {s.rankings[0]?.name || '-'}
                          {s.rankings[0] && <span style={{ color: '#718096', marginLeft: '4px' }}>({s.rankings[0].score.toFixed(4)})</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scenario cards */}
              {scenarios.map((s, idx) => (
                <div key={s.id} style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  background: 'var(--canvas-bg)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontWeight: '700', fontSize: '13px' }}>{s.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                        Disimpan {s.savedAt}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => restoreScenario(s)}
                        title="Terapkan bobot skenario ini"
                      >
                        ↩ Terapkan
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => deleteScenario(s.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Weight pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                    {s.weights.map((w, wi) => (
                      <span key={wi} style={{
                        fontSize: '10px', fontWeight: '700',
                        background: 'white', border: '1px solid var(--border-color)',
                        borderRadius: '8px', padding: '2px 8px',
                        color: 'var(--text-secondary)'
                      }}>
                        {w.name}: <strong style={{ color: 'var(--accent-primary)' }}>{(w.weight * 100).toFixed(0)}%</strong>
                      </span>
                    ))}
                  </div>

                  {/* Top 3 ranking */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {s.rankings.slice(0, 3).map(r => (
                      <span key={r.name} style={{
                        fontSize: '11px', fontWeight: '700',
                        color: r.rank === 1 ? 'var(--accent-primary)' : 'var(--text-secondary)'
                      }}>
                        {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉'} {r.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScenarioManager;
