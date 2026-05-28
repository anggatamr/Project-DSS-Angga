import React from 'react';

const SkeletonLine = ({ width = '100%', height = '14px', style = {} }) => (
  <div 
    className="skeleton-line" 
    style={{ width, height, borderRadius: '6px', ...style }} 
  />
);

const SkeletonCircle = ({ size = '40px', style = {} }) => (
  <div 
    className="skeleton-line" 
    style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, ...style }} 
  />
);

const SkeletonCard = () => (
  <div className="skeleton-card">
    <SkeletonLine width="60%" height="20px" style={{ marginBottom: '16px' }} />
    <SkeletonLine width="100%" style={{ marginBottom: '10px' }} />
    <SkeletonLine width="85%" style={{ marginBottom: '10px' }} />
    <SkeletonLine width="70%" style={{ marginBottom: '24px' }} />
    <div style={{ display: 'flex', gap: '12px' }}>
      <SkeletonLine width="100px" height="36px" />
      <SkeletonLine width="100px" height="36px" />
    </div>
  </div>
);

const SkeletonTable = ({ rows = 5, cols = 4 }) => (
  <div className="skeleton-card">
    <SkeletonLine width="40%" height="20px" style={{ marginBottom: '20px' }} />
    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
      {Array(cols).fill(0).map((_, i) => (
        <SkeletonLine key={i} height="32px" />
      ))}
    </div>
    {Array(rows).fill(0).map((_, rowIdx) => (
      <div key={rowIdx} style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
        {Array(cols).fill(0).map((_, colIdx) => (
          <SkeletonLine key={colIdx} height="24px" />
        ))}
      </div>
    ))}
  </div>
);

const SkeletonChart = () => (
  <div className="skeleton-card">
    <SkeletonLine width="50%" height="20px" style={{ marginBottom: '24px' }} />
    {[85, 65, 45, 75, 55].map((w, idx) => (
      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <SkeletonCircle size="32px" />
        <SkeletonLine width="100px" height="16px" />
        <SkeletonLine width={`${w}%`} height="24px" style={{ flexGrow: 1 }} />
        <SkeletonLine width="50px" height="16px" />
      </div>
    ))}
  </div>
);

const SkeletonLoader = ({ type = 'card' }) => {
  switch (type) {
    case 'table':
      return <SkeletonTable />;
    case 'chart':
      return <SkeletonChart />;
    case 'card':
    default:
      return <SkeletonCard />;
  }
};

export default SkeletonLoader;
