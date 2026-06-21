# percept

**An interactive explorer for population-average cortical-response predictions from video.**

percept turns an uploaded video into a time-scrubbable view of Meta's [TRIBE v2](https://huggingface.co/facebook/tribev2) cortical-response predictions. It pairs an anatomical WebGL cortex with frame-level response charts, cortical proxy summaries, and a compact video timeline.

## What it includes

- Video upload, playback, and frame-accurate timeline scrubbing
- Live WebGL view of the fsaverage5 pial cortical surface
- Four explicitly labelled cortical surface-proxy summaries
- Response charts, proxy breakdowns, and a model-provenance audit strip
- Multiple visual colour schemes

## How it works

With the local worker running, percept sends an uploaded video to `facebook/tribev2`. The model extracts video, audio, and language features and returns predicted average-subject fMRI-style responses on the fsaverage5 cortical mesh. The worker then aggregates the surface output over four manually defined display regions for the browser.

The interface also works without the worker as a clearly labelled visual preview using synthetic data.

## Run locally

### One-command setup

Requirements: Node.js 20+, Python 3.11 or 3.12, and `ffmpeg`.

```bash
chmod +x run.sh
./run.sh
```

The launcher creates a local Python environment, installs worker dependencies as needed, finds free ports, starts the TRIBE v2 worker and Next.js app, and connects them automatically.

TRIBE v2's language feature path can require access to Meta's gated `meta-llama/Llama-3.2-3B` model. Add a Hugging Face read token if needed:

```bash
HF_TOKEN=hf_your_token ./run.sh
```

For a persistent local setup, put `HF_TOKEN` in `.env.local`; that file is ignored by Git.

### Run the frontend only

```bash
npm install
npm run dev
```

Without `TRIBEV2_API_URL`, the UI remains usable in visual-preview mode.

### Run the worker in Docker

```bash
cd worker
docker build -t percept-tribev2 .
docker run --rm -p 8000:8000 \
  -e HF_TOKEN=your_huggingface_read_token \
  -v tribev2-cache:/data/cache percept-tribev2
```

Then set `TRIBEV2_API_URL=http://localhost:8000` in `.env.local` and restart the frontend.

## Scientific scope

TRIBE v2 predicts **population-average cortical responses** to naturalistic stimuli. percept's four surface regions are manually defined display proxies. They are not direct measurements of emotion, reward, desire, intent, self-relevance, memory encoding, subcortical activity, an individual viewer's mental state, or health.

percept is a research/visualization interface—not an fMRI scanner, diagnostic tool, or behavioral truth machine.

## Development checks

```bash
npm run lint
npm run build
```
