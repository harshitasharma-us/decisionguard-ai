# DecisionGuard AI — Self-Challenging Stock Reorder Assistant

**DecisionGuard AI** is a supply-chain & inventory reorder assistant designed for high-stakes stock management. Unlike standard AI systems that output potentially overconfident single-pass recommendations, DecisionGuard AI subjects its own initial proposals to an autonomous **Self-Challenge Loop** before presenting a final decision to human operators.

---

## 🚀 The Core Flow

```
Synthetic Inventory Data
        ↓
Single-Pass AI Recommendation
        ↓
Self-Challenge
   ├── Arguments Against (Risk of overstocking, holding costs, obsolescence)
   ├── Missing Facts (Pending bulk orders, supplier reliability, seasonal trends)
   └── Alternative Options (Split orders, safety buffer reduction, expedited shipping)
        ↓
Re-evaluation
        ↓
Final Recommendation
        ↓
Confidence Before → Confidence After
        ↓
Outcome Status: AGREES / CHANGED / UNCERTAIN
        ↓
Human Final Decision (Approval / Adjustment)
```

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons
- **Backend**: Python 3.10+, FastAPI, Uvicorn, Pydantic, python-dotenv
- **Data**: Synthetic Inventory Data (JSON & CSV)
- **AI**: Configurable LLM Driver (OpenAI / Gemini / Anthropic / Local models via environment variables)

---

## 📂 Project Structure

```
decisionguard-ai/
├── frontend/                  # React + TypeScript + Tailwind UI
│   ├── src/
│   │   ├── services/api.ts    # Frontend HTTP client
│   │   ├── types/             # TypeScript data models
│   │   ├── App.tsx            # Main application component
│   │   ├── index.css          # Tailwind CSS styles
│   │   └── main.tsx           # React bootstrap
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
├── backend/                   # FastAPI backend server
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py            # FastAPI entrypoint (GET /health)
│   ├── requirements.txt
│   └── .env.example
├── data/                      # Synthetic inventory dataset
│   ├── inventory.json         # Structured JSON SKU data
│   └── inventory.csv          # Tabular CSV SKU data
├── tests/                     # Test suite
│   ├── __init__.py
│   └── test_health.py         # Health check tests
├── docs/                      # Documentation
│   ├── ARCHITECTURE.md        # Technical architecture
│   └── FLOW_DIAGRAM.md        # Mermaid decision workflow
├── .env.example               # Root configuration template
└── README.md
```

---

## ⚡ Quick Start

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment (optional but recommended)
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --reload --port 8000
```

Verify backend health at [http://localhost:8000/health](http://localhost:8000/health) or interactive docs at [http://localhost:8000/docs](http://localhost:8000/docs).

### 2. Frontend Setup

```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Running Tests

```bash
# From the project root
pytest
```
