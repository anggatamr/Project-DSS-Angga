import React, { useState } from 'react';
import MLDataProfiler from './MLDataProfiler';
import MLTrainer from './MLTrainer';
import MLFeatureImportance from './MLFeatureImportance';
import MLIntegratedResults from './MLIntegratedResults';
import MLSensitivityChart from './MLSensitivityChart';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * MLEnginePanel — Full ML workflow panel embedded in the DSS app.
 * Props:
 *   criterias: current DSS criteria array
 *   alternatives: current DSS alternatives array
 *   matrix: current DSS decision matrix
 *   chosenMethod: 'TOPSIS' | 'SAW'
 *   addToast: fn
 */
const MLEnginePanel = ({ criterias, alternatives, matrix, chosenMethod, addToast }) => {
  // ML workflow state
  const [mlStep, setMlStep] = useState(1); // 1=profile, 2=train, 3=solve, 4=sensitivity
  const [profile, setProfile] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [trainingReport, setTrainingReport] = useState(null);
  const [integratedResult, setIntegratedResult] = useState(null);
  const [sensitivityData, setSensitivityData] = useState(null);
  const [sensitivityCriterion, setSensitivityCriterion] = useState('');
  const [mlWeight, setMlWeight] = useState(0.20);
  const [solveLoading, setSolveLoading] = useState(false);
  const [sensLoading, setSensLoading] = useState(false);
  const [varyCritIdx, setVaryCritIdx] = useState(0);

  const mlSteps = ['1. Profil Data', '2. Latih Model', '3. Solve Terintegrasi', '4. Sensitivitas ML'];

  const handleProfileComplete = (prof, file) => {
    setProfile(prof);
    setUploadedFile(file);
    setMlStep(2);
  };

  const handleTrainingComplete = (report) => {
    setTrainingReport(report);
    setMlStep(3);
  };

  const handleIntegratedSolve = async () => {
    if (!trainingReport?.model_id) {
      addToast('Latih model terlebih dahulu.', 'error', 'ML Error');
      return;
    }
    if (!alternatives || alternatives.length === 0) {
      addToast('Tambahkan alternatif di Langkah 2 terlebih dahulu.', 'error', 'ML Error');
      return;
    }

    setSolveLoading(true);
    setIntegratedResult(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/ml/integrated-solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: trainingReport.model_id,
          matrix: matrix,
          weights: criterias.map(c => c.weight),
          criteria_types: criterias.map(c => c.type),
          criteria_names: criterias.map(c => c.name),
          alternative_names: alternatives.map(a => a.name),
          method: chosenMethod,
          use_ml_prediction: true,
          ml_weight: mlWeight,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Gagal menjalankan integrated solve.');
      }
      const data = await res.json();
      setIntegratedResult(data.result);
      addToast('Integrated MCDM+ML solve selesai!', 'success', 'ML Solve');
    } catch (err) {
      addToast(err.message, 'error', 'ML Solve Error');
    } finally {
      setSolveLoading(false);
    }
  };

  const handleSensitivity = async () => {
    if (!trainingReport?.model_id) return;
    setSensLoading(true);
    setSensitivityData(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/ml/sensitivity-with-ml`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: trainingReport.model_id,
          matrix: matrix,
          weights: criterias.map(c => c.weight),
          criteria_types: criterias.map(c => c.type),
          criteria_names: criterias.map(c => c.name),
          alternative_names: alternatives.map(a => a.name),
          vary_criterion_idx: varyCritIdx,
          method: chosenMethod,
          steps: 10,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Gagal menjalankan sensitivity analysis.');
      }
      const data = await res.json();
      setSensitivityData(data.sensitivity_data);
      setSensitivityCriterion(criterias[varyCritIdx]?.name || '');
      addToast('Sensitivity analysis dengan ML selesai!', 'success', 'ML Sensitivity');
    } catch (err) {
      addToast(err.message, 'error', 'Sensitivity Error');
    } finally {
      setSensLoading(false);
    }
  };

  return (
    <div>
      {/* ML Step navigator */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
        {mlSteps.map((label, i) => {
          const stepNum = i + 1;
          const isActive = mlStep === stepNum;
          const isDone = mlStep > stepNum;
          return (
            <button
              key={i}
              onClick={() => stepNum <= mlStep && setMlStep(stepNum)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${isActive ? 'var(--accent-primary)' : isDone ? '#68d391' : 'var(--border-color)'}`,
                background: isActive ? 'var(--accent-muted)' : isDone ? '#f0fff4' : 'var(--card-bg)',
                color: isActive ? 'var(--accent-hover)' : isDone ? '#276749' : 'var(--text-secondary)',
                fontWeight: '700',
                fontSize: '12px',
                cursor: stepNum <= mlStep ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
                transition: 'var(--transition)',
              }}
            >
              {isDone ? '✓ ' : ''}{label}
            </button>
          );
        })}
      </div>

      {/* STEP 1: Data Profiling */}
      {mlStep === 1 && (
        <div>
          <h3 style={{ marginBottom: '8px', fontSize: '15px' }}>📂 Langkah 1: Upload & Profil Dataset</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', fontWeight: '500' }}>
            Upload dataset CSV/Excel apapun. Sistem akan otomatis mendeteksi tipe data, peran kolom, kualitas data, dan merekomendasikan model ML yang tepat.
          </p>
          <MLDataProfiler onProfileComplete={handleProfileComplete} addToast={addToast} />
        </div>
      )}

      {/* STEP 2: Training */}
      {mlStep === 2 && (
        <div>
          <h3 style={{ marginBottom: '8px', fontSize: '15px' }}>🚀 Langkah 2: Latih Model ML</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', fontWeight: '500' }}>
            Pilih kolom target dan sistem akan melatih beberapa model secara otomatis, lalu memilih yang terbaik.
          </p>
          <MLTrainer
            profile={profile}
            uploadedFile={uploadedFile}
            onTrainingComplete={handleTrainingComplete}
            addToast={addToast}
          />
          {trainingReport && (
            <div style={{ marginTop: '16px' }}>
              <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>📊 Feature Importance</h3>
              <MLFeatureImportance
                featureImportance={trainingReport.feature_importance}
                taskType={trainingReport.task_type}
              />
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Integrated Solve */}
      {mlStep === 3 && (
        <div>
          <h3 style={{ marginBottom: '8px', fontSize: '15px' }}>⚡ Langkah 3: MCDM + ML Terintegrasi</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', fontWeight: '500' }}>
            Gabungkan prediksi ML dengan metode {chosenMethod} untuk menghasilkan peringkat yang lebih akurat dan dapat dijelaskan.
          </p>

          {/* Model info */}
          {trainingReport && (
            <div style={{ background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#276749' }}>🤖 Model aktif: </span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#276749' }}>
                  {(trainingReport.best_model || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                <span style={{ fontSize: '11px', color: '#276749', marginLeft: '8px' }}>
                  (Target: {trainingReport.target_column})
                </span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '700', background: '#276749', color: 'white', padding: '2px 8px', borderRadius: '8px' }}>
                ID: {trainingReport.model_id}
              </span>
            </div>
          )}

          {/* ML weight slider */}
          <div style={{ background: 'var(--canvas-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: '700', fontSize: '13px' }}>Bobot Prediksi ML dalam Peringkat Akhir</span>
              <span style={{ fontWeight: '800', color: 'var(--accent-primary)' }}>{(mlWeight * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range" min="5" max="40" step="5"
              value={mlWeight * 100}
              className="slider-input"
              onChange={e => setMlWeight(parseInt(e.target.value) / 100)}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Sisa {(100 - mlWeight * 100).toFixed(0)}% dibagi proporsional ke kriteria MCDM yang ada.
            </div>
          </div>

          {/* DSS data summary */}
          <div style={{ background: 'var(--canvas-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '16px', fontSize: '12px' }}>
            <span style={{ fontWeight: '700' }}>Data DSS saat ini: </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {alternatives?.length || 0} alternatif · {criterias?.length || 0} kriteria · Metode: {chosenMethod}
            </span>
            {(!alternatives || alternatives.length === 0) && (
              <div style={{ color: '#c53030', fontWeight: '700', marginTop: '4px' }}>
                ⚠️ Belum ada alternatif. Isi matriks keputusan di Langkah 2 terlebih dahulu.
              </div>
            )}
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', background: 'linear-gradient(135deg, #5A67D8, #434190)', boxShadow: '0 4px 12px rgba(90,103,216,0.2)' }}
            onClick={handleIntegratedSolve}
            disabled={solveLoading || !alternatives || alternatives.length === 0}
          >
            {solveLoading ? '⏳ Menghitung...' : '🧠 Jalankan MCDM + ML Integrated Solve'}
          </button>

          {integratedResult && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>🏆 Hasil Peringkat Terintegrasi</h3>
              <MLIntegratedResults result={integratedResult} method={chosenMethod} />

              {/* Feature importance */}
              {integratedResult.feature_importance && Object.keys(integratedResult.feature_importance).length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>📊 Feature Importance (Faktor Penentu)</h3>
                  <MLFeatureImportance
                    featureImportance={integratedResult.feature_importance}
                    taskType={trainingReport?.task_type || 'regression'}
                  />
                </div>
              )}

              <button
                className="btn btn-secondary"
                style={{ marginTop: '16px' }}
                onClick={() => setMlStep(4)}
              >
                Lanjut ke Sensitivity Analysis ML ➔
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: Sensitivity with ML */}
      {mlStep === 4 && (
        <div>
          <h3 style={{ marginBottom: '8px', fontSize: '15px' }}>📈 Langkah 4: Sensitivity Analysis + ML Confidence</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', fontWeight: '500' }}>
            Lihat bagaimana peringkat berubah saat bobot satu kriteria diubah, dilengkapi dengan batas kepercayaan dari model ML.
          </p>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ flexGrow: 1 }}>
              <label style={{ fontWeight: '700', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                Kriteria yang divariasikan:
              </label>
              <select
                className="form-control"
                value={varyCritIdx}
                onChange={e => setVaryCritIdx(parseInt(e.target.value))}
              >
                {criterias.map((c, i) => (
                  <option key={i} value={i}>{c.name} ({c.type})</option>
                ))}
              </select>
            </div>
            <button
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #5A67D8, #434190)', whiteSpace: 'nowrap' }}
              onClick={handleSensitivity}
              disabled={sensLoading}
            >
              {sensLoading ? '⏳ Menghitung...' : '📈 Jalankan Analisis'}
            </button>
          </div>

          {sensitivityData && (
            <div style={{ marginTop: '8px' }}>
              <MLSensitivityChart data={sensitivityData} variedCriterion={sensitivityCriterion} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MLEnginePanel;
