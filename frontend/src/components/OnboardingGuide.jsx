import React from 'react';

const onboardingData = {
  1: {
    title: "🔍 Langkah 1: Tentukan Karakteristik Masalah",
    description: "Tulis judul analisis keputusan Anda, lalu jawab kuesioner singkat di bawah ini. Sistem kami akan merekomendasikan metode komputasi (SAW atau TOPSIS) yang paling cocok secara akademis untuk masalah Anda."
  },
  2: {
    title: "📋 Langkah 2: Matriks Keputusan & Kriteria",
    description: "Masukkan kriteria (atribut penilaian), bobot kepentingan kriteria, dan alternatif pilihan Anda. Anda bisa menginput data secara langsung (*inline editing*), mengunggah berkas CSV, atau menggunakan Dataset Laptop contoh untuk simulasi instan."
  },
  3: {
    title: "⚡ Langkah 3: Analisis Sensitivitas & What-If",
    description: "Gunakan slider untuk mensimulasikan perubahan bobot kriteria. Anda juga bisa mengedit performa alternatif di tabel matriks untuk melihat pergeseran peringkat secara asinkronus (<100ms) di grafik dual-method secara instan."
  },
  4: {
    title: "🏆 Langkah 4: Rekomendasi Keputusan Akhir",
    description: "Berikut rekomendasi keputusan terbaik. Unduh Laporan PDF Akademik yang lengkap untuk tugas kuliah Anda, atau mulai ulang analisis baru dari awal."
  }
};

const OnboardingGuide = ({ step }) => {
  const guide = onboardingData[step];
  if (!guide) return null;

  return (
    <div 
      className="card step-transition" 
      style={{ 
        padding: '16px 20px', 
        marginBottom: '20px', 
        background: 'linear-gradient(135deg, #FAF6F0 0%, #FAF0E6 100%)', 
        borderLeft: '4px solid var(--accent-primary)',
        boxShadow: '0 4px 12px rgba(211, 123, 85, 0.05)'
      }}
    >
      <h3 style={{ margin: 0, color: 'var(--accent-hover)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
        {guide.title}
      </h3>
      <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px', lineHeight: '1.5', fontWeight: '500' }}>
        {guide.description}
      </p>
    </div>
  );
};

export default OnboardingGuide;
