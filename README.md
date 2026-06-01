# 🧠 Sistem Pendukung Keputusan (DSS) — Advanced MCDM + Universal ML Engine

> **Mata Kuliah:** Teori Pengambilan Keputusan (TPK)  
> **Author:** Angga Tamara — Statistika, UNIMED  
> **Stack:** FastAPI · React · SQLite · scikit-learn · XGBoost

A full-stack Decision Support System that combines classical Multi-Criteria Decision Making (MCDM) methods with a Universal Machine Learning Engine. Upload any dataset, auto-profile it, train ML models, and get AI-enhanced rankings with confidence scores — all in one dashboard.

---

## 📸 Features at a Glance

| Feature | Description |
|---|---|
| **TOPSIS** | Technique for Order of Preference by Similarity to Ideal Solution |
| **SAW** | Simple Additive Weighting |
| **AHP** | Analytic Hierarchy Process with pairwise comparison & consistency check |
| **Dual-Method Comparison** | Run TOPSIS + SAW simultaneously, compare with Spearman correlation |
| **Universal ML Engine** | Auto-profile any dataset → train Random Forest / XGBoost / Linear models → MCDM+ML integrated ranking |
| **What-If Scenarios** | Save & compare multiple weight configurations side-by-side |
| **Robustness Index** | Monte Carlo simulation (1,000 iterations) to measure ranking stability |
| **Goal-Seek Solver** | Bisection optimizer — finds the minimum criterion value needed to reach a target rank |
| **Sensitivity Analysis** | Real-time slider-based weight manipulation with live chart updates (<100ms) |
| **Criteria Correlation Heatmap** | Pearson correlation matrix to detect redundant criteria |
| **Sanity Check Report** | Post-calculation anomaly detection + data quality metrics |
| **Quick Start Templates** | Pre-loaded datasets: Laptop, Rekrutmen, Supplier, Universitas |
| **Dark Mode** | Full dark theme with CSS variable overrides |
| **PDF Report** | Academic-grade PDF export via ReportLab |

---

## 🏗️ Architecture

```
Project-DSS-Angga/
├── backend/                    # FastAPI Python backend
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints/
│   │   │       ├── projects.py         # Project CRUD + dataset loaders
│   │   │       ├── solver.py           # MCDM calculation endpoints
│   │   │       ├── analytics.py        # Goal-seek, Monte Carlo, What-If
│   │   │       └── ml_solver.py        # Universal ML Engine endpoints
│   │   ├── services/
│   │   │   ├── topsis.py               # TOPSIS algorithm
│   │   │   ├── saw.py                  # SAW algorithm
│   │   │   ├── ahp.py                  # AHP pairwise + consistency ratio
│   │   │   ├── analytics_solvers.py    # Bisection goal-seek + Monte Carlo
│   │   │   ├── pdf_generator.py        # ReportLab PDF export
│   │   │   └── ml/
│   │   │       ├── data_profiler.py    # SmartDataProfiler
│   │   │       ├── dynamic_learner.py  # DynamicLearner (multi-model trainer)
│   │   │       ├── mcdm_ml_integrator.py # MCDMMLIntegrator
│   │   │       └── model_store.py      # In-memory + disk model registry
│   │   ├── models/
│   │   │   └── database.py             # SQLAlchemy ORM models
│   │   ├── schemas/
│   │   │   ├── project.py
│   │   │   ├── analytics.py
│   │   │   └── ml.py
│   │   └── main.py                     # FastAPI app + CORS
│   ├── dss_database.db                 # SQLite database (auto-created)
│   └── requirements.txt
│
├── frontend/                   # Vite + React frontend
│   └── src/
│       ├── App.jsx                     # Root component (4-step wizard)
│       ├── index.css                   # Design tokens + dark mode
│       ├── components/
│       │   ├── Wizard.jsx              # Step progress bar
│       │   ├── MatrixInputTable.jsx    # Decision matrix editor
│       │   ├── AHPMatrixInput.jsx      # Pairwise comparison input
│       │   ├── SensitivitySlider.jsx   # Weight sliders
│       │   ├── ResultsChart.jsx        # Dual-method bar chart
│       │   ├── RadarChart.jsx          # Spider/radar chart
│       │   ├── ScenarioManager.jsx     # Save & compare weight scenarios
│       │   ├── RobustnessIndex.jsx     # Monte Carlo stability gauge
│       │   ├── CorrelationHeatmap.jsx  # Criteria correlation matrix
│       │   ├── SanityCheckReport.jsx   # Post-calc anomaly report
│       │   ├── QuickStartTemplates.jsx # Pre-loaded dataset templates
│       │   ├── OnboardingGuide.jsx     # Step-by-step guide banners
│       │   ├── Toast.jsx               # Notification system
│       │   ├── AnimatedNumber.jsx      # Smooth number transitions
│       │   ├── SkeletonLoader.jsx      # Loading skeletons
│       │   └── ml/
│       │       ├── MLEnginePanel.jsx   # 4-step ML workflow orchestrator
│       │       ├── MLDataProfiler.jsx  # Upload + auto-profile UI
│       │       ├── MLTrainer.jsx       # Model training + metrics UI
│       │       ├── MLFeatureImportance.jsx # Feature importance bar chart
│       │       ├── MLIntegratedResults.jsx # MCDM+ML ranking table
│       │       └── MLSensitivityChart.jsx  # SVG sensitivity line chart
│       └── utils/
│           ├── clientSolver.js         # Client-side TOPSIS + SAW (<10ms)
│           ├── spearman.js             # Spearman rank correlation
│           ├── correlationAnalysis.js  # Pearson correlation + heatmap data
│           └── dataQuality.js          # Data quality metrics + sanity check
│
├── laptop_price - dataset.csv  # Sample laptop dataset (30 rows)
├── recruitment_data.csv        # Sample recruitment dataset (10 rows)
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+** (tested on 3.13)
- **Node.js 18+**
- Git

### 1. Clone the repository

```bash
git clone https://github.com/anggatamr/Project-DSS-Angga.git
cd Project-DSS-Angga
```

### 2. Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend will be available at: `http://127.0.0.1:8000`  
Interactive API docs: `http://127.0.0.1:8000/docs`

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at: `http://localhost:5173`

