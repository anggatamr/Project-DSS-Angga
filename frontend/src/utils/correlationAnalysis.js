/**
 * Criteria Correlation Analysis
 * Detects highly correlated (redundant) criteria using Pearson correlation.
 */

/**
 * Computes Pearson correlation between two arrays of numbers.
 */
function pearsonCorrelation(x, y) {
  const n = x.length;
  if (n < 2) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0, denomX = 0, denomY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  return denom === 0 ? 0 : num / denom;
}

/**
 * Analyzes all pairs of criteria for high correlation.
 * @param {number[][]} matrix - decision matrix [alt][crit]
 * @param {Array} criterias - array of criteria objects with .name
 * @param {number} threshold - correlation threshold (default 0.85)
 * @returns {Array} list of warning objects { crit1, crit2, correlation }
 */
export function analyzeCriteriaCorrelation(matrix, criterias, threshold = 0.85) {
  const nCrits = criterias.length;
  const nAlts = matrix.length;
  if (nAlts < 3 || nCrits < 2) return [];

  // Guard: ensure all rows exist and have enough columns
  const validMatrix = matrix.filter(row => Array.isArray(row) && row.length >= nCrits);
  if (validMatrix.length < 3) return [];

  const warnings = [];

  for (let i = 0; i < nCrits; i++) {
    for (let j = i + 1; j < nCrits; j++) {
      const colI = validMatrix.map(row => Number(row[i]) || 0);
      const colJ = validMatrix.map(row => Number(row[j]) || 0);
      const r = pearsonCorrelation(colI, colJ);
      const absR = Math.abs(r);

      if (absR >= threshold) {
        warnings.push({
          crit1: criterias[i].name,
          crit2: criterias[j].name,
          correlation: r,
          absCorrelation: absR,
          direction: r > 0 ? 'positif' : 'negatif'
        });
      }
    }
  }

  return warnings;
}

/**
 * Computes a full correlation matrix for display as a heatmap.
 * @returns {number[][]} nCrits x nCrits matrix of Pearson r values
 */
export function buildCorrelationMatrix(matrix, criterias) {
  const nCrits = criterias.length;
  const result = Array(nCrits).fill(null).map(() => Array(nCrits).fill(0));

  // Guard: filter valid rows
  const validMatrix = matrix.filter(row => Array.isArray(row) && row.length >= nCrits);
  if (validMatrix.length < 2) {
    // Return identity matrix if not enough data
    for (let i = 0; i < nCrits; i++) result[i][i] = 1.0;
    return result;
  }

  for (let i = 0; i < nCrits; i++) {
    for (let j = 0; j < nCrits; j++) {
      if (i === j) {
        result[i][j] = 1.0;
      } else {
        const colI = validMatrix.map(row => Number(row[i]) || 0);
        const colJ = validMatrix.map(row => Number(row[j]) || 0);
        result[i][j] = pearsonCorrelation(colI, colJ);
      }
    }
  }

  return result;
}
