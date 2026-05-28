import React from 'react';
import EmptyState from './EmptyState';

const RadarChart = ({ criterias, alternatives, matrix, rankings }) => {
  const n = criterias.length;
  if (n < 3 || alternatives.length === 0 || !matrix || matrix.length === 0) {
    return (
      <EmptyState 
        icon="radar" 
        title="Kalkulasi Radar Ditangguhkan" 
        subtitle="Visualisasi spiderweb memerlukan minimal 3 kriteria keputusan agar dapat terpolarisasi secara geometris." 
      />
    );
  }

  // Identify top 3 alternatives based on current rankings
  const topRanked = rankings.slice(0, 3);
  
  // Find column min/max to normalize decision matrix values to [0.1, 1.0] for radar scaling
  const colMaxs = Array(n).fill(0);
  const colMins = Array(n).fill(Infinity);
  
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < alternatives.length; i++) {
      const val = matrix[i]?.[j] || 0.0;
      if (val > colMaxs[j]) colMaxs[j] = val;
      if (val < colMins[j]) colMins[j] = val;
    }
  }

  // Radar parameters
  const size = 300;
  const center = size / 2;
  const rMax = size * 0.35; // Maximum radius for 100% value
  
  // Compute coordinates for a value on axis j
  const getCoordinates = (critIdx, valueNormalized) => {
    // Subtract pi/2 to start pointing straight up
    const angle = (critIdx * 2 * Math.PI) / n - Math.PI / 2;
    const r = valueNormalized * rMax;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // 1. Generate concentric grid polygons (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const gridPaths = gridLevels.map(level => {
    const points = [];
    for (let j = 0; j < n; j++) {
      const { x, y } = getCoordinates(j, level);
      points.push(`${x},${y}`);
    }
    return points.join(' ');
  });

  // 2. Generate axes lines and label positions
  const axes = [];
  const labels = [];
  for (let j = 0; j < n; j++) {
    const pMax = getCoordinates(j, 1.0);
    axes.push({ x1: center, y1: center, x2: pMax.x, y2: pMax.y });
    
    // Label positioning slightly outer
    const pLabel = getCoordinates(j, 1.18);
    labels.push({ 
      name: criterias[j].name, 
      x: pLabel.x, 
      y: pLabel.y, 
      anchor: pLabel.x > center ? 'start' : pLabel.x < center ? 'end' : 'middle'
    });
  }

  // 3. Generate alternative polygons (Top 3)
  const altPolygons = topRanked.map((rankedItem, idx) => {
    // Find original index of this alternative in the main matrix
    const altOriginalIdx = alternatives.findIndex(alt => alt.name === rankedItem.name);
    if (altOriginalIdx === -1) return null;
    
    const points = [];
    const rawValues = [];
    for (let j = 0; j < n; j++) {
      const val = matrix[altOriginalIdx]?.[j] || 0.0;
      rawValues.push(val);
      const type = criterias[j].type;
      
      // Calculate normalized value
      let norm = 0.1; // Default floor so it doesn't collapse to center dot
      if (type === 'benefit') {
        norm = colMaxs[j] === 0 ? 0.1 : 0.1 + 0.9 * (val / colMaxs[j]);
      } else {
        norm = val === 0 ? 0.1 : 0.1 + 0.9 * (colMins[j] / val);
      }
      
      const { x, y } = getCoordinates(j, norm);
      points.push({ x, y, val });
    }

    // Assign rank colors matching theme
    let color = '#D37B55'; // Rank 1: Terracotta
    let fill = 'rgba(211, 123, 85, 0.15)';
    if (idx === 1) {
      color = '#5A67D8'; // Rank 2: Indigo
      fill = 'rgba(90, 103, 216, 0.12)';
    } else if (idx === 2) {
      color = '#7A9D54'; // Rank 3: Olive
      fill = 'rgba(122, 157, 84, 0.12)';
    }

    return {
      points: points.map(p => `${p.x},${p.y}`).join(' '),
      coordList: points,
      color,
      fill,
      name: rankedItem.name,
      rank: idx + 1
    };
  }).filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '16px', width: '100%' }}>
      <div style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
          {/* Background Grid Polygons */}
          {gridPaths.map((path, idx) => (
            <polygon
              key={idx}
              points={path}
              fill="none"
              stroke="var(--border-color)"
              strokeWidth="1"
              strokeDasharray={idx === gridPaths.length - 1 ? "none" : "3 3"}
            />
          ))}

          {/* Concentric Circle Values (Labels like 20%, 40%...) */}
          {gridLevels.map((level, idx) => {
            const { x, y } = getCoordinates(0, level); // Align on top axis
            return (
              <text
                key={idx}
                x={x + 5}
                y={y + 3}
                fontSize="8px"
                fill="var(--text-secondary)"
                fontWeight="700"
              >
                {Math.round(level * 100)}%
              </text>
            );
          })}

          {/* Axis Lines */}
          {axes.map((axis, idx) => (
            <line
              key={idx}
              x1={axis.x1}
              y1={axis.y1}
              x2={axis.x2}
              y2={axis.y2}
              stroke="var(--border-color)"
              strokeWidth="1.2"
            />
          ))}

          {/* Outer Labels */}
          {labels.map((lbl, idx) => (
            <text
              key={idx}
              x={lbl.x}
              y={lbl.y + 4}
              fontSize="10px"
              fontWeight="800"
              fill="var(--text-primary)"
              textAnchor={lbl.anchor}
            >
              {lbl.name}
            </text>
          ))}

          {/* Alternative Polygons */}
          {altPolygons.map((poly, idx) => (
            <g key={idx}>
              <polygon
                points={poly.points}
                fill={poly.fill}
                stroke={poly.color}
                strokeWidth="2.5"
                strokeLinejoin="round"
                style={{ 
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))'
                }}
              />
              {/* Vertex Dots for enhanced interactivity */}
              {poly.coordList.map((coord, cIdx) => (
                <circle
                  key={cIdx}
                  cx={coord.x}
                  cy={coord.y}
                  r="4"
                  fill="white"
                  stroke={poly.color}
                  strokeWidth="2"
                  style={{ transition: 'all 0.4s ease' }}
                  title={`${criterias[cIdx].name}: ${coord.val}`}
                />
              ))}
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '16px', 
          marginTop: '24px', 
          flexWrap: 'wrap',
          fontSize: '11px',
          fontWeight: '800'
        }}
      >
        {altPolygons.map((poly, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              style={{ 
                display: 'inline-block', 
                width: '12px', 
                height: '12px', 
                backgroundColor: poly.fill, 
                border: `2px solid ${poly.color}`,
                borderRadius: '4px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }} 
            />
            <span style={{ color: 'var(--text-secondary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {poly.rank === 1 ? '🥇' : poly.rank === 2 ? '🥈' : '🥉'} {poly.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RadarChart;
