import React from 'react';

const SensitivitySlider = ({ criterias, onChange }) => {
  
  const handleSliderChange = (targetIdx, newValueStr) => {
    const newVal = parseFloat(newValueStr) / 100; // Slider value is 0-100
    const n = criterias.length;
    
    if (n <= 1) return;
    
    const currentWeights = criterias.map(c => c.weight);
    const oldVal = currentWeights[targetIdx];
    
    // Calculate new weights
    const nextWeights = [...currentWeights];
    nextWeights[targetIdx] = newVal;
    
    const sumOtherOld = currentWeights.reduce((sum, w, idx) => idx !== targetIdx ? sum + w : sum, 0);
    const remainingToDistribute = 1.0 - newVal;
    
    if (sumOtherOld > 1e-5) {
      // Distribute proportionally
      for (let i = 0; i < n; i++) {
        if (i !== targetIdx) {
          nextWeights[i] = currentWeights[i] * (remainingToDistribute / sumOtherOld);
        }
      }
    } else {
      // Distribute equally
      const share = remainingToDistribute / (n - 1);
      for (let i = 0; i < n; i++) {
        if (i !== targetIdx) {
          nextWeights[i] = share;
        }
      }
    }
    
    // Double check sum is exactly 1.0 due to float rounding
    const sumTotal = nextWeights.reduce((a, b) => a + b, 0);
    const correctedWeights = nextWeights.map(w => w / sumTotal);
    
    onChange(correctedWeights);
  };

  return (
    <div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
        Geser slider di bawah untuk mensimulasikan perubahan bobot prioritas kriteria. Sistem akan menghitung ulang peringkat alternatif secara instan &lt; 100ms.
      </p>

      {criterias.map((crit, idx) => {
        const sliderValue = Math.round(crit.weight * 100);
        return (
          <div key={crit.id || idx} className="slider-group">
            <div className="slider-info">
              <span className="slider-name">
                {crit.name}{' '}
                <span style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                  ({crit.type === 'benefit' ? 'Benefit' : 'Cost'})
                </span>
              </span>
              <span className="slider-weight">{sliderValue}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderValue}
              className="slider-input"
              onChange={(e) => handleSliderChange(idx, e.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
};

export default SensitivitySlider;
