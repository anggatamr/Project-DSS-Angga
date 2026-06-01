import React, { useState } from 'react';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * MLDataProfiler — Upload a dataset and display the auto-profile results.
 * Props:
 *   onProfileComplete: (profile, file, df_columns) => void
 *   addToast: fn
 */
const MLDataProfiler = ({ onProfileComplete, addToast }) => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [expandedCol, setExpandedCol] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setLoading(true);
    setProfile(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/ml/profile-dataset`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Gagal memproses dataset.');
      }
      const data = await res.json();
      setProfile(data.profile);
      onProfileComplete(data.profile, file);
      addToast(`Dataset "${file.name}" berhasil dianalisis!`, 'success', 'Profiling Selesai');
    } catch (err) {
      addToast(err.message, 'error', 'Profiling Error');
    } finally {
      setLoading(false);
    }
  };

  const roleColor = {
    target: { bg: '#fef3c7', color: '#92400e', label: 'Target' },
    feature: { bg: '#dbeafe', color: '#1e40af', label: 'Fitur' },
    identifier: { bg: '#f3f4f6', color: '#6b7280', label: 'ID' },
    metadata: { bg: '#f3f4f6', color: '#6b7280', label: 'Metadata' },
  };

  const typeIcon = {
    numeric: '🔢',
    categorical: '🏷️',
    ordinal: '📊',
    temporal: '📅',
    text: '📝',
  };

  const qualityColor = (q) => {
    if (q >= 0.85) return '#276749';
    if (q >= 0.6) return '#744210';
    return '#742a2a';
  };

  return (
    <div>
      {/* Upload zone */}
      <div
        style={{
          border: '2px dashed var(--accent-muted)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px',
          textAlign: 'center',
          background: 'var(--canvas-bg)',
          cursor: 'pointer',
          transition: 'var(--transition)',
        }}
        onClick={() => document.getElementById('ml-file-input').click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) {
            const input = document.getElementById('ml-file-input');
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
            handleFileUpload({ target: { files: [file] } });
          }
        }}
      >
        <input
          id="ml-file-input"
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📂</div>
        <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '6px' }}>
          {loading ? 'Menganalisis dataset...' : 'Klik atau drag & drop file CSV/Excel'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
          Sistem akan otomatis mendeteksi tipe data, peran kolom, dan merekomendasikan model ML
        </div>
        {fileName && !loading && (
          <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)' }}>
            ✓ {fileName}
          </div>
        )}
        {loading && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ width: '200px', height: '6px', background: 'var(--border-color)', borderRadius: '3px', margin: '0 auto', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--accent-primary)', borderRadius: '3px', animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%' }} />
            </div>
          </div>
        )}
      </div>

      {/* Profile results */}
      {profile && (
        <div style={{ marginTop: '24px' }}>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Baris', value: profile.shape[0], icon: '📋' },
              { label: 'Kolom', value: profile.shape[1], icon: '📊' },
              { label: 'Kualitas Data', value: `${(profile.quality_score * 100).toFixed(0)}%`, icon: '✅', color: qualityColor(profile.quality_score) },
              { label: 'Target Kandidat', value: profile.target_candidates.length, icon: '🎯' },
              { label: 'Fitur', value: profile.feature_candidates.length, icon: '🔧' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', marginBottom: '4px' }}>{item.icon}</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: item.color || 'var(--text-primary)' }}>{item.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* Recommended models */}
          <div style={{ background: 'linear-gradient(135deg, #f0fff4, #e6fffa)', border: '1px solid #9ae6b4', borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: '16px' }}>
            <div style={{ fontWeight: '800', fontSize: '13px', color: '#276749', marginBottom: '8px' }}>
              🤖 Model ML yang Direkomendasikan:
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {profile.recommended_models.map((m, i) => (
                <span key={i} style={{
                  background: i === 0 ? '#276749' : 'white',
                  color: i === 0 ? 'white' : '#276749',
                  border: '1px solid #9ae6b4',
                  borderRadius: '12px', padding: '4px 12px',
                  fontSize: '11px', fontWeight: '800'
                }}>
                  {i === 0 ? '⭐ ' : ''}{m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              ))}
            </div>
          </div>

          {/* Target & feature candidates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: '#fffbeb', border: '1px solid #f6ad55', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
              <div style={{ fontWeight: '800', fontSize: '12px', color: '#92400e', marginBottom: '6px' }}>🎯 Kolom Target Kandidat</div>
              {profile.target_candidates.map((t, i) => (
                <span key={i} style={{ display: 'inline-block', background: '#fef3c7', color: '#92400e', borderRadius: '8px', padding: '2px 10px', fontSize: '12px', fontWeight: '700', marginRight: '4px' }}>{t}</span>
              ))}
            </div>
            <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
              <div style={{ fontWeight: '800', fontSize: '12px', color: '#1e40af', marginBottom: '6px' }}>🔧 Kolom Fitur ({profile.feature_candidates.length})</div>
              <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: '600' }}>
                {profile.feature_candidates.slice(0, 6).join(', ')}{profile.feature_candidates.length > 6 ? ` +${profile.feature_candidates.length - 6} lainnya` : ''}
              </div>
            </div>
          </div>

          {/* Column details table */}
          <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '10px', color: 'var(--text-primary)' }}>
            Detail Kolom ({profile.columns.length} kolom):
          </div>
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr>
                  {['Kolom', 'Tipe', 'Peran', 'Missing', 'Unik', 'Distribusi'].map((h, i) => (
                    <th key={i} style={{ background: 'var(--text-primary)', color: 'white', padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '700' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profile.columns.map((col, i) => {
                  const role = roleColor[col.semantic_role] || roleColor.feature;
                  return (
                    <React.Fragment key={i}>
                      <tr
                        style={{ cursor: 'pointer' }}
                        onClick={() => setExpandedCol(expandedCol === col.name ? null : col.name)}
                      >
                        <td style={{ padding: '10px 12px', fontWeight: '700', borderBottom: '1px solid var(--border-color)', background: i % 2 === 0 ? 'var(--card-bg)' : 'var(--canvas-bg)' }}>
                          {col.name}
                          <span style={{ marginLeft: '4px', fontSize: '10px', color: 'var(--text-secondary)' }}>{expandedCol === col.name ? '▲' : '▼'}</span>
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', background: i % 2 === 0 ? 'var(--card-bg)' : 'var(--canvas-bg)' }}>
                          {typeIcon[col.data_type] || '❓'} {col.data_type}
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', background: i % 2 === 0 ? 'var(--card-bg)' : 'var(--canvas-bg)' }}>
                          <span style={{ background: role.bg, color: role.color, borderRadius: '8px', padding: '2px 8px', fontSize: '10px', fontWeight: '800' }}>{role.label}</span>
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', background: i % 2 === 0 ? 'var(--card-bg)' : 'var(--canvas-bg)', color: col.missing_pct > 0.1 ? '#c53030' : 'var(--success)', fontWeight: '700' }}>
                          {(col.missing_pct * 100).toFixed(1)}%
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', background: i % 2 === 0 ? 'var(--card-bg)' : 'var(--canvas-bg)' }}>
                          {col.unique_count}
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', background: i % 2 === 0 ? 'var(--card-bg)' : 'var(--canvas-bg)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {col.distribution_type}
                        </td>
                      </tr>
                      {expandedCol === col.name && (
                        <tr>
                          <td colSpan={6} style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '12px' }}>
                              {col.data_type === 'numeric' && col.statistics && Object.entries(col.statistics).map(([k, v]) => (
                                <div key={k}>
                                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>{k}: </span>
                                  <span style={{ fontWeight: '700' }}>{typeof v === 'number' ? v.toFixed(3) : String(v)}</span>
                                </div>
                              ))}
                              {col.data_type !== 'numeric' && col.statistics?.most_common && (
                                <div>
                                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Nilai terbanyak: </span>
                                  {Object.entries(col.statistics.most_common).slice(0, 3).map(([k, v]) => (
                                    <span key={k} style={{ marginRight: '8px', fontWeight: '700' }}>{k} ({v})</span>
                                  ))}
                                </div>
                              )}
                              {Object.keys(col.correlations || {}).length > 0 && (
                                <div>
                                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Korelasi kuat: </span>
                                  {Object.entries(col.correlations).slice(0, 3).map(([k, v]) => (
                                    <span key={k} style={{ marginRight: '8px', fontWeight: '700', color: Math.abs(v) > 0.7 ? '#c53030' : 'var(--text-primary)' }}>{k} ({v > 0 ? '+' : ''}{v.toFixed(2)})</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MLDataProfiler;
