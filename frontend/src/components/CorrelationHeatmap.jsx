import React from 'react';
import { buildCorrelationMatrix } from '../utils/correlationAnalysis';

/**
 * CorrelationHeatmap — Shows a criteria correlation matrix as a color-coded heatmap.
 * Props:
 *   matrix: decision matrix [alt][crit]
 *   criterias: array of criteria objects with .name
 *   warnings: array of correlation warning objects
 */
const CorrelationHeatmap = ({ matrix, criterias, warnings }) => {
  if (!matrix || matrix.length < 3 || criterias.length < 2) return null;

  const corrMatrix = buildCorrelationMatrix(matrix, criterias);

  // Color scale: -1 (blue) → 0 (white) → 1 (red)
  const getColor = (r) => {
    const abs = Math.abs(r);
    if (r === 1) return '#e53e3e'; // diagonal
    if (abs >= 0.85) return r > 0 ? '#fc8181' : '#90cdf4';
    if (abs >= 0.6) return r > 0 ? '#fbd38d' : '#bee3f8';
    if (abs >= 0.3) return r > 0 ? '#fefcbf' : '#ebf8ff';
    return '#f7fafc';
  };

  const getTextColor = (r) => {
    const abs = Math.abs(r);
    if (abs >= 0.85) return '#1a202c';
    return '#4a5568';
  };

  return (
    <div>
      {warnings.length > 0 && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #f6ad55',
          borderLeft: '4px solid #ed8936',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '12px'
        }}>
          <div style={{ fontWeight: '800', fontSize: '13px', color: '#744210', marginBottom: '6px' }}>
            ⚠️ Peringatan Korelasi Tinggi Terdeteksi
          </div>
          {warnings.map((w, i) => (
            <div key={i} style={{ fontSize: '12px', color: '#744210', marginBottom: '3px', fontWeight: '600' }}>
              • <strong>{w.crit1}</strong> ↔ <strong>{w.crit2}</strong>: r = {w.correlation.toFixed(3)} (korelasi {w.direction} sangat kuat).
              Kedua kriteria ini mungkin mengukur hal yang sama — pertimbangkan untuk menggabungkan atau menghapus salah satunya.
            </div>
          ))}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '11px', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ padding: '6px 8px', background: 'var(--text-primary)', color: 'white', fontSize: '10px', textAlign: 'left', minWidth: '80px' }}>
                Kriteria
              </th>
              {criterias.map((c, j) => (
                <th key={j} style={{
                  padding: '6px 4px', background: 'var(--text-primary)', color: 'white',
                  fontSize: '10px', textAlign: 'center', minWidth: '60px',
                  maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {c.name.length > 8 ? c.name.slice(0, 8) + '…' : c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criterias.map((rowCrit, i) => (
              <tr key={i}>
                <td style={{
                  padding: '6px 8px', fontWeight: '700', fontSize: '11px',
                  background: 'var(--canvas-bg)', borderBottom: '1px solid var(--border-color)',
                  maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {rowCrit.name}
                </td>
                {criterias.map((colCrit, j) => {
                  const r = corrMatrix[i][j];
                  return (
                    <td key={j} style={{
                      padding: '6px 4px',
                      background: getColor(r),
                      color: getTextColor(r),
                      textAlign: 'center',
                      fontWeight: i === j ? '800' : '600',
                      borderBottom: '1px solid var(--border-color)',
                      borderRight: '1px solid var(--border-color)',
                      fontSize: '11px'
                    }}
                    title={`${rowCrit.name} ↔ ${colCrit.name}: r = ${r.toFixed(3)}`}
                    >
                      {r.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)' }}>Legenda:</span>
        {[
          { color: '#fc8181', label: 'Korelasi Positif Tinggi (≥0.85)' },
          { color: '#fbd38d', label: 'Korelasi Positif Sedang' },
          { color: '#f7fafc', label: 'Tidak Berkorelasi' },
          { color: '#bee3f8', label: 'Korelasi Negatif Sedang' },
          { color: '#90cdf4', label: 'Korelasi Negatif Tinggi' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', background: item.color, borderRadius: '2px', border: '1px solid #e2e8f0' }} />
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CorrelationHeatmap;
