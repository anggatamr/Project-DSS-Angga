import React, { useState } from 'react';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * MLTrainer — Select target column and train ML models.
 * Props:
 *   profile: dataset profile from MLDataProfiler
 *   uploadedFile: File object
 *   onTrainingComplete: (trainingReport) => void
 *   addToast: fn
 */
const MLTrainer = ({ profile, uploadedFile, onTrainingComplete, addToast }) => {
  const [targetCol, setTargetCol] = useState(profile?.target_candidates?.[0] || '');
  const [testSize, setTestSize] = useState(0.2);
  const [loading, setLoading] = useState(false);
  const [trainingReport, setTrainingReport] = useState(null);

  if (!profile || !uploadedFile) return null;

  const allColumns = profile.columns.map(c => c.name);

  const handleTrain = async () => {
    if (!targetCol) {
      addToast('Pilih kolom target terlebih dahulu.', 'error', 'Validasi');
      return;
    }
    setLoading(true);
    setTrainingReport(null);

    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('target_column', targetCol);
    formData.append('test_size', testSize);

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/ml/train-model`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Gagal melatih model.');
      }
      const data = await res.json();
      setTrainingReport(data);
      onTrainingComplete(data);
      addToast(`Model "${data.best_model}" berhasil dilatih!`, 'success', 'Training Selesai');
    } catch (err) {
      addToast(err.message, 'error', 'Training Error');
    } finally {
      setLoading(false);
    }
  };

  const modelDisplayName = (name) =>
    (name || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const metricLabel = (key) => ({
    r2_score: 'R² Score', mae: 'MAE', accuracy: 'Akurasi', f1_score: 'F1 Score', score: 'Skor'
  }[key] || key);

  const scoreColor = (score) => {
    if (score >= 0.8) return '#276749';
    if (score >= 0.6) return '#744210';
    return '#742a2a';
  };

  return (
    <div>
      {/* Config panel */}
      <div style={{ background: 'var(--canvas-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px' }}>⚙️ Konfigurasi Training</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: '700', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
              🎯 Kolom Target (yang ingin diprediksi):
            </label>
            <select
              className="form-control"
              value={targetCol}
              onChange={e => setTargetCol(e.target.value)}
            >
              <option value="">-- Pilih kolom target --</option>
              {allColumns.map(col => {
                const colProfile = profile.columns.find(c => c.name === col);
                const isRecommended = profile.target_candidates.includes(col);
                return (
                  <option key={col} value={col}>
                    {isRecommended ? '⭐ ' : ''}{col} ({colProfile?.data_type || 'unknown'})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: '700', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
              📊 Ukuran Test Set: <strong style={{ color: 'var(--accent-primary)' }}>{Math.round(testSize * 100)}%</strong>
            </label>
            <input
              type="range" min="10" max="40" step="5"
              value={testSize * 100}
              className="slider-input"
              onChange={e => setTestSize(parseInt(e.target.value) / 100)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              <span>Train: {Math.round((1 - testSize) * 100)}%</span>
              <span>Test: {Math.round(testSize * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Models that will be trained */}
        <div style={{ marginTop: '16px', padding: '12px', background: 'var(--card-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Model yang akan dilatih otomatis:
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {profile.recommended_models.map((m, i) => (
              <span key={i} style={{ fontSize: '11px', fontWeight: '700', background: 'var(--accent-muted)', color: 'var(--accent-hover)', padding: '3px 10px', borderRadius: '10px' }}>
                {modelDisplayName(m)}
              </span>
            ))}
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{ marginTop: '16px', width: '100%' }}
          onClick={handleTrain}
          disabled={loading || !targetCol}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Melatih Model...
            </span>
          ) : '🚀 Mulai Training Otomatis'}
        </button>
      </div>

      {/* Training results */}
      {trainingReport && (
        <div>
          {/* Best model highlight */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fff4, #e6fffa)',
            border: '2px solid #68d391',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#276749', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                🏆 Model Terbaik
              </div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#276749', marginTop: '4px' }}>
                {modelDisplayName(trainingReport.best_model)}
              </div>
              <div style={{ fontSize: '12px', color: '#276749', marginTop: '2px' }}>
                Target: <strong>{trainingReport.target_column}</strong> · Task: <strong>{trainingReport.task_type}</strong> · {trainingReport.sample_size} sampel
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#276749', fontWeight: '700' }}>Kualitas Data</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#276749' }}>
                {(trainingReport.data_quality * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* All model results */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            {Object.entries(trainingReport.training_results).map(([name, result]) => {
              const isBest = name === trainingReport.best_model;
              const score = result.metrics?.score ?? 0;
              return (
                <div key={name} style={{
                  border: `2px solid ${isBest ? '#68d391' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  background: isBest ? '#f0fff4' : 'var(--card-bg)',
                  position: 'relative'
                }}>
                  {isBest && (
                    <span style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '10px', fontWeight: '800', background: '#276749', color: 'white', padding: '2px 6px', borderRadius: '8px' }}>
                      TERBAIK
                    </span>
                  )}
                  {result.status === 'failed' && (
                    <span style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '10px', fontWeight: '800', background: '#c53030', color: 'white', padding: '2px 6px', borderRadius: '8px' }}>
                      GAGAL
                    </span>
                  )}
                  <div style={{ fontWeight: '700', fontSize: '12px', marginBottom: '8px', paddingRight: '50px' }}>
                    {modelDisplayName(name)}
                  </div>
                  {result.status === 'success' && result.metrics && (
                    <div>
                      {Object.entries(result.metrics).filter(([k]) => k !== 'score').map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{metricLabel(k)}</span>
                          <span style={{ fontWeight: '800', color: scoreColor(typeof v === 'number' ? v : 0) }}>{typeof v === 'number' ? v.toFixed(4) : v}</span>
                        </div>
                      ))}
                      {/* Score bar */}
                      <div style={{ marginTop: '8px', height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, score * 100))}%`, background: scoreColor(score), borderRadius: '3px', transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  )}
                  {result.status === 'failed' && (
                    <div style={{ fontSize: '11px', color: '#c53030' }}>{result.error?.slice(0, 60)}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default MLTrainer;
