# SentinelCore — SOC Anomaly Detection System

**SentinelCore** is a real-time endpoint monitoring system for Security Operations Centers (SOC). It combines Machine Learning with expert rule-based detection to identify threats across monitored endpoints.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![scikit-learn](https://img.shields.io/badge/scikit--learn-ML-F7931E?style=for-the-badge&logo=scikit-learn)
![MITRE ATT&CK](https://img.shields.io/badge/MITRE-ATT%26CK-red?style=for-the-badge)

---

## How It Works

Every process running on a monitored endpoint is collected by a lightweight agent (psutil) and sent to the FastAPI backend every 8 seconds. The backend runs a **three-layer hybrid scoring engine**:

1. **ML Layer** — Isolation Forest (200 trees, 21 features) detects statistically anomalous processes using unsupervised learning. No labelled data required.
2. **Rule Layer** — 37 regex rules covering real-world attack patterns (reverse shells, C2 indicators, base64 obfuscation, mimikatz, etc.) apply weighted score boosts.
3. **MITRE ATT&CK Layer** — 35 techniques across 9 tactics identify and name the attack type (T1059, T1003, T1071, etc.).

**Final score formula:**
```
base  = max(ml_probability, rule_boost × 0.7)
score = base + mitre_contribution
```

**Severity thresholds:** CRITICAL ≥ 0.60 | HIGH ≥ 0.45 | MEDIUM ≥ 0.30 | LOW ≥ 0.12

---

## Key Features

- **Real-time endpoint monitoring** via cross-platform Python agent (macOS / Linux / Windows)
- **Hybrid scoring** — ML and rules back each other up; if one misses, the other catches
- **MITRE ATT&CK mapping** — 35 techniques, 9 tactics auto-identified per event
- **Telegram alerts** — instant notifications for HIGH and CRITICAL severity events
- **AI forensic reports** — on-demand analysis via Google Gemini 2.0 Flash
- **Interactive dashboard** — Next.js 15 with charts, filters, and event timeline
- **Retrain button** — retrains the Isolation Forest model on all current DB events
- **JWT authentication** with role-based access

---

## Results

| Metric | Value |
|--------|-------|
| Precision | 1.0 |
| Recall | 1.0 |
| F1 Score | 1.0 |
| Mean API response | < 20ms |
| Test set | 40 events (20 normal + 20 attacks) |
| Attacks detected | 20 / 20 |
| False positives | 0 |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.10, FastAPI, SQLAlchemy |
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Recharts |
| ML | scikit-learn, Isolation Forest |
| Database | SQLite (PostgreSQL supported) |
| Agent | psutil, requests |
| AI | Google Gemini 2.0 Flash |
| Auth | JWT, bcrypt |
| Alerts | Telegram Bot API |

---

## Quick Start

```bash
git clone https://github.com/onegealibek06/soc-anomaly-app.git
cd soc-anomaly-app
pip install -r requirements.txt
cp .env.example .env  # add your GEMINI_API_KEY and TELEGRAM credentials
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

Agent (on monitored machine):
```bash
python agent.py
# or: python agent.py --interval 5 --once
```

---

## Project Structure

```
soc-anomaly-app/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── anomaly_detector.py  # Hybrid scoring engine
│   ├── ai_engine.py         # Gemini forensic reports
│   ├── models.py            # DB models
│   └── routers/             # auth, events, settings
├── mitre_mapper.py          # 37 rules, 35 MITRE techniques
├── agent.py                 # Endpoint monitoring agent
├── frontend/                # Next.js 15 dashboard
└── evaluate_model.py        # Model evaluation script
```

---

## Thesis

This project was developed as a Bachelor's thesis at **Astana IT University** (6B06301 — Cybersecurity).

**Grade: 100/100**

*"Creation of Application for Anomaly Detection in Endpoint Telemetry for SOC Incident Response Automation with ML"*

---

## Author

**Onege Alibek** — [@onegealibek](https://t.me/onegealibek) | [GitHub](https://github.com/onegealibek06)
