import React, { useState, useEffect } from 'react';

const RI = {
  1: 0.00,
  2: 0.00,
  3: 0.58,
  4: 0.90,
  5: 1.12,
  6: 1.24,
  7: 1.32,
  8: 1.41,
  9: 1.45,
  10: 1.49
};

const AHPMatrixInput = ({ criteria, onSave }) => {
  const n = criteria.length;
  
  // Initialize matrix with 1s
  const [matrix, setMatrix] = useState(() => {
    const initial = Array(n).fill(0).map(() => Array(n).fill(1.0));
    return initial;
  });
  
  const [results, setResults] = useState({
    weights: Array(n).fill(1/n),
    lambdaMax: n,
    ci: 0.0,
    cr: 0.0,
    isConsistent: true
  });

  // Recalculate weights & CR whenever matrix changes
  useEffect(() => {
    if (n === 0) return;
    if (n === 1) {
      setResults({
        weights: [1.0],
        lambdaMax: 1.0,
        ci: 0.0,
        cr: 0.0,
        isConsistent: true
      });
      return;
    }

    try {
      // 1. Column sums
      const colSums = Array(n).fill(0);
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          colSums[j] += matrix[i][j];
        }
      }

      // 2. Normalize and row averages (weights)
      const weights = Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) {
          sum += matrix[i][j] / colSums[j];
        }
        weights[i] = sum / n;
      }

      // 3. Lambda Max
      const weightedSum = Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          weightedSum[i] += matrix[i][j] * weights[j];
        }
      }

      let lambdaSum = 0;
      for (let i = 0; i < n; i++) {
        lambdaSum += weightedSum[i] / (weights[i] || 1e-9);
      }
      const lambdaMax = lambdaSum / n;

      // 4. CI & CR
      const ci = (lambdaMax - n) / (n - 1);
      const ri = RI[n] || 1.49;
      const cr = ri === 0 ? 0.0 : ci / ri;
      const isConsistent = cr <= 0.1;

      setResults({
        weights,
        lambdaMax,
        ci,
        cr,
        isConsistent
      });
    } catch (err) {
      console.error("Error calculating AHP weights", err);
    }
  }, [matrix, n]);

  const handleCellChange = (i, j, val) => {
    const floatVal = parseFloat(val);
    if (isNaN(floatVal) || floatVal <= 0) return;

    setMatrix(prev => {
      const copy = prev.map(row => [...row]);
      copy[i][j] = floatVal;
      copy[j][i] = 1.0 / floatVal;
      return copy;
    });
  };

  const saveWeights = () => {
    if (!results.isConsistent) return;
    onSave(results.weights);
  };

  // Human readable scales
  const scales = [
    { value: 1, label: "1 (Sama Penting)" },
    { value: 2, label: "2 (Sama - Sedikit Lebih Penting)" },
    { value: 3, label: "3 (Sedikit Lebih Penting)" },
    { value: 4, label: "4 (Sedikit - Lebih Penting)" },
    { value: 5, label: "5 (Lebih Penting)" },
    { value: 6, label: "6 (Lebih - Sangat Lebih Penting)" },
    { value: 7, label: "7 (Sangat Lebih Penting)" },
    { value: 8, label: "8 (Sangat - Mutlak Lebih Penting)" },
    { value: 9, label: "9 (Mutlak Lebih Penting)" },
  ];

  return (
    <div style={{ marginTop: '20px' }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
        Bandingkan tingkat kepentingan relatif antar kriteria secara berpasangan. Jika Kriteria A lebih penting dari Kriteria B, pilih nilai &gt; 1. Sebaliknya, jika kurang penting, sistem akan menghitung nilai kebalikannya secara otomatis.
      </p>

      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Kriteria</th>
              {criteria.map((c, idx) => (
                <th key={idx} style={{ textAlign: 'center' }}>{c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map((cRow, i) => (
              <tr key={i}>
                <td style={{ fontWeight: '600' }}>{cRow.name}</td>
                {criteria.map((cCol, j) => {
                  if (i === j) {
                    return (
                      <td key={j} style={{ textAlign: 'center', backgroundColor: 'var(--canvas-bg)', fontWeight: '600' }}>
                        1.0
                      </td>
                    );
                  }
                  
                  const isUpper = i < j;
                  
                  if (isUpper) {
                    // Render interactive selector
                    return (
                      <td key={j} style={{ textAlign: 'center' }}>
                        <select
                          className="form-control"
                          style={{ padding: '6px', fontSize: '12px', minWidth: '120px' }}
                          value={matrix[i][j]}
                          onChange={(e) => handleCellChange(i, j, e.target.value)}
                        >
                          {scales.map(sc => (
                            <option key={sc.value} value={sc.value}>{sc.label}</option>
                          ))}
                          {/* Reciprocals */}
                          {scales.slice(1).map(sc => (
                            <option key={`rec-${sc.value}`} value={1 / sc.value}>
                              1/{sc.value} (Kebalikan)
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  } else {
                    // Lower part is read-only reciprocal
                    return (
                      <td key={j} style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {matrix[i][j] >= 1 ? matrix[i][j].toFixed(2) : `1/${Math.round(1 / matrix[i][j])}`}
                      </td>
                    );
                  }
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid-2" style={{ marginTop: '20px' }}>
        <div className="card" style={{ padding: '20px', marginBottom: 0 }}>
          <h3 style={{ marginBottom: '12px' }}>Hasil Estimasi Bobot</h3>
          <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
            {criteria.map((c, idx) => (
              <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span>{c.name}</span>
                <strong style={{ color: 'var(--accent-primary)' }}>
                  {(results.weights[idx] * 100).toFixed(2)}%
                </strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="card" style={{ padding: '20px', marginBottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ marginBottom: '12px' }}>Uji Konsistensi (AHP)</h3>
            <div style={{ marginBottom: '10px' }}>
              <span>Maksimum Eigenvalue (&lambda;<sub>max</sub>):</span>{' '}
              <strong>{results.lambdaMax.toFixed(4)}</strong>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <span>Consistency Index (CI):</span>{' '}
              <strong>{results.ci.toFixed(4)}</strong>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <span>Consistency Ratio (CR):</span>{' '}
              <strong style={{ color: results.isConsistent ? 'var(--success)' : 'var(--danger)', fontSize: '16px' }}>
                {results.cr.toFixed(4)}
              </strong>
            </div>
          </div>

          {results.isConsistent ? (
            <div className="alert alert-info" style={{ padding: '10px', fontSize: '12px', marginBottom: '15px' }}>
              ✓ Matriks konsisten (CR &le; 0.10). Anda dapat menyimpan bobot ini.
            </div>
          ) : (
            <div className="alert alert-danger" style={{ padding: '10px', fontSize: '12px', marginBottom: '15px' }}>
              ⚠ Matriks tidak konsisten (CR &gt; 0.10). Silakan tinjau kembali nilai perbandingan Anda agar logis.
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={!results.isConsistent}
            onClick={saveWeights}
          >
            Terapkan Bobot AHP
          </button>
        </div>
      </div>
    </div>
  );
};

export default AHPMatrixInput;
