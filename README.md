# FactGuard AI

FactGuard AI is a GenLayer-based misinformation checking MVP.

It gives you:
- a **static frontend** that can be deployed to **GitHub Pages**
- a **GenLayer intelligent contract** that evaluates a claim against pasted source text, optional source URLs, and optional webpage screenshots
- a structured output with:
  - verdict
  - confidence
  - explanation
  - supporting points
  - counter points
  - warnings
  - cited URLs

## Project structure

```text
factguard-ai/
├── contracts/
│   └── fact_guard.py
├── deploy/
│   └── 001_deploy_fact_guard.ts
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env.example
├── tests/
│   └── direct/
│       └── test_fact_guard.py
├── .github/
│   └── workflows/
│       └── deploy-pages.yml
├── package.json
├── requirements.txt
└── README.md
```

## What this MVP is good at

This version works best when the user provides:
- the **exact claim** to verify
- the **source text** or **video transcript excerpt**
- optionally **1 to 3 URLs** for corroboration

That makes it practical for:
- article checking
- tweet / thread checking
- video transcript checking
- checking suspicious copied text

## Contract behavior

The contract:
1. receives a claim, source text, notes, and optional URLs
2. fetches up to **3** source URLs
3. extracts stable factual hints from fetched pages
4. optionally captures a **screenshot of the first URL**
5. asks GenLayer to produce a consensus-backed verdict
6. stores the full report on-chain

## Frontend behavior

The frontend:
- connects a wallet
- lets the user set the contract address and network
- submits verification requests
- waits for the accepted transaction receipt
- reads the stored report back from the contract
- shows recent reports in a polished UI

---

## Quick start

### 1) Frontend local run

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Set these in `frontend/.env`:

```env
VITE_GENLAYER_NETWORK=studionet
VITE_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT
VITE_BASE_PATH=/
```

---

### 2) Deploy the contract

You can deploy with **GenLayer Studio** or **GenLayer CLI**.

### Option A — GenLayer Studio

1. Open GenLayer Studio.
2. Upload `contracts/fact_guard.py`.
3. Deploy it with an empty constructor.
4. Copy the deployed contract address.
5. Paste that address into the frontend config.

### Option B — GenLayer CLI

Install the CLI first if needed.

Then from the project root:

```bash
genlayer network
genlayer deploy
```

The deploy script in `deploy/001_deploy_fact_guard.ts` deploys `contracts/fact_guard.py` and prints the contract address.

---

### 3) Run direct tests

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest tests/direct -v
```

On Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pytest tests/direct -v
```

---

## Deploying the frontend to GitHub Pages

The workflow is already included:

```text
.github/workflows/deploy-pages.yml
```

### Steps

1. Push the repo to GitHub.
2. In the repository settings, enable **GitHub Pages** with **GitHub Actions**.
3. Add a repository variable:
   - `VITE_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT`
4. Push to `main`.
5. GitHub Actions will build and deploy the `frontend/dist` output.

The workflow automatically sets:
- `VITE_BASE_PATH=/<repo-name>/`

So the app works correctly on GitHub Pages subpaths.

---

## Notes and practical limitations

This is a real MVP, but there are some practical caveats:

1. **Best results require real source text.**
   If you only paste a vague claim without source text, the verdict will usually be weak.

2. **Dynamic websites may be noisy.**
   Some pages change quickly, inject ads, or block scraping. The contract already treats that as uncertainty and warnings.

3. **Video fact-checking works through transcript text.**
   This MVP does not download video audio itself. For videos, paste the transcript segment and optionally add the video URL.

4. **GitHub Pages only hosts the frontend.**
   The actual verification logic lives in the GenLayer contract.

---

## Suggested next improvements

Good next steps after this MVP:
- add report sharing links
- add wallet-based user history
- add source credibility scoring
- add multi-claim extraction from long articles
- add language detection and auto-translation
- add screenshot preview / evidence gallery
- add moderator mode for newsroom or research teams

---

## Recommended workflow for you

1. Deploy the contract to GenLayer Studio.
2. Put the contract address into the frontend env.
3. Run locally once.
4. Push to GitHub.
5. Let GitHub Pages host the frontend.
6. Start testing with real articles, tweets, and transcript snippets.
