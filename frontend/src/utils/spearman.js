/**
 * Calculates Spearman Rank Correlation Coefficient (r_s) between two sets of rankings.
 * rankingsA and rankingsB are arrays of objects with { name: string, rank: number } or similar structure.
 */
export function calculateSpearman(rankingsA, rankingsB) {
  if (!rankingsA || !rankingsB || rankingsA.length === 0 || rankingsB.length === 0) {
    return { coefficient: 0, interpretation: "Tidak ada data" };
  }

  const n = rankingsA.length;
  if (n !== rankingsB.length || n <= 1) {
    return { coefficient: 1, interpretation: "Sangat Kuat (Data Tunggal)" };
  }

  // Create lookup maps for ranks
  const rankMapA = {};
  rankingsA.forEach((item, idx) => {
    // If rank isn't explicitly provided, use position index + 1
    const rankVal = item.rank !== undefined ? item.rank : (idx + 1);
    rankMapA[item.name] = rankVal;
  });

  const rankMapB = {};
  rankingsB.forEach((item, idx) => {
    const rankVal = item.rank !== undefined ? item.rank : (idx + 1);
    rankMapB[item.name] = rankVal;
  });

  // Calculate sum of squared differences (d^2)
  let sumD2 = 0;
  for (const name in rankMapA) {
    if (rankMapB[name] !== undefined) {
      const diff = rankMapA[name] - rankMapB[name];
      sumD2 += diff * diff;
    }
  }

  // Spearman formula: r_s = 1 - (6 * sum(d^2)) / (n * (n^2 - 1))
  const rs = 1 - (6 * sumD2) / (n * (n * n - 1));

  // Interpret coefficient
  let interpretation = "Korelasi Lemah";
  const absRs = Math.abs(rs);
  if (absRs >= 0.8) {
    interpretation = "Korelasi Sangat Kuat";
  } else if (absRs >= 0.6) {
    interpretation = "Korelasi Kuat";
  } else if (absRs >= 0.4) {
    interpretation = "Korelasi Sedang";
  } else if (absRs >= 0.2) {
    interpretation = "Korelasi Lemah";
  } else {
    interpretation = "Tidak Ada Korelasi Signifikan";
  }

  return {
    coefficient: rs,
    interpretation
  };
}
