"""
Simple in-process model store.
Keeps trained DynamicLearner instances alive for the duration of the server process.
Falls back to disk if the in-memory entry is missing (e.g. after restart).
"""
from __future__ import annotations

from typing import Dict, Optional

from app.services.ml.dynamic_learner import DynamicLearner

_store: Dict[str, DynamicLearner] = {}


def save_learner(learner: DynamicLearner) -> str:
    """Persist learner in memory (and optionally to disk). Returns model_id."""
    _store[learner.model_id] = learner
    try:
        learner.save()
    except Exception:
        pass  # disk save is best-effort
    return learner.model_id


def get_learner(model_id: str) -> DynamicLearner:
    """Retrieve learner by model_id. Raises KeyError if not found."""
    if model_id in _store:
        return _store[model_id]
    # Try disk
    try:
        learner = DynamicLearner.load(model_id)
        _store[model_id] = learner
        return learner
    except FileNotFoundError:
        raise KeyError(f"Model '{model_id}' tidak ditemukan. Silakan latih ulang model.")


def list_models() -> list:
    return [
        {
            "model_id": mid,
            "target": l.target_name,
            "task_type": l.task_type,
            "best_model": l.best_model_name,
            "features": l.feature_names,
        }
        for mid, l in _store.items()
    ]
