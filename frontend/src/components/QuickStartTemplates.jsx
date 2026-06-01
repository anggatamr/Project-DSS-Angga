import React, { useState } from 'react';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * QuickStartTemplates — Pre-populated decision problem templates.
 * Props:
 *   onApplyTemplate: ({ criterias, alternatives, matrix, title, method }) => void
 *   onLoadLaptopDataset: () => void  (existing backend endpoint)
 *   addToast: (msg, type, title) => void
 */
const QuickStartTemplates = ({ onApplyTemplate, onLoadLaptopDataset, addToast }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(null);

  const templates = [
    {
      id: 'laptop',
      icon: '💻',
      title: 'Pemilihan Laptop',
      description: '30 laptop dari dataset nyata. Kriteria: RAM, CPU, Berat, Harga, Layar.',
      method: 'TOPSIS',
      badge: 'Dataset Nyata',
      badgeColor: '#276749',
      badgeBg: '#c6f6d5',
      action: 'backend'
    },
    {
      id: 'recruitment',
      icon: '👔',
      title: 'Seleksi Kandidat Kerja',
      description: '10 kandidat dari dataset rekrutmen. Kriteria: Pengalaman, Skor Interview, Skill, Kepribadian.',
      method: 'TOPSIS',
      badge: 'Dataset Nyata',
      badgeColor: '#276749',
      badgeBg: '#c6f6d5',
      action: 'backend'
    },
    {
      id: 'supplier',
      icon: '🏭',
      title: 'Pemilihan Supplier',
      description: '5 supplier dengan kriteria: Harga, Kualitas, Waktu Pengiriman, Reputasi, Layanan.',
      method: 'TOPSIS',
      badge: 'Contoh Manual',
      badgeColor: '#2b6cb0',
      badgeBg: '#bee3f8',
      action: 'inline',
      data: {
        title: 'Pemilihan Supplier Terbaik',
        criterias: [
          { name: 'Harga (Rp)', weight: 0.30, type: 'cost' },
          { name: 'Kualitas (1-10)', weight: 0.25, type: 'benefit' },
          { name: 'Waktu Kirim (hari)', weight: 0.20, type: 'cost' },
          { name: 'Reputasi (1-10)', weight: 0.15, type: 'benefit' },
          { name: 'Layanan (1-10)', weight: 0.10, type: 'benefit' }
        ],
        alternatives: [
          { name: 'Supplier Alpha' },
          { name: 'Supplier Beta' },
          { name: 'Supplier Gamma' },
          { name: 'Supplier Delta' },
          { name: 'Supplier Epsilon' }
        ],
        matrix: [
          [15000000, 8, 3, 9, 8],
          [12000000, 7, 5, 7, 9],
          [18000000, 9, 2, 8, 7],
          [11000000, 6, 7, 6, 8],
          [14000000, 8, 4, 9, 9]
        ]
      }
    },
    {
      id: 'university',
      icon: '🎓',
      title: 'Pemilihan Universitas',
      description: '6 universitas dengan kriteria: Akreditasi, Biaya, Jarak, Fasilitas, Prospek Kerja.',
      method: 'SAW',
      badge: 'Contoh Manual',
      badgeColor: '#2b6cb0',
      badgeBg: '#bee3f8',
      action: 'inline',
      data: {
        title: 'Pemilihan Universitas Terbaik',
        criterias: [
          { name: 'Akreditasi (1-4)', weight: 0.30, type: 'benefit' },
          { name: 'Biaya/Tahun (Juta)', weight: 0.25, type: 'cost' },
          { name: 'Jarak (km)', weight: 0.15, type: 'cost' },
          { name: 'Fasilitas (1-10)', weight: 0.20, type: 'benefit' },
          { name: 'Prospek Kerja (1-10)', weight: 0.10, type: 'benefit' }
        ],
        alternatives: [
          { name: 'Universitas A' },
          { name: 'Universitas B' },
          { name: 'Universitas C' },
          { name: 'Universitas D' },
          { name: 'Universitas E' },
          { name: 'Universitas F' }
        ],
        matrix: [
          [4, 15, 5, 9, 9],
          [3, 8, 20, 7, 8],
          [4, 20, 3, 10, 10],
          [3, 10, 15, 8, 7],
          [2, 6, 30, 6, 6],
          [4, 18, 8, 9, 8]
        ]
      }
    }
  ];

  const handleApply = async (template) => {
    setLoading(template.id);
    try {
      if (template.action === 'backend') {
        if (template.id === 'laptop') {
          await onLoadLaptopDataset();
        } else if (template.id === 'recruitment') {
          const res = await fetch(`${BACKEND_URL}/api/v1/projects/recruitment/dataset-sample`);
          if (!res.ok) throw new Error('Gagal mengambil dataset rekrutmen dari backend.');
          const data = await res.json();
          onApplyTemplate({
            criterias: data.criterias,
            alternatives: data.alternatives,
            matrix: data.matrix,
            title: 'Seleksi Kandidat Kerja',
            method: 'TOPSIS'
          });
          addToast('Dataset Rekrutmen berhasil dimuat!', 'success', 'Template Applied');
        }
      } else {
        onApplyTemplate({
          ...template.data,
          method: template.method
        });
        addToast(`Template "${template.title}" berhasil diterapkan!`, 'success', 'Template Applied');
      }
      setIsOpen(false);
    } catch (err) {
      addToast(err.message, 'error', 'Template Error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <button
        className="btn btn-secondary"
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'linear-gradient(135deg, #f0fff4, #e6fffa)',
          border: '1px solid #9ae6b4',
          color: '#276749',
          fontWeight: '700'
        }}
        onClick={() => setIsOpen(prev => !prev)}
      >
        🚀 Quick Start Templates
        <span style={{
          fontSize: '10px', background: '#276749', color: 'white',
          padding: '1px 6px', borderRadius: '8px'
        }}>
          {templates.length}
        </span>
      </button>

      {isOpen && (
        <div style={{
          marginTop: '12px',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          background: 'white',
          padding: '20px',
          boxShadow: 'var(--shadow-strong)'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>🚀 Mulai Cepat dengan Template</h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
              Pilih template di bawah untuk langsung mengisi matriks keputusan tanpa input manual.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {templates.map(t => (
              <div key={t.id} style={{
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                background: 'var(--canvas-bg)',
                transition: 'var(--transition)',
                cursor: 'pointer'
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-strong)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>{t.icon}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '800', fontSize: '13px' }}>{t.title}</span>
                  <span style={{
                    fontSize: '9px', fontWeight: '800', padding: '2px 6px',
                    borderRadius: '8px', background: t.badgeBg, color: t.badgeColor
                  }}>
                    {t.badge}
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4', fontWeight: '500' }}>
                  {t.description}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '10px', fontWeight: '800',
                    background: 'var(--accent-muted)', color: 'var(--accent-hover)',
                    padding: '2px 8px', borderRadius: '8px'
                  }}>
                    {t.method}
                  </span>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                    onClick={() => handleApply(t)}
                    disabled={loading === t.id}
                  >
                    {loading === t.id ? '...' : 'Gunakan'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickStartTemplates;