> Run backend and frontend in **two separate terminals** simultaneously.

---

## 📡 API Reference

Base URL: `http://127.0.0.1:8000/api/v1`

### Projects

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/projects/` | Create a new decision project |
| `GET` | `/projects/` | List all projects |
| `GET` | `/projects/{id}` | Get project details |
| `POST` | `/projects/{id}/setup` | Save criteria, alternatives & matrix |
| `DELETE` | `/projects/{id}` | Delete a project |
| `GET` | `/projects/{id}/report` | Download academic PDF report |
| `GET` | `/projects/laptop/dataset-sample` | Load laptop dataset sample |
| `GET` | `/projects/recruitment/dataset-sample` | Load recruitment dataset sample |
| `POST` | `/projects/import-csv` | Upload & parse CSV/Excel file |

### Solver

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/solver/validate` | Validate decision matrix |
| `POST` | `/solver/ahp-validate` | Validate AHP pairwise matrix + compute CR |
| `POST` | `/solver/calculate` | Run TOPSIS or SAW calculation |
| `POST` | `/solver/sensitivity` | Recalculate with modified weights (no DB write) |

### Analytics

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/analytics/what-if` | Instant recalculation on modified data |
| `POST` | `/analytics/goal-seek` | Bisection optimizer for target rank |
| `POST` | `/analytics/risk-monte` | Monte Carlo stability simulation |

### Machine Learning

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/ml/profile-dataset` | Auto-profile any CSV/Excel dataset |
| `POST` | `/ml/train-model` | Train ML models with auto-configuration |
| `POST` | `/ml/integrated-solve` | MCDM + ML combined ranking |
| `POST` | `/ml/sensitivity-with-ml` | Sensitivity analysis with ML confidence bounds |
| `GET` | `/ml/models` | List active trained models |

---

## 🧮 MCDM Methods

### TOPSIS
Ranks alternatives by their geometric distance to the positive ideal solution (A+) and negative ideal solution (A−).

```
C_i = D_i⁻ / (D_i⁺ + D_i⁻)
```

- Supports **benefit** and **cost** criteria
- Uses vector normalization
- Score range: 0 (worst) → 1 (best)

### SAW (Simple Additive Weighting)
Normalizes each criterion and computes a weighted sum.

```
V_i = Σ (w_j × r_ij)
```

- Benefit: `r_ij = x_ij / max(x_j)`
- Cost: `r_ij = min(x_j) / x_ij`

