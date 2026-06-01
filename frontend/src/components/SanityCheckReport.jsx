import React, { useState } from 'react';

/**
 * SanityCheckReport — Displays post-calculation anomaly warnings and data quality metrics.
 * Props:
 *   anomalies: array from runSanityCheck()
 *   dataQuality: object from computeDataQuality()
 */
const SanityCheckReport = ({ anomalies, dataQuality }) => {
  const [isOpen, setIsOpen] = useState(true);

  const hasIssues = (anomalies && anomalies.length > 0) || (dataQuality && dataQuality.outliers.length > 0);

  if (!hasIssues && (!dataQuality || dataQuality.isClean)) return null;

  return (
    <div style={{
      border: `1px solid ${hasIssues ? '#f6ad55' : '#68d391'}`,
      borderLeft: `4px solid ${hasIssues ? '#ed8936' : '#48bb78'}`,
      borderRadius: 'var(--radius-md)',
      background: hasIssues ? '#fffbeb' : '#f0fff4',
      marginBottom: '16px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', cursor: 'pointer'
        }}
        onClick={() => setIsOpen(prev => !prev)}
      >
        <div style={{ fontWeight: '800', fontSize: '13px', color: hasIssues ? '#744210' : '#276749' }}>
          {hasIssues ? '🔍 Laporan Sanity Check — Anomali Terdeteksi' : '✅ Sanity Check — Data Terlihat Normal'}
        </div>
        <span style={{ color: hasIssues ? '#744210' : '#276749', fontSize: '16px', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▾
        </span>
      </div>

      {isOpen && (
        <div style={{ padding: '0 16px 14px' }}>
          {/* Data Quality Metrics */}
          {dataQuality && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Metrik Kualitas Data
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <MetricBadge
                  label="Kelengkapan"
                  value={`${dataQuality.completeness}%`}
                  good={parseFloat(dataQuality.completeness) >= 90}
                />
                <MetricBadge
                  label="Sel Tidak Valid"
                  value={dataQuality.invalidCells.length}
                  good={dataQuality.invalidCells.length === 0}
                />
                <MetricBadge
                  label="Outlier Terdeteksi"
                  value={dataQuality.outliers.length}
                  good={dataQuality.outliers.length === 0}
                />
                <MetricBadge
                  label="Total Sel"
                  value={dataQuality.totalCells}
                  good={true}
                  neutral
                />
              </div>
            </div>
          )}

          {/* Invalid cells */}
          {dataQuality && dataQuality.invalidCells.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#c53030', marginBottom: '4px' }}>
                ❌ Sel Tidak Valid:
              </div>
              {dataQuality.invalidCells.map((cell, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#742a2a', marginBottom: '2px', fontWeight: '600' }}>
                  • [{cell.alt}] → [{cell.crit}] = {cell.val}: {cell.reason}
                </div>
              ))}
            </div>
          )}

          {/* Outliers */}
          {dataQuality && dataQuality.outliers.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#744210', marginBottom: '4px' }}>
                📊 Nilai Outlier (z-score &gt; 2.5):
              </div>
              {dataQuality.outliers.slice(0, 5).map((o, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#744210', marginBottom: '2px', fontWeight: '600' }}>
                  • [{o.alt}] → [{o.crit}] = {o.val} (z = {o.zScore})
                </div>
              ))}
              {dataQuality.outliers.length > 5 && (
                <div style={{ fontSize: '11px', color: '#744210', fontStyle: 'italic' }}>
                  ...dan {dataQuality.outliers.length - 5} outlier lainnya.
                </div>
              )}
            </div>
          )}

          {/* Ranking anomalies */}
          {anomalies && anomalies.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#744210', marginBottom: '4px' }}>
                ⚠️ Anomali Peringkat:
              </div>
              {anomalies.map((a, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#744210', marginBottom: '4px', fontWeight: '600', lineHeight: '1.4' }}>
                  • {a.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MetricBadge = ({ label, value, good, neutral }) => (
  <div style={{
    background: neutral ? '#edf2f7' : good ? '#c6f6d5' : '#fed7d7',
    border: `1px solid ${neutral ? '#e2e8f0' : good ? '#9ae6b4' : '#fc8181'}`,
    borderRadius: '8px',
    padding: '6px 12px',
    textAlign: 'center'
  }}>
    <div style={{ fontSize: '16px', fontWeight: '800', color: neutral ? '#4a5568' : good ? '#276749' : '#c53030' }}>
      {value}
    </div>
    <div style={{ fontSize: '10px', fontWeight: '700', color: neutral ? '#718096' : good ? '#276749' : '#c53030' }}>
      {label}
    </div>
  </div>
);

export default SanityCheckReport;
