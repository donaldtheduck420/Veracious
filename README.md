# Veracious
## Inspiration
Our social media feeds are optimized for speed and engagement, not clarity. Veracious started from a simple frustration. You can scroll past dozens of strong political claims, feel persuaded or outraged, and never pause to ask “what framing is this coming from?” We wanted a small “context layer” that helps people spot ideological tilt without telling them what to believe. And to just give a quick nudge to folks to think critically before liking, replying, or reposting.
## What it does
Veracious is a browser extension that adds real-time perspective labels directly on posts in your X/Twitter timeline.

Detects visible posts as you scroll

Sends the text to an analysis service

Shows a confidence score and a short rationale

The goal is not to “fact-check.” It’s to become aware of the frames on your daily consumption: making bias/lean more visible so users can slow down and evaluate content more thoughtfully.

## How we built it

How we built it

We built Veracious as a three-layer system. The Chrome extension uses a content script to detect visible tweets as you scroll and batches them every 30 seconds via POST to our backend. The backend is a Python FastAPI server running in WSL that sends tweet batches to Gemini 2.5 Flash which classifies each tweet's political lean, manipulation score, emotional tone, and topic cluster, returning structured JSON. The React + Vite dashboard visualizes everything: a live manipulation score, political compass with per-tweet XY coordinates, topic donut chart, emotional tone breakdown, and a full Gemini-written session report. We also integrated ElevenLabs to generate a spoken audio digest of your feed analysis, and Actian VectorAI DB to store tweet embeddings for semantic similarity search.

## Challenges we ran into

X/Twitter's frontend is a heavily dynamic React app where the DOM structure changes constantly and tweet elements are virtualized, so reliably selecting and deduplicating visible post text required careful selection tuning. Getting Gemini to return consistent, parseable JSON across wildly different tweet styles (memes, breaking news, personal posts) required significant testing, especially for edge cases like sarcasm and ambiguous political content. We also had to carefully handle real-time score averaging across batches without double-counting tweets. Cross-environment development (extension & frontend on Windows, backend on WSL) also added friction around CORS, localhost routing, and private network access headers that took time to debug. Additionally, there were dependency conflicts between FastAPI and vectorDB, thus we had to have two separate virtual environments.

## Accomplishments that we're proud of
End-to-end working pipeline: visible posts to analysis and to badges injected in-feed.

Readable, minimal UI: users get context without being overwhelmed.

Built for iteration: the label logic and UI are modular so we can tune prompts, thresholds, and styles quickly.

Bias-aware by design: we explicitly include “Unclear” to reduce overconfidence and avoid misleading certainty.

## What we learned

How to build a real product on top of a constantly changing web app (X/Twitter’s UI).

How easily models can be overconfident and why confidence, calibration, and “Unclear” matter.

That “helpful context” works best when it’s non-judgmental and lets the user stay in control.

## What's next for Veracious

User controls: sensitivity slider, topic filters, hide/show confidence, and per-label color customization.

Privacy upgrades: on-device preprocessing, minimal logging, and clearer data handling.

Multilingual support and better handling of sarcasm/memes.

Evaluation + calibration: build a small labeled dataset and measure accuracy across sources to reduce systematic skew.

More surfaces: label quoted tweets, replies, and linked articles and not just the main feed.

Expansion onto other social media platforms.
