import React, { useState, useEffect, useRef } from 'react';
import Wizard from './components/Wizard';
import MatrixInputTable from './components/MatrixInputTable';
import AHPMatrixInput from './components/AHPMatrixInput';
import ResultsChart from './components/ResultsChart';
import SensitivitySlider from './components/SensitivitySlider';
import RadarChart from './components/RadarChart';
import OnboardingGuide from './components/OnboardingGuide';
import ToastContainer, { useToast } from './components/Toast';
import AnimatedNumber from './components/AnimatedNumber';
import SkeletonLoader from './components/SkeletonLoader';
import { solveSAWClient, solveTOPSISClient } from './utils/clientSolver';
import { calculateSpearman } from './utils/spearman';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function App() {
  const steps = [
    'Karakteristik Masalah',
    'Matriks & Kriteria',
    'Analisis Sensitivitas',
    'Hasil Akhir'
  ];

  // Toast Hook
  const { toasts, addToast, removeToast } = useToast();

  // 1. Core States
  const [projectId, setProjectId] = useState('');
  const [projectTitle, setProjectTitle] = useState('Analisis Keputusan Akademik');
  const [step, setStep] = useState(1);
  const [chosenMethod, setChosenMethod] = useState('TOPSIS');
  
  // Model Data
  const [criterias, setCriterias] = useState([
    { name: 'Kriteria 1', weight: 0.5, type: 'benefit' },
    { name: 'Kriteria 2', weight: 0.5, type: 'cost' }
  ]);
  const [alternatives, setAlternatives] = useState([
    { name: 'Alternatif 1' },
    { name: 'Alternatif 2' }
  ]);
  const [matrix, setMatrix] = useState([
    [0.0, 0.0],
    [0.0, 0.0]
  ]);

  // AHP overlay state
  const [showAHP, setShowAHP] = useState(false);
  
  // Computation states
  const [rankings, setRankings] = useState([]);
  const [sawRankings, setSawRankings] = useState([]); // Secondary ranking list for dual analysis
  const [spearman, setSpearman] = useState(null); // Spearman correlation results
  const [stabilityRates, setStabilityRates] = useState({}); // maps alt_name -> rate (%)
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Questionnaire States
  const [qAnswers, setQAnswers] = useState({
    pairwise: 'tidak',
    multipleTypes: 'ya',
    prefComplexity: 'sederhana'
  });
  const [recommendation, setRecommendation] = useState('');

  // Goal-Seeking states
  const [gsTargetAltId, setGsTargetAltId] = useState('');
  const [gsChangingCritId, setGsChangingCritId] = useState('');
  const [gsTargetRank, setGsTargetRank] = useState(1);
  const [gsBudgetLimit, setGsBudgetLimit] = useState('');
  const [gsResult, setGsResult] = useState(null);
  const [gsLoading, setGsLoading] = useState(false);

  // Confetti particles state for trophies
  const [confetti, setConfetti] = useState([]);

  // 2. State Retention & Auto-save (Every 5 seconds)
  const isInitialMount = useRef(true);

  // Load state from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('dss_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.projectId) setProjectId(parsed.projectId);
        if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
        if (parsed.step) setStep(parsed.step);
        if (parsed.chosenMethod) setChosenMethod(parsed.chosenMethod);
        if (parsed.criterias) setCriterias(parsed.criterias);
        if (parsed.alternatives) setAlternatives(parsed.alternatives);
        if (parsed.matrix) setMatrix(parsed.matrix);
        if (parsed.rankings) setRankings(parsed.rankings);
        if (parsed.sawRankings) setSawRankings(parsed.sawRankings);
        if (parsed.spearman) setSpearman(parsed.spearman);
        if (parsed.stabilityRates) setStabilityRates(parsed.stabilityRates);
        if (parsed.qAnswers) setQAnswers(parsed.qAnswers);
        if (parsed.recommendation) setRecommendation(parsed.recommendation);
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }
    isInitialMount.current = false;
  }, []);

  // Auto-save timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (isInitialMount.current) return;
      const stateToSave = {
        projectId,
        projectTitle,
        step,
        chosenMethod,
        criterias,
        alternatives,
        matrix,
        rankings,
        sawRankings,
        spearman,
        stabilityRates,
        qAnswers,
        recommendation
      };
      localStorage.setItem('dss_state', JSON.stringify(stateToSave));
    }, 5000);

    return () => clearInterval(interval);
  }, [projectId, projectTitle, step, chosenMethod, criterias, alternatives, matrix, rankings, sawRankings, spearman, stabilityRates, qAnswers, recommendation]);

  // Trigger confetti particles
  useEffect(() => {
    if (step === 4 && rankings.length > 0) {
      const colors = ['#D37B55', '#5A67D8', '#7A9D54', '#f39b75', '#A38E7A'];
      const particles = Array(45).fill(0).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 20 - 20,
        size: Math.random() * 8 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 2,
        duration: Math.random() * 2 + 2,
        rotation: Math.random() * 360
      }));
      setConfetti(particles);
    } else {
      setConfetti([]);
    }
  }, [step, rankings]);

  // 3. Recommendation engine whenever questionnaire responses change
  useEffect(() => {
    let rec = '';
    if (qAnswers.pairwise === 'ya') {
      rec = 'Metode yang Direkomendasikan: AHP (Analytic Hierarchy Process). Karena Anda membutuhkan pembobotan ilmiah menggunakan perbandingan berpasangan yang konsisten.';
      setChosenMethod('TOPSIS'); 
      setShowAHP(true);
    } else {
      setShowAHP(false);
      if (qAnswers.multipleTypes === 'ya') {
        rec = 'Metode yang Direkomendasikan: TOPSIS. Karena terdapat kriteria benefit dan cost, dan TOPSIS mengukur jarak geometris terdekat ke solusi ideal positif.';
        setChosenMethod('TOPSIS');
      } else {
        rec = 'Metode yang Direkomendasikan: SAW (Simple Additive Weighting). Karena masalah Anda sederhana dan seluruh kriteria dapat dinilai secara linear terbobot.';
        setChosenMethod('SAW');
      }
    }
    setRecommendation(rec);
  }, [qAnswers]);

  // Initialize Goal-Seeking variables when criterias/alternatives load
  useEffect(() => {
    if (alternatives.length > 0 && !gsTargetAltId) {
      setGsTargetAltId(alternatives[0].id || '');
    }
    if (criterias.length > 0 && !gsChangingCritId) {
      setGsChangingCritId(criterias[0].id || '');
    }
  }, [alternatives, criterias]);

  // 4. API Actions
  const initProjectInBackend = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/projects/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: projectTitle })
      });
      if (!res.ok) throw new Error('Gagal menginisialisasi proyek di backend.');
      const data = await res.json();
      setProjectId(data.id);
      return data.id;
    } catch (err) {
      setErrorMsg(err.message);
      addToast(err.message, 'error', 'Project Init Error');
      setLoading(false);
      return null;
    }
  };

  const loadLaptopDataset = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/projects/laptop/dataset-sample`);
      if (!res.ok) throw new Error('Gagal mengambil sampel dataset laptop dari backend.');
      const data = await res.json();
      
      setCriterias(data.criterias);
      setAlternatives(data.alternatives);
      setMatrix(data.matrix);
      
      // Auto-set IDs based on list
      setGsTargetAltId('');
      setGsChangingCritId('');
      addToast('Sampel Dataset Laptop berhasil dimuat!', 'success', 'Dataset Imported');
    } catch (err) {
      setErrorMsg(err.message);
      addToast(err.message, 'error', 'Import Error');
    } finally {
      setLoading(false);
    }
  };

  const handleImportCSVData = (csvData) => {
    const cols = csvData.columns;
    const rows = csvData.sample_rows;
    
    const tempCriterias = [];
    cols.forEach((col) => {
      const lowCol = col.toLowerCase();
      if (
        lowCol.includes('company') || 
        lowCol.includes('product') || 
        lowCol.includes('name') || 
        lowCol.includes('opsys') ||
        lowCol.includes('memory') ||
        lowCol.includes('resolution') ||
        lowCol.includes('cpu_company') ||
        lowCol.includes('cpu_type') ||
        lowCol.includes('gpu_company') ||
        lowCol.includes('gpu_type') ||
        lowCol.includes('typename')
      ) {
        return;
      }
      
      const testVal = parseFloat(rows[0]?.[col]);
      if (!isNaN(testVal)) {
        let type = 'benefit';
        if (lowCol.includes('price') || lowCol.includes('cost') || lowCol.includes('weight')) {
          type = 'cost';
        }
        tempCriterias.push({
          name: col,
          weight: 0.0,
          type: type
        });
      }
    });

    if (tempCriterias.length === 0) {
      setErrorMsg('Gagal mendeteksi kolom kriteria numerik pada berkas CSV ini.');
      addToast('Gagal mendeteksi kolom kriteria numerik.', 'error', 'CSV Parse Failed');
      return;
    }

    const share = 1.0 / tempCriterias.length;
    tempCriterias.forEach(c => c.weight = share);

    const companyCol = cols.find(c => c.toLowerCase().includes('company'));
    const productCol = cols.find(c => c.toLowerCase().includes('product'));
    const nameCol = cols.find(c => c.toLowerCase().includes('name') || c.toLowerCase().includes('title'));
    
    const tempAlts = [];
    const tempMatrix = [];
    
    const limit = Math.min(rows.length, 30);
    for (let i = 0; i < limit; i++) {
      let altName = '';
      if (companyCol && productCol) {
        altName = `${rows[i][companyCol]} ${rows[i][productCol]}`.replace(/"/g, '');
      } else if (nameCol) {
        altName = `${rows[i][nameCol]}`;
      } else {
        altName = `Alternatif ${i + 1}`;
      }
      
      tempAlts.push({ name: altName });
      
      const matrixRow = tempCriterias.map(c => {
        const val = parseFloat(rows[i][c.name]);
        return isNaN(val) ? 0.0 : val;
      });
      tempMatrix.push(matrixRow);
    }

    setCriterias(tempCriterias);
    setAlternatives(tempAlts);
    setMatrix(tempMatrix);
    setErrorMsg('');
    addToast(`Berhasil mengimpor ${tempAlts.length} alternatif dari CSV!`, 'success', 'Import Success');
  };

  // Triggers Monte Carlo and saves stability rates to state
  const runMonteCarloSimulation = async (activeId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/analytics/risk-monte`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: activeId,
          iterations: 1000,
          perturbation_percent: 0.05
        })
      });
      if (res.ok) {
        const data = await res.json();
        const ratesMap = {};
        data.stability_rates.forEach(item => {
          ratesMap[item.alternative_name] = item.stability_rate;
        });
        setStabilityRates(ratesMap);
      }
    } catch (e) {
      console.error("Failed to run Monte Carlo", e);
    }
  };

  const submitSetupAndCalculate = async () => {
    setLoading(true);
    setErrorMsg('');
    
    let activeId = projectId;
    if (!activeId) {
      activeId = await initProjectInBackend();
      if (!activeId) return;
    }

    // Normalize weights sum to exactly 1.0
    const totalW = criterias.reduce((sum, c) => sum + c.weight, 0);
    let correctedCriterias = [...criterias];
    if (Math.abs(totalW - 1.0) > 0.001) {
      if (totalW > 0) {
        correctedCriterias = criterias.map(c => ({ ...c, weight: c.weight / totalW }));
        setCriterias(correctedCriterias);
      } else {
        const share = 1.0 / criterias.length;
        correctedCriterias = criterias.map(c => ({ ...c, weight: share }));
        setCriterias(correctedCriterias);
      }
    }

    try {
      // 1. Call Setup Endpoint
      const setupRes = await fetch(`${BACKEND_URL}/api/v1/projects/${activeId}/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criterias: correctedCriterias,
          alternatives,
          matrix,
          chosen_method: chosenMethod
        })
      });
      
      if (!setupRes.ok) {
        const err = await setupRes.json();
        throw new Error(err.detail || 'Gagal menyimpan konfigurasi matriks keputusan.');
      }

      // Re-fetch project details to make sure database generated alternative/criteria IDs
      const projRes = await fetch(`${BACKEND_URL}/api/v1/projects/${activeId}`);
      if (projRes.ok) {
        const projData = await projRes.json();
        setCriterias(projData.criterias);
        setAlternatives(projData.alternatives);
        
        // Auto-seed Goal-Seeking selections
        if (projData.alternatives.length > 0) setGsTargetAltId(projData.alternatives[0].id);
        if (projData.criterias.length > 0) setGsChangingCritId(projData.criterias[0].id);
      }
      
      // Calculate dual rankings (both TOPSIS and SAW)
      const critTypes = correctedCriterias.map(c => c.type);
      const currentWeights = correctedCriterias.map(c => c.weight);
      
      const topsisRes = solveTOPSISClient(matrix, currentWeights, critTypes);
      const sawRes = solveSAWClient(matrix, currentWeights, critTypes);

      const computedTopsisRankings = alternatives.map((alt, idx) => ({
        id: alt.id || `alt-${idx}`,
        name: alt.name,
        score: topsisRes.scores[idx]
      })).sort((a, b) => b.score - a.score).map((item, idx) => ({ ...item, rank: idx + 1 }));

      const computedSawRankings = alternatives.map((alt, idx) => ({
        id: alt.id || `alt-${idx}`,
        name: alt.name,
        score: sawRes.scores[idx]
      })).sort((a, b) => b.score - a.score).map((item, idx) => ({ ...item, rank: idx + 1 }));

      setRankings(computedTopsisRankings);
      setSawRankings(computedSawRankings);
      
      // Compute Spearman Correlation
      const spearmanResult = calculateSpearman(computedTopsisRankings, computedSawRankings);
      setSpearman(spearmanResult);

      // 3. Trigger Risk Monte Carlo simulation
      await runMonteCarloSimulation(activeId);

      addToast('Perhitungan MCDM & Analisis Komparasi Dual-Metode Selesai!', 'success', 'Computation Success');
      setStep(3);
    } catch (err) {
      setErrorMsg(err.message);
      addToast(err.message, 'error', 'Calculation Error');
    } finally {
      setLoading(false);
    }
  };

  // Run Goal seeking via backend numerical Bisection solver with Multi-Constraint Budget checks
  const handleRunGoalSeeking = async () => {
    if (!projectId || !gsTargetAltId || !gsChangingCritId) return;
    setGsLoading(true);
    setGsResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/analytics/goal-seek`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          target_alternative_id: gsTargetAltId,
          changing_criteria_id: gsChangingCritId,
          target_rank: parseInt(gsTargetRank)
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Gagal memproses Goal Seeking.");
      }
      const data = await res.json();
      
      // Apply budget constraint check client-side if success
      if (data.success && data.target_value !== null && gsBudgetLimit) {
        const selectedCrit = criterias.find(c => c.id === gsChangingCritId);
        const limitVal = parseFloat(gsBudgetLimit);
        
        if (selectedCrit && selectedCrit.type === 'cost' && data.target_value > limitVal) {
          // If suggested cost is higher than budget, solver fails constraints
          setGsResult({
            success: false,
            message: `Solver dibatalkan: Batas nilai kriteria '${selectedCrit.name}' (${data.target_value.toFixed(2)}) melampaui batasan anggaran maksimum yang Anda tetapkan (${limitVal.toFixed(2)}).`
          });
          addToast('Nilai solusi melampaui batasan anggaran!', 'error', 'Constraint Violated');
          return;
        }
      }

      setGsResult(data);
      if (data.success) {
        addToast('Goal-Seek Solver menemukan solusi optimal!', 'success', 'Solver Solution Found');
      } else {
        addToast('Goal-Seek Solver tidak dapat menemukan solusi batas kriteria.', 'error', 'No Solver Solution');
      }
    } catch (err) {
      addToast(err.message, 'error', 'Goal Seeking Error');
    } finally {
      setGsLoading(false);
    }
  };

  // What-If live solver callback. Recalculates scores and rankings client-side
  const handleWeightChange = (newWeights) => {
    const nextCriterias = criterias.map((c, idx) => ({ ...c, weight: newWeights[idx] }));
    setCriterias(nextCriterias);
    recalculateRankings(matrix, newWeights);
  };

  // Inline-editing what-if matrix callback
  const handleMatrixCellEdit = (rowIdx, colIdx, newVal) => {
    setMatrix(prev => {
      const copy = prev.map(row => [...row]);
      copy[rowIdx][colIdx] = newVal;
      
      // Recalculate client-side instantly for live What-If
      const currentWeights = criterias.map(c => c.weight);
      recalculateRankings(copy, currentWeights);
      
      return copy;
    });
  };

  // Generic recalculation helper for dual algorithms
  const recalculateRankings = (currentMatrix, currentWeights) => {
    const critTypes = criterias.map(c => c.type);
    
    const topsisRes = solveTOPSISClient(currentMatrix, currentWeights, critTypes);
    const sawRes = solveSAWClient(currentMatrix, currentWeights, critTypes);
    
    const computedTopsisRankings = alternatives.map((alt, idx) => ({
      id: alt.id || `alt-${idx}`,
      name: alt.name,
      score: topsisRes.scores[idx]
    })).sort((a, b) => b.score - a.score).map((item, idx) => ({ ...item, rank: idx + 1 }));

    const computedSawRankings = alternatives.map((alt, idx) => ({
      id: alt.id || `alt-${idx}`,
      name: alt.name,
      score: sawRes.scores[idx]
    })).sort((a, b) => b.score - a.score).map((item, idx) => ({ ...item, rank: idx + 1 }));
    
    setRankings(computedTopsisRankings);
    setSawRankings(computedSawRankings);
    
    const spearmanResult = calculateSpearman(computedTopsisRankings, computedSawRankings);
    setSpearman(spearmanResult);
  };

  const handleDownloadReport = () => {
    if (!projectId) return;
    window.open(`${BACKEND_URL}/api/v1/projects/${projectId}/report`);
    addToast('Laporan PDF Sedang Di-generate...', 'info', 'Exporting PDF');
  };

  const resetAll = () => {
    localStorage.removeItem('dss_state');
    setProjectId('');
    setProjectTitle('Analisis Keputusan Akademik');
    setStep(1);
    setChosenMethod('TOPSIS');
    setCriterias([
      { name: 'Kriteria 1', weight: 0.5, type: 'benefit' },
      { name: 'Kriteria 2', weight: 0.5, type: 'cost' }
    ]);
    setAlternatives([
      { name: 'Alternatif 1' },
      { name: 'Alternatif 2' }
    ]);
    setMatrix([
      [0.0, 0.0],
      [0.0, 0.0]
    ]);
    setRankings([]);
    setSawRankings([]);
    setSpearman(null);
    setStabilityRates({});
    setGsResult(null);
    setErrorMsg('');
    setShowAHP(false);
    setQAnswers({
      pairwise: 'tidak',
      multipleTypes: 'ya',
      prefComplexity: 'sederhana'
    });
    addToast('Seluruh konfigurasi dasbor berhasil di-reset.', 'info', 'System Reset');
  };

  return (
    <div className="app-container">
      {/* Toast Notifications System */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <header>
        <div>
          <h1>Dashboard Sistem Pendukung Keputusan</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: '600' }}>
            Mata Kuliah: Teori Pengambilan Keputusan (TPK) – Advanced Corporate Analytics Edition
          </p>
        </div>
        <div className="meta">
          ⚡ Komparasi Spearman & Optimasi Solver
        </div>
      </header>

      {/* Progress Wizard */}
      <Wizard 
        currentStep={step} 
        steps={steps} 
        onStepClick={(stepNum) => setStep(stepNum)}
      />

      {/* Onboarding Guide banner */}
      <OnboardingGuide step={step} />

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <SkeletonLoader type="card" />
          <SkeletonLoader type="table" />
        </div>
      )}

      {!loading && (
        <div>
          {/* STEP 1: Karakteristik Masalah */}
          {step === 1 && (
            <div className="card step-transition">
              <h2>Kuesioner Karakteristik Masalah</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontWeight: '500' }}>
                Jawablah pertanyaan di bawah ini untuk membantu sistem merekomendasikan metode komputasi MCDM yang paling sesuai untuk kasus pengerjaan Anda.
              </p>

              <div className="form-group">
                <label>Judul Proyek Analisis Keputusan:</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={projectTitle} 
                  onChange={(e) => setProjectTitle(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label>1. Apakah Anda ingin menentukan bobot prioritas kriteria secara ilmiah menggunakan perbandingan berpasangan (Pairwise)?</label>
                <select 
                  className="form-control"
                  value={qAnswers.pairwise}
                  onChange={(e) => setQAnswers(prev => ({ ...prev, pairwise: e.target.value }))}
                >
                  <option value="ya">Ya (Sistem akan mengaktifkan pembobotan AHP)</option>
                  <option value="tidak">Tidak (Pembobotan diinput manual / sama rata)</option>
                </select>
              </div>

              <div className="form-group">
                <label>2. Apakah kriteria keputusan Anda bertipe majemuk (terdiri atas Benefit dan Cost)?</label>
                <select 
                  className="form-control"
                  value={qAnswers.multipleTypes}
                  onChange={(e) => setQAnswers(prev => ({ ...prev, multipleTypes: e.target.value }))}
                >
                  <option value="ya">Ya (Kriteria terdiri dari keuntungan dan pengeluaran/harga)</option>
                  <option value="tidak">Tidak (Hanya salah satu saja)</option>
                </select>
              </div>

              <div className="alert alert-info" style={{ marginTop: '24px', borderLeft: '4px solid var(--accent-primary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>💡 Rekomendasi Sistem:</strong>
                <p style={{ marginTop: '6px', fontSize: '13px', fontWeight: '600', lineHeight: '1.5' }}>{recommendation}</p>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', gap: '16px' }}>
                <div style={{ flexGrow: 1 }}>
                  <label style={{ fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    Metode Perhitungan Utama:
                  </label>
                  <select
                    className="form-control"
                    value={chosenMethod}
                    onChange={(e) => setChosenMethod(e.target.value)}
                  >
                    <option value="TOPSIS">TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution)</option>
                    <option value="SAW">SAW (Simple Additive Weighting)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '32px', textAlign: 'right' }}>
                <button className="btn btn-primary" onClick={() => setStep(2)}>
                  Lanjut ke Matriks Keputusan ➔
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Matriks & Kriteria */}
          {step === 2 && (
            <div className="card step-transition">
              <h2>Matriks Keputusan & Pembobotan</h2>
              
              {showAHP && (
                <div className="card" style={{ backgroundColor: 'var(--canvas-bg)', padding: '24px', marginBottom: '32px', border: '1px solid var(--accent-muted)' }}>
                  <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span>⚖ Pembobotan Berdasarkan Perbandingan Berpasangan (AHP)</span>
                    <span className="badge badge-benefit">AHP Mode Aktif</span>
                  </h3>
                  <AHPMatrixInput 
                    criteria={criterias} 
                    onSave={(weights) => {
                      setCriterias(prev => prev.map((c, idx) => ({ ...c, weight: weights[idx] })));
                      setShowAHP(false); 
                      addToast('Bobot kriteria AHP berhasil diselaraskan!', 'success', 'Weights Updated');
                    }}
                  />
                </div>
              )}

              <MatrixInputTable
                criterias={criterias}
                setCriterias={setCriterias}
                alternatives={alternatives}
                setAlternatives={setAlternatives}
                matrix={matrix}
                setMatrix={setMatrix}
                onLoadLaptopDataset={loadLaptopDataset}
                onImportCSV={handleImportCSVData}
              />

              <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)}>
                  ⇠ Kembali
                </button>
                <div style={{ display: 'flex', gap: '12px', width: 'auto' }}>
                  {!showAHP && qAnswers.pairwise === 'ya' && (
                    <button className="btn btn-secondary" onClick={() => setShowAHP(true)}>
                      Sesuaikan Bobot AHP
                    </button>
                  )}
                  <button className="btn btn-primary" onClick={submitSetupAndCalculate}>
                    Lakukan Perhitungan Komputasi ➔
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Analisis Sensitivitas & Dasbor Analitik */}
          {step === 3 && (
            <div className="card step-transition">
              <h2>Analisis Sensitivitas & What-If Dashboard</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontWeight: '500' }}>
                Metode utama: <strong style={{ color: 'var(--accent-primary)' }}>{chosenMethod}</strong>. Modifikasi slider bobot di bawah atau ubah performa data matriks keputusan secara langsung untuk melihat pergeseran peringkat secara asinkronus (&lt; 100ms).
              </p>

              <div className="grid-2" style={{ alignItems: 'start' }}>
                {/* LEFT COLUMN: CONTROLS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Slider Bobot */}
                  <div className="card" style={{ padding: '24px', marginBottom: 0 }}>
                    <h3 style={{ marginBottom: '16px' }}>⚙ Manipulasi Slider Bobot</h3>
                    <SensitivitySlider 
                      criterias={criterias}
                      onChange={handleWeightChange}
                    />
                  </div>

                  {/* Inline What-If Decision Matrix */}
                  <div className="card" style={{ padding: '24px', marginBottom: 0 }}>
                    <h3 style={{ marginBottom: '12px' }}>📊 Live What-If Matrix Sheet</h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '600' }}>
                      Edit nilai di bawah ini secara langsung untuk simulasi What-If.
                    </p>
                    <div className="table-responsive" style={{ maxHeight: '300px' }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Alternatif</th>
                            {criterias.map((crit, idx) => (
                              <th key={idx} style={{ textAlign: 'center', fontSize: '11px' }}>{crit.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {alternatives.map((alt, altIdx) => (
                            <tr key={altIdx}>
                              <td style={{ fontWeight: '700', fontSize: '12px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {alt.name}
                              </td>
                              {criterias.map((crit, critIdx) => (
                                <td key={critIdx} style={{ padding: '4px' }}>
                                  <input
                                    type="number"
                                    step="any"
                                    className="inline-edit-input"
                                    style={{ fontSize: '12px', padding: '4px' }}
                                    value={matrix[altIdx]?.[critIdx] || 0}
                                    onChange={(e) => handleMatrixCellEdit(altIdx, critIdx, parseFloat(e.target.value) || 0)}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: CHARTS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Peringkat Bar Chart */}
                  <div className="card" style={{ padding: '24px', marginBottom: 0 }}>
                    <h3 style={{ marginBottom: '16px' }}>🏆 Komparasi Peringkat Dual-Metode</h3>
                    <ResultsChart 
                      rankings={rankings} 
                      stabilityRates={stabilityRates} 
                      showDual={true} 
                      sawRankings={sawRankings} 
                      spearman={spearman} 
                    />
                  </div>

                  {/* Custom Radar Spider Chart */}
                  <div className="card" style={{ padding: '24px', marginBottom: 0 }}>
                    <h3 style={{ marginBottom: '12px' }}>🕸 Visualisasi Radar Jaring Laba-Laba</h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '600' }}>
                      Membandingkan anatomi kekuatan multidimensi laptop 3 besar.
                    </p>
                    <RadarChart 
                      criterias={criterias}
                      alternatives={alternatives}
                      matrix={matrix}
                      rankings={rankings}
                    />
                  </div>
                </div>
              </div>

              {/* Goal-Seeking Solver Modal/Card */}
              <div className="card" style={{ marginTop: '24px', padding: '28px', backgroundColor: '#FAF6F0', borderColor: '#EADCD3' }}>
                <h3 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🎯 Goal-Seek Solver (Bisection Optimizer)
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px', fontWeight: '600' }}>
                  Gunakan matematika optimasi untuk mencari berapa batas nilai input kriteria yang harus dipenuhi oleh laptop target agar bisa menembus Peringkat Juara.
                </p>

                {/* Natural Language UI for Awam User onboarding */}
                <div style={{ 
                  backgroundColor: '#FFF', 
                  padding: '16px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-color)',
                  marginBottom: '20px',
                  fontSize: '13.5px',
                  lineHeight: '2.0',
                  color: 'var(--text-primary)'
                }}>
                  Saya ingin alternatif{' '}
                  <select 
                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontWeight: 'bold' }}
                    value={gsTargetAltId}
                    onChange={(e) => setGsTargetAltId(e.target.value)}
                  >
                    {alternatives.map(alt => (
                      <option key={alt.id} value={alt.id}>{alt.name}</option>
                    ))}
                  </select>
                  {' '}mencapai peringkat target{' '}
                  <input 
                    type="number"
                    min="1"
                    max={alternatives.length}
                    style={{ width: '60px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontWeight: 'bold', textAlign: 'center' }}
                    value={gsTargetRank}
                    onChange={(e) => setGsTargetRank(e.target.value)}
                  />
                  {' '}dengan mengubah nilai kriteria{' '}
                  <select 
                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontWeight: 'bold' }}
                    value={gsChangingCritId}
                    onChange={(e) => setGsChangingCritId(e.target.value)}
                  >
                    {criterias.map(crit => (
                      <option key={crit.id} value={crit.id}>{crit.name}</option>
                    ))}
                  </select>
                  {criterias.find(c => c.id === gsChangingCritId)?.type === 'cost' && (
                    <>
                      {' '}dengan batasan anggaran maksimum senilai{' '}
                      <input 
                        type="number"
                        placeholder="Tanpa batasan"
                        style={{ width: '130px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontWeight: 'bold' }}
                        value={gsBudgetLimit}
                        onChange={(e) => setGsBudgetLimit(e.target.value)}
                      />
                    </>
                  )}
                  .
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    style={{ background: 'linear-gradient(135deg, #5A67D8, #434190)', boxShadow: '0 4px 12px rgba(90, 103, 216, 0.2)' }}
                    onClick={handleRunGoalSeeking}
                    disabled={gsLoading}
                  >
                    {gsLoading ? 'Mencari Solusi...' : 'Jalankan Goal-Seek Solver'}
                  </button>
                </div>

                {gsResult && (
                  <div 
                    className={`alert ${gsResult.success ? 'alert-info' : 'alert-danger'}`} 
                    style={{ marginTop: '20px', padding: '16px', marginBottom: 0, borderLeft: '4px solid transparent' }}
                  >
                    <strong>Hasil Solver:</strong>
                    <p style={{ marginTop: '6px', fontSize: '13px', fontWeight: '600' }}>
                      {gsResult.message}
                    </p>
                    {gsResult.success && gsResult.target_value !== null && (
                      <div style={{ marginTop: '10px', fontSize: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                        <div>Nilai Awal {gsResult.criteria_name} ({gsResult.alternative_name}): <strong>{gsResult.current_value.toFixed(4)}</strong></div>
                        <div style={{ fontSize: '14px', marginTop: '4px', fontWeight: '800' }}>
                          Nilai Batas Target: <span style={{ color: 'var(--accent-primary)' }}>{gsResult.target_value.toFixed(4)}</span> 
                          {' '}(Harus lebih {gsResult.direction === 'higher' ? 'tinggi (Benefit)' : 'rendah (Cost)'} dari nilai ini).
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="alert alert-danger" style={{ marginTop: '20px' }}>
                  {errorMsg}
                </div>
              )}

              <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={() => setStep(2)}>
                  ⇠ Edit Matriks
                </button>
                <button className="btn btn-primary" onClick={() => setStep(4)}>
                  Lihat Ringkasan Hasil ➔
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Hasil Akhir & Ekspor */}
          {step === 4 && (
            <div className="card step-transition" style={{ textAlign: 'center', padding: '48px', position: 'relative' }}>
              {/* Confetti Render */}
              <div className="confetti-container">
                {confetti.map(p => (
                  <div 
                    key={p.id}
                    style={{
                      position: 'absolute',
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      width: `${p.size}px`,
                      height: `${p.size}px`,
                      backgroundColor: p.color,
                      transform: `rotate(${p.rotation}deg)`,
                      borderRadius: Math.random() > 0.5 ? '50%' : '3px',
                      opacity: 0.8,
                      animation: `fall ${p.duration}s linear ${p.delay}s infinite`
                    }}
                  />
                ))}
                <style>{`
                  @keyframes fall {
                    0% { top: -20px; transform: rotate(0deg) translateX(0); }
                    50% { transform: rotate(180deg) translateX(15px); }
                    100% { top: 100%; transform: rotate(360deg) translateX(-15px); }
                  }
                `}</style>
              </div>

              <div style={{ fontSize: '56px', marginBottom: '20px' }}>🏆</div>
              <h2 style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '8px' }}>Rekomendasi Keputusan Terbaik</h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 32px', fontWeight: '600' }}>
                Berdasarkan perhitungan menggunakan metode <strong>{chosenMethod}</strong> dengan bobot kriteria akhir yang disesuaikan, berikut adalah pilihan terbaik:
              </p>

              {rankings.length > 0 && (
                <div 
                  className="card" 
                  style={{ 
                    maxWidth: '500px', 
                    margin: '0 auto 32px', 
                    padding: '32px', 
                    backgroundColor: '#faf8f5',
                    border: '2px solid var(--accent-primary)',
                    boxShadow: '0 12px 30px rgba(211, 123, 85, 0.12)'
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Alternatif Terbaik (Peringkat 1)
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '800', margin: '12px 0', color: 'var(--text-primary)' }}>
                    {rankings[0].name}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '500' }}>
                    Skor Preferensi Kedekatan:{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>
                      <AnimatedNumber value={rankings[0].score} decimals={4} />
                    </strong>
                  </div>
                  
                  {stabilityRates[rankings[0].name] !== undefined && (
                    <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--success)', backgroundColor: '#e6f2da', display: 'inline-block', padding: '6px 14px', borderRadius: '20px', marginTop: '6px', boxShadow: '0 2px 6px rgba(122,157,84,0.1)' }}>
                      ⚡ <AnimatedNumber value={stabilityRates[rankings[0].name]} decimals={1} />% Stability Rate
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '40px', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={handleDownloadReport}>
                  📄 Unduh Laporan PDF Akademik
                </button>
                <button className="btn btn-secondary" onClick={resetAll}>
                  Mulai Ulang Analisis
                </button>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '32px', maxWidth: '700px', margin: '0 auto' }}>
                <h4 style={{ marginBottom: '16px', fontSize: '16px' }}>Rincian Peringkat Lengkap & Stabilitas Risiko</h4>
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '100px', textAlign: 'center' }}>Peringkat</th>
                        <th>Nama Alternatif</th>
                        <th style={{ width: '140px', textAlign: 'center' }}>Skor Akhir</th>
                        <th style={{ width: '160px', textAlign: 'center' }}>Stability Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankings.map(r => (
                        <tr key={r.id}>
                          <td style={{ textAlign: 'center', fontWeight: r.rank === 1 ? '800' : '700' }}>
                            {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank}
                          </td>
                          <td style={{ fontWeight: r.rank === 1 ? '800' : '600' }}>
                            {r.name}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: '700' }}>
                            <AnimatedNumber value={r.score} decimals={4} />
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--success)' }}>
                            {stabilityRates[r.name] !== undefined ? (
                              <span>⚡ <AnimatedNumber value={stabilityRates[r.name]} decimals={1} />%</span>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
