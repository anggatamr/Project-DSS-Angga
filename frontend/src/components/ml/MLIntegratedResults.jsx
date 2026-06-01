import React, { useState } from 'react';
import AnimatedNumber from '../AnimatedNumber';

/**
 * MLIntegratedResults — Shows combined MCDM + ML ranking table with confidence scores.
 * Props:
 *   result: integrated solve result from backend
 *   method: 'TOPSIS' | 'SAW'
 */
const MLIntegratedResults = ({ result, method }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!result || !result.rankings || result.rankings.length === 0) return null;

  const { rankings, feature_importance, criteria_used, weights_used, ml_integrated } = result;

  const confidenceColor = (c) => {
    if (c >= 0.85) return '#276749';
    if (c >= 0.65) return '#744210';
    return '#742a2a';
  };

  const confidenceBg = (c) => {
    if (c >= 0.85) return '#c6f6d5';
    if (c >= 0.65) return '#fefcbf';
    return '#fed7d7';
  };

  const rankIcon = (rank) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;

  return (
    <div>
      {/* ML integration badge */}
      {ml_integrated && (
        <div style={{
          background: 'linear-gradient(135deg, #ebf8ff, #e6fffa)',
          border: '1px solid #90cdf4',
          borderRadius: 'var(--radius-md)',
          padding: '10px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '20px' }}>🤖</span>
          <div>
            <div style={{ fontWeight: '800', fontSize: '13px', color: '#2b6cb0' }}>
              MCDM + ML Terintegrasi
            </div>
            <div style={{ fontSize: '11px', color: '#2b6cb0', fontWeight: '500' }}>
              Peringkat dihitung menggunakan {method} yang diperkuat dengan prediksi ML.
              Kolom "ML Pred" menunjukkan nilai yang diprediksi model untuk setiap alternatif.
            </div>
          </div>
        </div>
      )}

      {/* Rankings table */}
      <div className="table-responsive" style={{ marginBottom: '16px' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '80px', textAlign: 'center' }}>Peringkat</th>
              <th>Alternatif</th>
              <th style={{ width: '120px', textAlign: 'center' }}>Skor {method}</th>
              {ml_integrated && <th style={{ width: '110px', textAlign: 'center' }}>ML Pred</th>}
              {ml_integrated && <th style={{ width: '110px', textAlign: 'center' }}>Kepercayaan</th>}
              <th>Penjelasan</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((r, i) => (
              <tr key={i}>
                <td style={{ textAlign: 'center', fontWeight: '800', fontSize: '18px' }}>
                  {rankIcon(r.rank)}
                </td>
                <td style={{ fontWeight: r.rank === 1 ? '800' : '600' }}>
                  {r.alternative_name}
                  {r.key_drivers && r.key_drivers.length > 0 && (
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Faktor: {r.key_drivers.slice(0, 2).join(', ')}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'center', fontWeight: '800', color: 'var(--accent-primary)' }}>
                  <AnimatedNumber value={r.mcdm_score} decimals={4} />
                </td>
                {ml_integrated && (
                  <td style={{ textAlign: 'center', fontWeight: '700' }}>
                    {r.ml_prediction !== null && r.ml_prediction !== undefined
                      ? <AnimatedNumber value={r.ml_prediction} decimals={2} />
                      : <span style={{ color: 'var(--text-secondary)' }}>—</span>}
                  </td>
                )}
                {ml_integrated && (
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      background: confidenceBg(r.ml_confidence),
                      color: confidenceColor(r.ml_confidence),
                      borderRadius: '10px',
                      padding: '3px 10px',
                      fontSize: '11px',
                      fontWeight: '800'
                    }}>
                      {(r.ml_confidence * 100).toFixed(0)}%
                    </span>
                  </td>
                )}
                <td style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '200px' }}>
                  {r.explanation?.split('|').map((part, pi) => (
                    <div key={pi}>{part.trim()}</div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Criteria weights used */}
      <div
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--canvas-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '8px' }}
        onClick={() => setShowDetails(p => !p)}
      >
        <span style={{ fontWeight: '700', fontSize: '13px' }}>📋 Detail Kriteria & Bobot yang Digunakan</span>
        <span style={{ color: 'var(--text-secondary)', transition: 'transform 0.2s', transform: showDetails ? 'rotate(180deg)' : 'none' }}>▾</span>
      </div>

      {showDetails && criteria_used && (
        <div style={{ padding: '12px 14px', background: 'var(--canvas-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {criteria_used.map((name, i) => (
              <div key={i} style={{
                background: name === 'ML Prediction Score' ? '#ebf8ff' : 'var(--card-bg)',
                border: `1px solid ${name === 'ML Prediction Score' ? '#90cdf4' : 'var(--border-color)'}`,
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px'
              }}>
                <span style={{ fontWeight: '700', color: name === 'ML Prediction Score' ? '#2b6cb0' : 'var(--text-primary)' }}>
                  {name === 'ML Prediction Score' ? '🤖 ' : ''}{name}
                </span>
                <span style={{ marginLeft: '6px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                  {weights_used?.[i] !== undefined ? `${(weights_used[i] * 100).toFixed(1)}%` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MLIntegratedResults;