### AHP (Analytic Hierarchy Process)
Derives criterion weights from pairwise comparisons using Saaty's eigenvector method.

- Computes **Consistency Index (CI)** and **Consistency Ratio (CR)**
- CR ≤ 0.10 → matrix is acceptably consistent
- Uses Saaty's Random Index table (n = 1–10)

### Dual-Method Comparison
Both TOPSIS and SAW are always computed simultaneously. Rankings are compared using **Spearman Rank Correlation (rₛ)**:

```
rₛ = 1 - (6 × Σd²) / (n × (n² - 1))
```

Interpretation: |rₛ| ≥ 0.8 → Very Strong Correlation

---

## 🤖 Universal ML Engine

The ML Engine works with **any dataset** — no manual configuration needed.

### Workflow

```
Upload CSV/Excel
      ↓
SmartDataProfiler
  • Detects column types (numeric, categorical, ordinal, temporal, text)
  • Infers semantic roles (target, feature, identifier, metadata)
  • Calculates quality score, distributions, correlations
  • Recommends best ML models
      ↓
DynamicLearner
  • Auto-preprocesses (imputation, encoding, scaling)
  • Trains: Random Forest + XGBoost + Linear/Logistic Regression
  • Selects best model by R² (regression) or Accuracy (classification)
  • Extracts feature importance
      ↓
MCDMMLIntegrator
  • Adds ML prediction as an extra weighted criterion
  • Runs TOPSIS or SAW on the enhanced matrix
  • Returns rankings with confidence scores + explanations
      ↓
Sensitivity Analysis with ML Confidence Bounds
  • Sweeps one criterion weight from 5% → 95%
  • Records rank changes + ML confidence at each step
  • Visualized as SVG line chart with confidence bands
```

### Supported Models

| Task | Models |
|---|---|
| Regression | Random Forest Regressor, XGBoost Regressor, Linear Regression |
| Classification | Random Forest Classifier, XGBoost Classifier, Logistic Regression |

### Column Semantic Roles

| Role | Detection Logic |
|---|---|
| `target` | Keywords: price, cost, score, rating, decision, outcome, salary, etc. |
| `identifier` | Keywords: id, index, code, serial, uuid, key |
| `metadata` | Text columns with high cardinality (>50 unique values) |
| `feature` | Everything else |

---

## 🎨 UI Features

### 4-Step Wizard
1. **Karakteristik Masalah** — Questionnaire to recommend TOPSIS vs SAW vs AHP
2. **Matriks & Kriteria** — Decision matrix editor with inline editing, CSV import, Quick Start templates
3. **Analisis Sensitivitas** — Weight sliders, What-If matrix, dual-method chart, Goal-Seek solver, ML Engine
4. **Hasil Akhir** — Final recommendation, full ranking table, PDF export

### Quick Start Templates

| Template | Data Source | Method |
|---|---|---|
| 💻 Pemilihan Laptop | `laptop_price - dataset.csv` (30 laptops) | TOPSIS |
| 👔 Seleksi Kandidat | `recruitment_data.csv` (10 candidates) | TOPSIS |
| 🏭 Pemilihan Supplier | Manual (5 suppliers) | TOPSIS |
| 🎓 Pemilihan Universitas | Manual (6 universities) | SAW |

### Scenario Manager
Save the current weight configuration as a named scenario. Compare multiple scenarios side-by-side showing Rank 1 winner and score for each.

### Robustness Index
Runs 1,000 Monte Carlo iterations perturbing weights by ±5%. Displays:
- Circular gauge with stability percentage
- Color-coded level: Sangat Stabil (≥70%) / Cukup Stabil / Kurang Stabil / Tidak Stabil (<25%)
- Full distribution bar for all alternatives

### Criteria Correlation Heatmap
Pearson correlation matrix computed client-side. Warns when |r| ≥ 0.85 (potentially redundant criteria).

### Sanity Check Report
Runs automatically after every calculation:
- **Data Quality Metrics**: completeness %, invalid cells, outlier count (z-score > 2.5)
- **Ranking Anomalies**: dominance mismatch, low top score, tight ranking detection

---

## 🗄️ Database Schema

SQLite database (`dss_database.db`) with 4 tables:

```
projects
  id (UUID PK) | title | chosen_method | created_at | updated_at

criterias
  id (UUID PK) | project_id (FK) | name | weight | type (benefit|cost)

alternatives
  id (UUID PK) | project_id (FK) | name

matrix_values
  id (INT PK) | project_id (FK) | criteria_id (FK) | alternative_id (FK) | value
  UNIQUE(project_id, criteria_id, alternative_id)
```

