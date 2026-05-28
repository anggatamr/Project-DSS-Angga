import React from 'react';

const Wizard = ({ currentStep, steps, onStepClick }) => {
  // Compute percentage width for progress line fill
  const progressPercent = ((currentStep - 1) / (steps.length - 1)) * 100;

  // Custom icons or indicators for steps
  const stepIcons = {
    1: '🔍', // Karakteristik
    2: '📋', // Matriks
    3: '⚡', // Analisis Sensitivitas
    4: '🏆'  // Hasil
  };

  return (
    <div className="wizard-progress">
      <div 
        className="wizard-progress-bar" 
        style={{ width: `${progressPercent}%` }}
      />
      {steps.map((step, idx) => {
        const stepNum = idx + 1;
        const isActive = currentStep === stepNum;
        const isCompleted = currentStep > stepNum;
        
        return (
          <div 
            key={idx} 
            className={`wizard-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
            style={{ cursor: isCompleted || stepNum < currentStep ? 'pointer' : 'default' }}
            onClick={() => (isCompleted || stepNum < currentStep) && onStepClick(stepNum)}
          >
            <div className="wizard-step-circle" title={step}>
              {isCompleted ? '✓' : (stepIcons[stepNum] || stepNum)}
            </div>
            <div className="wizard-step-label">{step}</div>
          </div>
        );
      })}
    </div>
  );
};

export default Wizard;
