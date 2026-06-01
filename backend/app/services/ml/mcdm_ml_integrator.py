"""
MCDMMLIntegrator — Bridges existing SAW/TOPSIS solvers with ML predictions.
Produces unified rankings with confidence scores and feature-importance explanations.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from app.services.ml.dynamic_learner import DynamicLearner
from app.services.topsis import solve_topsis
from app.services.saw import solve_saw


class MCDMMLIntegrator:
    """
    Combines MCDM decision logic with ML predictive power.

    Workflow:
      1. ML model predicts a score/value for each alternative.
      2. ML prediction is optionally added as an extra criterion.
      3. MCDM (SAW or TOPSIS) ranks alternatives using all criteria.
      4. Results are enriched with feature-importance explanations.
    """

    def __init__(self, learner: DynamicLearner):
        self.learner = learner

    # ------------------------------------------------------------------ #
    #  Main solve                                                          #
    # ------------------------------------------------------------------ #

    def integrated_solve(
        self,
        matrix: List[List[float]],
        weights: List[float],
        criteria_types: List[str],
        criteria_names: List[str],
        alternative_names: List[str],
        method: str = "TOPSIS",
        use_ml_prediction: bool = True,
        ml_weight: float = 0.20,
    ) -> Dict[str, Any]:
        """
        Unified MCDM + ML solve.

        Args:
            matrix:            Decision matrix [alt][crit]
            weights:           Criteria weights (sum ≈ 1)
            criteria_types:    "benefit" | "cost" per criterion
            criteria_names:    Human-readable criterion names
            alternative_names: Human-readable alternative names
            method:            "TOPSIS" | "SAW"
            use_ml_prediction: Whether to incorporate ML predictions
            ml_weight:         Weight given to ML prediction column (0–1)

        Returns:
            Dict with rankings, confidence scores, and explanations
        """
        n_alts = len(alternative_names)
        n_crits = len(criteria_names)

        ml_predictions: Optional[np.ndarray] = None
        ml_confidence: Optional[List[float]] = None

        # --- ML prediction ---
        # Build a DataFrame using the TRAINING feature names (not DSS criteria names).
        # Map by position: DSS matrix columns correspond positionally to training features.
        if use_ml_prediction and self.learner.models:
            try:
                training_features = self.learner.feature_names
                n_train_feats = len(training_features)
                n_available = min(n_crits, n_train_feats)

                # Build DataFrame with training feature names, using matrix values by position
                alt_data = {}
                for j, feat_name in enumerate(training_features[:n_available]):
                    alt_data[feat_name] = [matrix[i][j] for i in range(n_alts)]

                # Fill any remaining training features with 0
                for feat_name in training_features[n_available:]:
                    alt_data[feat_name] = [0.0] * n_alts

                alt_df = pd.DataFrame(alt_data)
                preds, meta = self.learner.predict(alt_df)
                ml_predictions = np.array(preds, dtype=float)
                ml_confidence = meta.get("confidence", [0.80] * n_alts)
            except Exception as e:
                print(f"[MCDMMLIntegrator] ML prediction skipped: {e}")

        # --- Build enhanced matrix ---
        enhanced_matrix = [row[:] for row in matrix]
        enhanced_weights = list(weights)
        enhanced_types = list(criteria_types)
        enhanced_names = list(criteria_names)

        if ml_predictions is not None:
            # Normalize ML predictions to [0, 1]
            mn, mx = ml_predictions.min(), ml_predictions.max()
            if mx > mn:
                ml_norm = ((ml_predictions - mn) / (mx - mn)).tolist()
            else:
                ml_norm = [0.5] * n_alts

            for i in range(n_alts):
                enhanced_matrix[i] = enhanced_matrix[i] + [ml_norm[i]]

            # Re-scale existing weights to leave room for ml_weight
            scale = 1.0 - ml_weight
            enhanced_weights = [w * scale for w in weights]
            enhanced_weights.append(ml_weight)
            enhanced_types.append("benefit")
            enhanced_names.append("ML Prediction Score")

        # Normalize weights to exactly 1.0
        total_w = sum(enhanced_weights)
        if total_w > 0:
            enhanced_weights = [w / total_w for w in enhanced_weights]

        # --- MCDM solve ---
        if method == "SAW":
            result = solve_saw(enhanced_matrix, enhanced_weights, enhanced_types)
        else:
            result = solve_topsis(enhanced_matrix, enhanced_weights, enhanced_types)

        scores = result["scores"]

        # --- Build ranked output ---
        ranked = sorted(
            range(n_alts), key=lambda i: scores[i], reverse=True
        )

        feature_importance = self.learner.get_feature_importance()
        # Exclude the target column and any column that looks like an output
        # from the displayed key drivers
        target_col = self.learner.target_name
        top_drivers = [
            k for k in feature_importance.keys()
            if k != target_col
        ][:3]

        rankings = []
        for rank_pos, alt_idx in enumerate(ranked):
            conf = float(ml_confidence[alt_idx]) if ml_confidence else 0.80
            ml_pred_val = float(ml_predictions[alt_idx]) if ml_predictions is not None else None

            explanation = f"Peringkat #{rank_pos + 1} berdasarkan {method}"
            if ml_pred_val is not None:
                explanation += f" | Prediksi ML: {ml_pred_val:.2f} (kepercayaan {conf:.0%})"

            rankings.append({
                "rank": rank_pos + 1,
                "alternative_index": alt_idx,
                "alternative_name": alternative_names[alt_idx],
                "mcdm_score": round(float(scores[alt_idx]), 6),
                "ml_prediction": round(ml_pred_val, 4) if ml_pred_val is not None else None,
                "ml_confidence": round(conf, 4),
                "explanation": explanation,
                "key_drivers": top_drivers,
            })

        return {
            "method": method,
            "ml_integrated": ml_predictions is not None,
            "rankings": rankings,
            "feature_importance": feature_importance,
            "criteria_used": enhanced_names,
            "weights_used": [round(w, 4) for w in enhanced_weights],
        }

    # ------------------------------------------------------------------ #
    #  Sensitivity analysis with ML confidence bounds                     #
    # ------------------------------------------------------------------ #

    def sensitivity_with_ml(
        self,
        matrix: List[List[float]],
        base_weights: List[float],
        criteria_types: List[str],
        criteria_names: List[str],
        alternative_names: List[str],
        vary_criterion_idx: int,
        method: str = "TOPSIS",
        steps: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Sweep the weight of one criterion from 0.05 → 0.95 and record
        how rankings + ML confidence change.
        """
        results = []
        n_crits = len(base_weights)

        for step_val in np.linspace(0.05, 0.95, steps):
            # Build modified weights
            new_weights = list(base_weights)
            new_weights[vary_criterion_idx] = float(step_val)

            # Redistribute remaining weight proportionally
            other_sum = sum(w for i, w in enumerate(base_weights) if i != vary_criterion_idx)
            remaining = 1.0 - step_val
            for i in range(n_crits):
                if i != vary_criterion_idx:
                    new_weights[i] = (
                        base_weights[i] / other_sum * remaining
                        if other_sum > 0
                        else remaining / (n_crits - 1)
                    )

            # Solve
            try:
                sol = self.integrated_solve(
                    matrix=matrix,
                    weights=new_weights,
                    criteria_types=criteria_types,
                    criteria_names=criteria_names,
                    alternative_names=alternative_names,
                    method=method,
                    use_ml_prediction=bool(self.learner.models),
                    ml_weight=0.15,
                )
                for r in sol["rankings"]:
                    results.append({
                        "varied_criterion": criteria_names[vary_criterion_idx],
                        "varied_weight": round(float(step_val), 3),
                        "rank": r["rank"],
                        "alternative": r["alternative_name"],
                        "mcdm_score": r["mcdm_score"],
                        "ml_confidence": r["ml_confidence"],
                    })
            except Exception:
                pass

        return results