---

## 🛠️ Tech Stack

### Backend
| Library | Version | Purpose |
|---|---|---|
| FastAPI | ≥0.110 | REST API framework |
| Uvicorn | ≥0.28 | ASGI server |
| SQLAlchemy | ≥2.0 | ORM + SQLite |
| Pydantic | ≥2.6 | Request/response validation |
| NumPy | ≥1.26 | Matrix computations |
| Pandas | ≥2.2 | Data manipulation |
| SciPy | ≥1.13 | Statistical analysis |
| scikit-learn | ≥1.5 | ML preprocessing + models |
| XGBoost | ≥2.0 | Gradient boosting models |
| joblib | ≥1.4 | Model persistence |
| ReportLab | ≥4.1 | PDF generation |

### Frontend
| Library | Version | Purpose |
|---|---|---|
| React | ^18.2 | UI framework |
| Vite | ^5.2 | Build tool + dev server |
| Plain CSS | — | No component library; all hand-built |

> No Tailwind, no Redux, no React Router. Pure React `useState` + CSS custom properties.

---

## ⚙️ Environment Variables

### Frontend (`.env` in `/frontend`)

```env
VITE_API_URL=http://127.0.0.1:8000
```

If not set, defaults to `http://127.0.0.1:8000`.

---

## 📦 Build for Production

### Frontend

```bash
cd frontend
npm run build
# Output: frontend/dist/
```

### Backend

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 🔄 Changelog

### v3.0.0 — Universal ML Engine
- `SmartDataProfiler` — auto-detects column types, semantic roles, distributions
- `DynamicLearner` — trains Random Forest + XGBoost + Linear models, picks best
- `MCDMMLIntegrator` — bridges MCDM with ML predictions + confidence scores
- 5 new ML API endpoints (`/ml/*`)
- 6 new frontend ML components (`MLEnginePanel`, `MLDataProfiler`, `MLTrainer`, `MLFeatureImportance`, `MLIntegratedResults`, `MLSensitivityChart`)
- ML sensitivity analysis with confidence bands (SVG chart)

### v2.0.0 — Advanced Analytics & UX
- Dark mode with full CSS variable overrides
- Quick Start Templates (Laptop, Rekrutmen, Supplier, Universitas)
- Scenario Manager — save & compare weight configurations
- Robustness Index — Monte Carlo stability gauge with circular SVG gauge
- Criteria Correlation Heatmap (Pearson)
- Sanity Check Report + Data Quality metrics
- Recruitment dataset endpoint
- Error boundary in React entry point

### v1.0.0 — Core DSS
- TOPSIS + SAW dual-method computation
- AHP pairwise comparison with CR validation
- Spearman rank correlation between methods
- Goal-Seek Solver (Bisection method)
- Monte Carlo risk simulation
- Sensitivity analysis with real-time sliders
- Radar/spider chart visualization
- Academic PDF report export
- LocalStorage auto-save (5s interval)
- Confetti animation on final results

---

## 📐 Algorithms Reference

### Goal-Seek Bisection Solver
Finds the minimum/maximum value of a criterion that allows an alternative to reach a target rank.

```
L = 0 (or 1e-6 for cost)
R = max_col_value × 20

for 35 iterations:
    M = (L + R) / 2
    solve MCDM with X[target_alt][changing_crit] = M
    if score < target_score:
        L = M  (benefit) or R = M (cost)
    else:
        R = M  (benefit) or L = M (cost)
```

### Monte Carlo Stability
```
for 1000 iterations:
    perturb weights by ±5% randomly
    re-normalize weights to sum = 1
    solve MCDM
    record which alternative ranks #1

stability_rate[alt] = wins[alt] / 1000 × 100%
```

### Spearman Rank Correlation
```
rₛ = 1 - (6 × Σdᵢ²) / (n × (n² - 1))

where dᵢ = rank_TOPSIS[i] - rank_SAW[i]
```

---

## 📄 License

This project is developed for academic purposes (Teori Pengambilan Keputusan course).

---

## 👤 Author

**Angga Tamara**  
Statistics Undergraduate — Universitas Negeri Medan (UNIMED)  
GitHub: [@anggatamr](https://github.com/anggatamr)
