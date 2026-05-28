/**
 * Client-side MCDM Solvers to support sub-10ms real-time sensitivity analysis.
 */

export function solveSAWClient(matrix, weights, criteriaTypes) {
  const nAlts = matrix.length;
  const nCrits = weights.length;
  
  if (nAlts === 0 || nCrits === 0) return { scores: [] };
  
  // 1. Find columns max/min
  const colMaxs = Array(nCrits).fill(0);
  const colMins = Array(nCrits).fill(Infinity);
  
  for (let j = 0; j < nCrits; j++) {
    for (let i = 0; i < nAlts; i++) {
      const val = matrix[i][j];
      if (val > colMaxs[j]) colMaxs[j] = val;
      if (val < colMins[j]) colMins[j] = val;
    }
  }
  
  // 2. Normalize and compute scores
  const scores = [];
  for (let i = 0; i < nAlts; i++) {
    let score = 0;
    for (let j = 0; j < nCrits; j++) {
      const val = matrix[i][j];
      const type = criteriaTypes[j].toLowerCase();
      let r = 0;
      
      if (type === 'benefit') {
        r = colMaxs[j] === 0 ? 0 : val / colMaxs[j];
      } else {
        r = val === 0 ? 0 : colMins[j] / val;
      }
      
      score += weights[j] * r;
    }
    scores.push(score);
  }
  
  return { scores };
}

export function solveTOPSISClient(matrix, weights, criteriaTypes) {
  const nAlts = matrix.length;
  const nCrits = weights.length;
  
  if (nAlts === 0 || nCrits === 0) {
    return { scores: [] };
  }
  
  // 1. Vector Normalization
  // Sum of squares for columns
  const sumSquares = Array(nCrits).fill(0);
  for (let j = 0; j < nCrits; j++) {
    for (let i = 0; i < nAlts; i++) {
      sumSquares[j] += matrix[i][j] * matrix[i][j];
    }
  }
  
  const normFactors = sumSquares.map(s => Math.sqrt(s));
  
  // Normalized & Weighted Matrix
  const Y = Array(nAlts).fill(0).map(() => Array(nCrits).fill(0));
  for (let i = 0; i < nAlts; i++) {
    for (let j = 0; j < nCrits; j++) {
      const r = normFactors[j] === 0 ? 0 : matrix[i][j] / normFactors[j];
      Y[i][j] = r * weights[j];
    }
  }
  
  // 2. Find Ideal Positive (A+) and Ideal Negative (A-)
  const idealPos = Array(nCrits).fill(0);
  const idealNeg = Array(nCrits).fill(0);
  
  for (let j = 0; j < nCrits; j++) {
    const colValues = Y.map(row => row[j]);
    const type = criteriaTypes[j].toLowerCase();
    
    if (type === 'benefit') {
      idealPos[j] = Math.max(...colValues);
      idealNeg[j] = Math.min(...colValues);
    } else {
      idealPos[j] = Math.min(...colValues);
      idealNeg[j] = Math.max(...colValues);
    }
  }
  
  // 3. Separation measures D+ and D-
  const D_pos = Array(nAlts).fill(0);
  const D_neg = Array(nAlts).fill(0);
  
  for (let i = 0; i < nAlts; i++) {
    let sumPos = 0;
    let sumNeg = 0;
    for (let j = 0; j < nCrits; j++) {
      sumPos += Math.pow(Y[i][j] - idealPos[j], 2);
      sumNeg += Math.pow(Y[i][j] - idealNeg[j], 2);
    }
    D_pos[i] = Math.sqrt(sumPos);
    D_neg[i] = Math.sqrt(sumNeg);
  }
  
  // 4. Closeness score C
  const scores = [];
  for (let i = 0; i < nAlts; i++) {
    const denom = D_pos[i] + D_neg[i];
    scores.push(denom === 0 ? 0.5 : D_neg[i] / denom);
  }
  
  return { scores };
}
