import React, { useState } from 'react';

const MatrixInputTable = ({ 
  criterias, 
  setCriterias, 
  alternatives, 
  setAlternatives, 
  matrix, 
  setMatrix, 
  onLoadLaptopDataset,
  onImportCSV
}) => {
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);

  // Add new criterion
  const addCriteria = () => {
    const nextNum = criterias.length + 1;
    const name = `Kriteria ${nextNum}`;
    setCriterias(prev => [...prev, { name, weight: 0.0, type: 'benefit' }]);
    setMatrix(prev => prev.map(row => [...row, 0.0]));
    setErrorMsg('');
  };

  // Remove criterion
  const removeCriteria = (colIdx) => {
    if (criterias.length <= 1) {
      setErrorMsg('Harus ada minimal 1 kriteria.');
      return;
    }
    setCriterias(prev => prev.filter((_, idx) => idx !== colIdx));
    setMatrix(prev => prev.map(row => row.filter((_, idx) => idx !== colIdx)));
    setErrorMsg('');
  };

  // Add new alternative
  const addAlternative = () => {
    const nextNum = alternatives.length + 1;
    const name = `Alternatif ${nextNum}`;
    setAlternatives(prev => [...prev, { name }]);
    setMatrix(prev => [...prev, Array(criterias.length).fill(0.0)]);
    setErrorMsg('');
  };

  // Remove alternative
  const removeAlternative = (rowIdx) => {
    if (alternatives.length <= 1) {
      setErrorMsg('Harus ada minimal 1 alternatif.');
      return;
    }
    setAlternatives(prev => prev.filter((_, idx) => idx !== rowIdx));
    setMatrix(prev => prev.filter((_, idx) => idx !== rowIdx));
    setErrorMsg('');
  };

  // Handle cell value change
  const handleCellChange = (rowIdx, colIdx, val) => {
    const floatVal = parseFloat(val);
    const rawVal = isNaN(floatVal) ? 0.0 : floatVal;

    // Benefit criteria validation (cannot be negative)
    const critType = criterias[colIdx].type;
    if (critType === 'benefit' && rawVal < 0) {
      setErrorMsg(`Nilai kriteria benefit (${criterias[colIdx].name}) tidak boleh negatif.`);
    } else if (critType === 'cost' && rawVal === 0) {
      setErrorMsg(`Nilai kriteria cost (${criterias[colIdx].name}) tidak boleh bernilai 0 untuk menghindari division by zero.`);
    } else {
      setErrorMsg('');
    }

    setMatrix(prev => {
      const copy = prev.map(row => [...row]);
      copy[rowIdx][colIdx] = rawVal;
      return copy;
    });
  };

  const handleCriteriaChange = (colIdx, field, val) => {
    setCriterias(prev => {
      const copy = [...prev];
      if (field === 'weight') {
        const floatVal = parseFloat(val);
        copy[colIdx][field] = isNaN(floatVal) ? 0.0 : floatVal;
      } else {
        copy[colIdx][field] = val;
      }
      return copy;
    });

    // Re-validate benefit types on toggle if some values are negative
    if (field === 'type' && val === 'benefit') {
      let hasNegative = false;
      matrix.forEach((row, altIdx) => {
        if (row[colIdx] < 0) hasNegative = true;
      });
      if (hasNegative) {
        setErrorMsg(`Peringatan: Terdapat nilai negatif pada kriteria benefit '${criterias[colIdx].name}'. Harap disesuaikan.`);
      }
    } else {
      setErrorMsg('');
    }
  };

  const handleAlternativeNameChange = (rowIdx, val) => {
    setAlternatives(prev => {
      const copy = [...prev];
      copy[rowIdx].name = val;
      return copy;
    });
  };

  // CSV parsing upload handler
  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadLoading(true);
    setErrorMsg('');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/projects/import-csv', {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Gagal memproses file CSV.');
      }
      
      const data = await res.json();
      onImportCSV(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" className="btn btn-secondary" onClick={addCriteria}>
            + Kriteria
          </button>
          <button type="button" className="btn btn-secondary" onClick={addAlternative}>
            + Alternatif
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            style={{ backgroundColor: '#7A9D54' }}
            onClick={onLoadLaptopDataset}
          >
            🖳 Gunakan Dataset Laptop (Contoh)
          </button>
        </div>
        
        <div style={{ position: 'relative' }}>
          <input 
            type="file" 
            id="csv-file-input" 
            accept=".csv,.xlsx,.xls" 
            style={{ display: 'none' }} 
            onChange={handleCSVUpload}
          />
          <button 
            type="button" 
            className="btn btn-secondary" 
            disabled={uploadLoading}
            onClick={() => document.getElementById('csv-file-input').click()}
          >
            {uploadLoading ? 'Mengunggah...' : '📤 Unggah CSV/Excel'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="alert alert-danger" style={{ padding: '12px 20px', marginBottom: '20px' }}>
          {errorMsg}
        </div>
      )}

      {/* Model Configuration Panel */}
      <div className="card" style={{ padding: '24px', marginBottom: '32px', backgroundColor: '#faf8f5', borderColor: '#e4dfd5' }}>
        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🛠 Model Configuration
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px' }}>
          Tentukan nama kriteria, bobot, dan sifat kriteria (Benefit vs Cost) di bawah ini. Toggle switch memberikan visual yang bersih untuk menentukan jenis kriteria Anda.
        </p>
        
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>No</th>
                <th>Nama Kriteria</th>
                <th style={{ width: '180px', textAlign: 'center' }}>Sifat Kriteria</th>
                <th style={{ width: '150px' }}>Bobot Awal</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {criterias.map((crit, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>
                    <input
                      type="text"
                      className="form-control"
                      style={{ padding: '6px 10px' }}
                      value={crit.name}
                      onChange={(e) => handleCriteriaChange(idx, 'name', e.target.value)}
                    />
                  </td>
                  <td style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', height: '45px', alignItems: 'center' }}>
                    {/* Minimalist Toggle Switch */}
                    <div 
                      className={`toggle-btn ${crit.type}`}
                      onClick={() => handleCriteriaChange(idx, 'type', crit.type === 'benefit' ? 'cost' : 'benefit')}
                    >
                      <div className="toggle-btn-slider" />
                      <span className="span-benefit">Benefit</span>
                      <span className="span-cost">Cost</span>
                    </div>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      className="form-control"
                      style={{ padding: '6px 10px' }}
                      value={crit.weight}
                      onChange={(e) => handleCriteriaChange(idx, 'weight', e.target.value)}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-danger"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      onClick={() => removeCriteria(idx)}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h3 style={{ marginBottom: '12px' }}>Pengisian Matriks Keputusan</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px' }}>
        Isi nilai performa alternatif pada sel-sel di bawah ini. Anda dapat mengedit nilai secara langsung (*inline-editing*). Perubahan nilai akan terhitung secara instan.
      </p>
      
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th style={{ width: '220px' }}>Alternatif</th>
              {criterias.map((crit, idx) => (
                <th key={idx} style={{ minWidth: '110px', textAlign: 'center' }}>
                  {crit.name}
                  <span style={{ display: 'block', fontSize: '10px', fontWeight: 'normal', marginTop: '2px' }}>
                    {crit.type === 'benefit' ? '(Benefit)' : '(Cost)'}
                  </span>
                </th>
              ))}
              <th style={{ width: '80px', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {alternatives.map((alt, altIdx) => (
              <tr key={altIdx}>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    style={{ padding: '6px 10px', fontWeight: '600' }}
                    value={alt.name}
                    onChange={(e) => handleAlternativeNameChange(altIdx, e.target.value)}
                  />
                </td>
                {criterias.map((crit, critIdx) => {
                  const val = matrix[altIdx]?.[critIdx] !== undefined ? matrix[altIdx][critIdx] : 0.0;
                  const isInvalid = (crit.type === 'benefit' && val < 0) || (crit.type === 'cost' && val === 0);
                  
                  return (
                    <td key={critIdx} style={{ textAlign: 'center' }}>
                      <input
                        type="number"
                        step="any"
                        className={`inline-edit-input ${isInvalid ? 'invalid' : ''}`}
                        value={val}
                        onChange={(e) => handleCellChange(altIdx, critIdx, e.target.value)}
                      />
                    </td>
                  );
                })}
                <td style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-danger"
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                    onClick={() => removeAlternative(altIdx)}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MatrixInputTable;
