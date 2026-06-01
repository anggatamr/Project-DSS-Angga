"""
SmartDataProfiler — Auto-detects data types, semantic roles, quality,
and recommends ML models for ANY uploaded dataset.
"""
from dataclasses import dataclass, field
from typing import Dict, List, Any, Tuple, Optional
import pandas as pd
import numpy as np


@dataclass
class ColumnProfile:
    name: str
    data_type: str          # numeric | categorical | ordinal | temporal | text
    semantic_role: str      # identifier | feature | target | metadata
    statistics: Dict[str, Any]
    correlations: Dict[str, float]
    missing_pct: float
    unique_count: int
    cardinality: str        # low | medium | high
    distribution_type: str  # normal | right_skewed | left_skewed | bimodal | uniform | categorical


@dataclass
class DatasetProfile:
    name: str
    shape: Tuple[int, int]
    columns: List[ColumnProfile]
    target_candidates: List[str]
    feature_candidates: List[str]
    relationships: Dict[str, List[Any]]
    quality_score: float
    recommended_models: List[str]
    transformation_needed: Dict[str, List[str]]


class SmartDataProfiler:
    """Universal data understanding engine — works with ANY dataset."""

    def profile_dataset(self, df: pd.DataFrame, dataset_name: str = "uploaded_dataset") -> DatasetProfile:
        columns_profile = []
        for col in df.columns:
            col_profile = self._profile_column(df, col)
            columns_profile.append(col_profile)

        target_candidates = self._identify_targets(columns_profile, df)
        feature_candidates = [
            c.name for c in columns_profile
            if c.name not in target_candidates and c.semantic_role not in ("identifier", "metadata")
        ]

        relationships = self._detect_relationships(df, columns_profile)
        recommended_models = self._recommend_models(columns_profile, target_candidates, df.shape)
        quality_score = self._calculate_quality_score(columns_profile)
        transformations = self._plan_transformations(columns_profile)

        return DatasetProfile(
            name=dataset_name,
            shape=df.shape,
            columns=columns_profile,
            target_candidates=target_candidates,
            feature_candidates=feature_candidates,
            relationships=relationships,
            quality_score=quality_score,
            recommended_models=recommended_models,
            transformation_needed=transformations,
        )

    # ------------------------------------------------------------------ #
    #  Column-level analysis                                               #
    # ------------------------------------------------------------------ #

    def _profile_column(self, df: pd.DataFrame, col: str) -> ColumnProfile:
        series = df[col]
        data_type = self._detect_data_type(series)
        semantic_role = self._infer_semantic_role(series, col, data_type)
        statistics = self._calculate_statistics(series, data_type)
        dist_type = self._detect_distribution(series) if data_type == "numeric" else "categorical"

        correlations: Dict[str, float] = {}
        if data_type == "numeric":
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            for other_col in numeric_cols:
                if other_col != col:
                    try:
                        corr = float(series.corr(df[other_col]))
                        if not np.isnan(corr) and abs(corr) > 0.3:
                            correlations[other_col] = round(corr, 4)
                    except Exception:
                        pass

        return ColumnProfile(
            name=col,
            data_type=data_type,
            semantic_role=semantic_role,
            statistics=statistics,
            correlations=correlations,
            missing_pct=float(series.isnull().sum() / max(len(series), 1)),
            unique_count=int(series.nunique()),
            cardinality=self._assess_cardinality(series),
            distribution_type=dist_type,
        )

    def _detect_data_type(self, series: pd.Series) -> str:
        if pd.api.types.is_numeric_dtype(series):
            return "numeric"
        if pd.api.types.is_datetime64_any_dtype(series):
            return "temporal"
        # Try parsing as datetime
        try:
            pd.to_datetime(series.dropna().head(5))
            return "temporal"
        except Exception:
            pass

        unique_ratio = series.nunique() / max(len(series), 1)
        if self._looks_ordinal(series):
            return "ordinal"
        if unique_ratio < 0.1 or series.nunique() < 20:
            return "categorical"
        if unique_ratio > 0.5:
            return "text"
        return "categorical"

    def _infer_semantic_role(self, series: pd.Series, col: str, data_type: str) -> str:
        col_lower = col.lower()
        id_keywords = ["id", "index", "code", "serial", "no", "num", "uuid", "key"]
        if any(kw == col_lower or col_lower.endswith(f"_{kw}") or col_lower.startswith(f"{kw}_")
               for kw in id_keywords):
            return "identifier"
        if data_type == "text" and series.nunique() > 50:
            return "metadata"
        target_keywords = [
            "price", "cost", "score", "rating", "decision", "outcome",
            "target", "label", "result", "performance", "salary", "revenue",
            "profit", "value", "grade", "rank", "quality", "hiring"
        ]
        if any(kw in col_lower for kw in target_keywords):
            return "target"
        return "feature"

    def _calculate_statistics(self, series: pd.Series, data_type: str) -> Dict[str, Any]:
        if data_type == "numeric":
            clean = series.dropna()
            if len(clean) == 0:
                return {}
            try:
                from scipy.stats import skew as _skew, kurtosis as _kurt
                skewness = float(_skew(clean))
                kurt = float(_kurt(clean))
            except Exception:
                skewness, kurt = 0.0, 0.0
            return {
                "mean": round(float(clean.mean()), 4),
                "median": round(float(clean.median()), 4),
                "std": round(float(clean.std()), 4),
                "min": round(float(clean.min()), 4),
                "max": round(float(clean.max()), 4),
                "q1": round(float(clean.quantile(0.25)), 4),
                "q3": round(float(clean.quantile(0.75)), 4),
                "skewness": round(skewness, 4),
                "kurtosis": round(kurt, 4),
                "iqr": round(float(clean.quantile(0.75) - clean.quantile(0.25)), 4),
            }
        else:
            vc = series.value_counts()
            return {
                "unique_values": int(series.nunique()),
                "most_common": {str(k): int(v) for k, v in vc.head(5).items()},
                "entropy": round(self._calculate_entropy(series), 4),
            }

    def _detect_distribution(self, series: pd.Series) -> str:
        clean = series.dropna()
        if len(clean) < 4:
            return "unknown"
        try:
            from scipy.stats import skew as _skew, kurtosis as _kurt
            skewness = float(_skew(clean))
            kurt = float(_kurt(clean))
        except Exception:
            return "unknown"
        if abs(skewness) < 0.5:
            return "normal"
        if skewness > 1:
            return "right_skewed"
        if skewness < -1:
            return "left_skewed"
        if abs(kurt) > 2:
            return "bimodal"
        return "uniform"

    def _assess_cardinality(self, series: pd.Series) -> str:
        ratio = series.nunique() / max(len(series), 1)
        if ratio < 0.01:
            return "low"
        if ratio < 0.3:
            return "medium"
        return "high"

    def _looks_ordinal(self, series: pd.Series) -> bool:
        ordinal_words = {
            "low", "medium", "high", "small", "large",
            "poor", "fair", "good", "excellent",
            "beginner", "intermediate", "advanced", "expert",
            "never", "rarely", "sometimes", "often", "always",
        }
        sample = series.dropna().astype(str).str.lower().unique()
        matches = sum(1 for v in sample if v in ordinal_words)
        return matches >= 2

    def _calculate_entropy(self, series: pd.Series) -> float:
        vc = series.value_counts(normalize=True)
        return float(-np.sum(vc * np.log2(vc + 1e-10)))

    # ------------------------------------------------------------------ #
    #  Dataset-level analysis                                              #
    # ------------------------------------------------------------------ #

    def _identify_targets(self, columns: List[ColumnProfile], df: pd.DataFrame) -> List[str]:
        targets = [c.name for c in columns if c.semantic_role == "target"]
        if not targets:
            numeric_cols = [c for c in columns if c.data_type == "numeric"]
            if numeric_cols:
                targets = [numeric_cols[-1].name]
        return targets

    def _detect_relationships(self, df: pd.DataFrame, columns: List[ColumnProfile]) -> Dict[str, List[Any]]:
        relationships: Dict[str, List[Any]] = {}
        numeric_cols = [c.name for c in columns if c.data_type == "numeric"]
        for i, col in enumerate(numeric_cols):
            for other_col in numeric_cols[i + 1:]:
                try:
                    corr = float(df[col].corr(df[other_col]))
                    if not np.isnan(corr) and abs(corr) > 0.7:
                        relationships.setdefault(col, []).append([other_col, round(corr, 4)])
                except Exception:
                    pass
        return relationships

    def _recommend_models(
        self,
        columns: List[ColumnProfile],
        targets: List[str],
        shape: Tuple[int, int],
    ) -> List[str]:
        n_rows, _ = shape
        if not targets:
            return ["kmeans", "hierarchical_clustering"]

        target_profiles = [c for c in columns if c.name == targets[0]]
        if not target_profiles:
            return ["random_forest_regressor", "xgboost_regressor", "linear_regression"]

        target_col = target_profiles[0]
        if target_col.data_type == "numeric":
            models = ["random_forest_regressor", "xgboost_regressor", "linear_regression"]
        else:
            models = ["random_forest_classifier", "xgboost_classifier", "logistic_regression"]

        return models

    def _calculate_quality_score(self, columns: List[ColumnProfile]) -> float:
        if not columns:
            return 0.0
        missing_penalty = float(np.mean([c.missing_pct for c in columns]))
        variance_score = float(np.mean([
            1.0 if c.data_type == "numeric" and c.statistics.get("std", 0) > 0 else 0.5
            for c in columns
        ]))
        quality = 1.0 - (0.5 * missing_penalty) - (0.5 * (1.0 - variance_score))
        return round(max(0.0, min(1.0, quality)), 4)

    def _plan_transformations(self, columns: List[ColumnProfile]) -> Dict[str, List[str]]:
        transformations: Dict[str, List[str]] = {}
        for col in columns:
            steps: List[str] = []
            if col.missing_pct > 0.01:
                steps.append("handle_missing_values")
            if col.data_type == "numeric":
                if abs(col.statistics.get("skewness", 0)) > 1:
                    steps.append("handle_outliers")
                data_range = col.statistics.get("max", 1) - col.statistics.get("min", 0)
                if data_range > 100:
                    steps.append("scale_normalize")
            if col.data_type in ("categorical", "ordinal"):
                steps.append("encode_categorical")
            if steps:
                transformations[col.name] = steps
        return transformations

    # ------------------------------------------------------------------ #
    #  Serialization helper                                                #
    # ------------------------------------------------------------------ #

    def serialize_profile(self, profile: DatasetProfile) -> Dict[str, Any]:
        return {
            "name": profile.name,
            "shape": list(profile.shape),
            "quality_score": profile.quality_score,
            "target_candidates": profile.target_candidates,
            "feature_candidates": profile.feature_candidates,
            "recommended_models": profile.recommended_models,
            "transformation_needed": profile.transformation_needed,
            "relationships": {k: v for k, v in profile.relationships.items()},
            "columns": [
                {
                    "name": c.name,
                    "data_type": c.data_type,
                    "semantic_role": c.semantic_role,
                    "missing_pct": round(c.missing_pct, 4),
                    "unique_count": c.unique_count,
                    "cardinality": c.cardinality,
                    "distribution_type": c.distribution_type,
                    "statistics": c.statistics,
                    "correlations": c.correlations,
                }
                for c in profile.columns
            ],
        }
