/**
 * Data Quality & Sanity Check utilities.
 */

/**
 * Computes data quality metrics for the decision matrix.
 * @param {number[][]} matrix - [alt][crit]
 * @param {Array} criterias - criteria objects with .name, .type
 * @param {Array} alternatives - alternative objects with .name
 * @returns {Object} quality report
 */
export function computeDataQuality(matrix, criterias, alternatives) {
  const nAlts = alternatives.length;
  const nCrits = criterias.length;
  const totalCells = nAlts * nCrits;

  if (totalCells === 0) return null;

  let zeroCells = 0;
  let negativeCells = 0;
  const invalidCells = [];

  for (let i = 0; i < nAlts; i++) {
    for (let j = 0; j < nCrits; j++) {
      const row = matrix[i];
      const val = (Array.isArray(row) && row[j] !== undefined) ? Number(row[j]) : 0;
      if (val === 0) {
        zeroCells++;
        if (criterias[j].type === 'cost') {
          invalidCells.push({
            alt: alternatives[i].name,
            crit: criterias[j].name,
            val,
            reason: 'Nilai 0 pada kriteria Cost menyebabkan division by zero'
          });
        }
      }
      if (val < 0) {
        negativeCells++;
        if (criterias[j].type === 'benefit') {
          invalidCells.push({
            alt: alternatives[i].name,
            crit: criterias[j].name,
            val,
            reason: 'Nilai negatif tidak valid untuk kriteria Benefit'
          });
        }
      }
    }
  }

  const completeness = ((totalCells - zeroCells) / totalCells) * 100;

  // Detect unrealistic outliers per column (z-score > 3)
  const outliers = [];
  for (let j = 0; j < nCrits; j++) {
    const col = matrix.map(row => row[j] ?? 0);
    const mean = col.reduce((a, b) => a + b, 0) / col.length;
    const variance = col.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / col.length;
    const std = Math.sqrt(variance);

    if (std > 0) {
      col.forEach((val, i) => {
        const z = Math.abs((val - mean) / std);
        if (z > 2.5) {
          outliers.push({
            alt: alternatives[i].name,
            crit: criterias[j].name,
            val,
            zScore: z.toFixed(2)
          });
        }
      });
    }
  }

  return {
    totalCells,
    zeroCells,
    negativeCells,
    completeness: completeness.toFixed(1),
    invalidCells,
    outliers,
    isClean: invalidCells.length === 0
  };
}

/**
 * Sanity check: after ranking, detect anomalies like
 * "Alternative dominates in most criteria but ranks low".
 * @param {number[][]} matrix - [alt][crit]
 * @param {Array} criterias - criteria objects
 * @param {Array} rankings - ranked alternatives with .name, .rank, .score
 * @returns {Array} list of anomaly warnings
 */
export function runSanityCheck(matrix, criterias, rankings) {
  if (!rankings || rankings.length < 2) return [];

  const nCrits = criterias.length;
  const anomalies = [];

  // For each alternative, count how many criteria it "wins" (has best value)
  const winCounts = rankings.map((r, altIdx) => {
    let wins = 0;
    for (let j = 0; j < nCrits; j++) {
      const col = matrix.map(row => row[j] ?? 0);
      const val = matrix[altIdx]?.[j] ?? 0;
      const cType = criterias[j].type;

      if (cType === 'benefit') {
        if (val === Math.max(...col)) wins++;
      } else {
        if (val === Math.min(...col)) wins++;
      }
    }
    return { name: r.name, rank: r.rank, wins, score: r.score };
  });

  // Flag: alternative wins many criteria but has a low rank
  winCounts.forEach(item => {
    const winRatio = item.wins / nCrits;
    if (winRatio >= 0.5 && item.rank > Math.ceil(rankings.length / 2)) {
      anomalies.push({
        type: 'dominance_mismatch',
        alt: item.name,
        rank: item.rank,
        wins: item.wins,
        total: nCrits,
        message: `"${item.name}" unggul di ${item.wins}/${nCrits} kriteria namun hanya menempati Peringkat ${item.rank}. Periksa kembali bobot kriteria atau nilai matriks.`
      });
    }
  });

  // Flag: top-ranked alternative has very low score (< 0.3 for TOPSIS)
  if (rankings[0] && rankings[0].score < 0.3) {
    anomalies.push({
      type: 'low_top_score',
      alt: rankings[0].name,
      score: rankings[0].score,
      message: `Alternatif terbaik "${rankings[0].name}" memiliki skor yang rendah (${rankings[0].score.toFixed(4)}). Semua alternatif mungkin memiliki performa yang serupa.`
    });
  }

  // Flag: very tight ranking (top 3 scores within 5% of each other)
  if (rankings.length >= 3) {
    const top3Scores = rankings.slice(0, 3).map(r => r.score);
    const range = Math.max(...top3Scores) - Math.min(...top3Scores);
    const maxScore = Math.max(...top3Scores);
    if (maxScore > 0 && range / maxScore < 0.05) {
      anomalies.push({
        type: 'tight_ranking',
        message: `3 alternatif teratas memiliki skor yang sangat berdekatan (selisih < 5%). Peringkat bisa berubah drastis dengan perubahan bobot kecil.`
      });
    }
  }

  return anomalies;
}
