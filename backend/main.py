from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from pydantic import BaseModel
from google import genai
from dotenv import load_dotenv
from elevenlabs import ElevenLabs
from fastapi.responses import StreamingResponse
import os
import io
import json
import time
import httpx

latest_analysis = {
    "overall_manipulation_score": 0,
    "topics": {},
    "emotional_tone": {"anger": 0, "joy": 0, "fear": 0, "neutral": 0},
    "manipulation_signals": {"outrage_bait": 0, "fear_mongering": 0, "clickbait": 0, "deceptive_framing": 0},
    "per_tweet": [],
    "feed_summary": "",
    "safety_summary": "",
    "batch_count": 0,
    "timestamp": None
}
session_tweets = []

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

eleven = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

class PrivateNetworkMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Access-Control-Allow-Private-Network"] = "true"
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response

app.add_middleware(PrivateNetworkMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class FeedRequest(BaseModel):
    tweets: list[str]

async def store_tweet_embeddings(tweets: list[str], start_id: int):
    try:
        for i, tweet in enumerate(tweets):
            result = client.models.embed_content(
                model="gemini-embedding-001",
                contents=tweet
            )
            vector = result.embeddings[0].values
            async with httpx.AsyncClient() as http:
                await http.post("http://localhost:8001/upsert", json={
                    "id": start_id + i,
                    "vector": list(vector),
                    "payload": {"text": tweet}
                })
    except Exception as e:
        print(f"Vector storage error: {e}")

@app.post("/analyze")
async def analyze(req: FeedRequest):
    session_tweets.extend(req.tweets)

    prompt = f"""Analyze these tweets. Return JSON only, no markdown:
{{
  "overall_manipulation_score": <0-100>,
  "topics": {{"topic_name": <percent 0-100>, ...}},
  "emotional_tone": {{"anger": %, "joy": %, "fear": %, "neutral": %}},
  "manipulation_signals": {{"outrage_bait": %, "fear_mongering": %, "clickbait": %, "deceptive_framing": %}},
  "safety_summary": "<one sentence>",
  "feed_summary": "<3-4 sentences describing the actual content and conversations. What topics came up? What were people talking about? Be specific.>",
  "per_tweet": [{{"text_preview": "<20 chars>", "political_lean": "<left|right|liberal|conservative|authoritarian|libertarian|centrist|unclear>", "manipulation_score": <0-100>, "political_lean_x": <-1.0 to 1.0>, "political_lean_y": <-1.0 to 1.0>}}]
}}

Rules:
- topics should reflect ALL subjects in the feed, not just political ones
- political_lean: use unclear ONLY for sports, food, celebrity gossip, pure personal life
- ANY mention of government, crime, economy, race, religion, environment = pick a lean
- When in doubt, pick a lean over unclear
Tweets: {json.dumps(req.tweets)}"""

    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt
    )

    try:
        data = json.loads(response.text)
    except json.JSONDecodeError:
        cleaned = response.text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        data = json.loads(cleaned)


    for i, tweet_data in enumerate(data.get("per_tweet", [])):
        tweet_data["full_text"] = req.tweets[i] if i < len(req.tweets) else ""

    latest_analysis["per_tweet"].extend(data.get("per_tweet", []))
    latest_analysis["batch_count"] += 1
    n = latest_analysis["batch_count"]


    latest_analysis["overall_manipulation_score"] = round(
        (latest_analysis["overall_manipulation_score"] * (n-1) + data.get("overall_manipulation_score", 0)) / n
    )

    for k, v in data.get("topics", {}).items():
        latest_analysis["topics"][k] = latest_analysis["topics"].get(k, 0) + v

    for k in latest_analysis["emotional_tone"]:
        prev = latest_analysis["emotional_tone"][k]
        curr = data.get("emotional_tone", {}).get(k, 0)
        latest_analysis["emotional_tone"][k] = round((prev * (n-1) + curr) / n)

    for k in latest_analysis["manipulation_signals"]:
        prev = latest_analysis["manipulation_signals"][k]
        curr = data.get("manipulation_signals", {}).get(k, 0)
        latest_analysis["manipulation_signals"][k] = round((prev * (n-1) + curr) / n)

    latest_analysis["feed_summary"] = data.get("feed_summary", "")
    latest_analysis["safety_summary"] = data.get("safety_summary", "")
    latest_analysis["timestamp"] = time.time()

    start_id = len(session_tweets) - len(req.tweets)
    await store_tweet_embeddings(req.tweets, start_id)

    return data

@app.get("/results")
def results():
    if not latest_analysis:
        raise HTTPException(status_code=404, detail="No analysis yet")
    return latest_analysis

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/debug")
def debug():
    return latest_analysis

@app.post("/full-report")
async def full_report():
    if not session_tweets:
        raise HTTPException(status_code=404, detail="No tweets in session")

    prompt = f"""You are a media literacy analyst. Analyze this complete feed session of {len(session_tweets)} tweets.

Write a comprehensive report covering:
1. Overall narrative — what themes and stories dominated this feed?
2. Political landscape — what political viewpoints appeared and how were they framed?
3. Manipulation patterns — what specific tactics were used and how frequently?
4. Emotional journey — how did the emotional tone shift across the session?
5. Notable patterns — anything unusual, coordinated, or worth flagging?

Be specific and reference actual content from the tweets. Write like a media analyst briefing someone on their information diet.

Return JSON only, no markdown:
{{
  "narrative_summary": "<2-3 paragraphs on what dominated the feed>",
  "political_analysis": "<detailed breakdown of political content and framing>",
  "manipulation_analysis": "<specific tactics observed with examples>",
  "emotional_analysis": "<how tone shifted through the session>",
  "notable_patterns": "<anything unusual or worth flagging>",
  "health_score": <0-100, overall feed health where 100 is diverse and low manipulation>,
  "recommendations": "<2-3 concrete suggestions for improving feed health>"
}}

Tweets from this session:
{json.dumps(session_tweets)}"""

    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt,
        config={"temperature": 0}
    )

    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        cleaned = response.text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(cleaned)

@app.delete("/reset")
async def reset():
    session_tweets.clear()
    latest_analysis["per_tweet"] = []
    latest_analysis["batch_count"] = 0
    latest_analysis["topics"] = {}
    
    async with httpx.AsyncClient() as http:
        await http.delete("http://localhost:8001/clear")
    
    return {"status": "reset"}

@app.get("/audio")
async def audio():
    if not latest_analysis.get("feed_summary") and not session_tweets:
        raise HTTPException(status_code=404, detail="No analysis yet")

    score = latest_analysis.get("overall_manipulation_score", 0)
    summary = latest_analysis.get("feed_summary", "")
    total = len(latest_analysis.get("per_tweet", []))
    
    if score > 66:
        risk = "high manipulation risk"
    elif score > 33:
        risk = "moderate manipulation signals"
    else:
        risk = "relatively clean content"

    digest = f"""Here is your algorithmic diet report. 
    You scrolled through {total} tweets this session, with an overall manipulation score of {score} out of 100 — {risk}.
    {summary}
    Consider diversifying your feed sources to get a more balanced information diet."""

    audio_stream = eleven.text_to_speech.convert(
        voice_id="onwK4e9ZLuTAKqWW03F9",
        text=digest,
        model_id="eleven_turbo_v2",
        output_format="mp3_44100_128"
    )

    audio_bytes = b"".join(audio_stream)

    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=digest.mp3"}
    )

class SimilarRequest(BaseModel):
    text: str
    top_k: int = 5

@app.post("/similar")
async def find_similar(req: SimilarRequest):
    try:
        result = client.models.embed_content(
            model="gemini-embedding-001",
            contents=req.text
        )
        vector = list(result.embeddings[0].values)
        async with httpx.AsyncClient() as http:
            res = await http.post("http://localhost:8001/similar", json={
                "text_vector": vector,
                "top_k": req.top_k
            })
            return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/reindex")
async def reindex():
    if not session_tweets:
        raise HTTPException(status_code=404, detail="No tweets to index")
    await store_tweet_embeddings(session_tweets, 0)
    return {"status": "ok", "indexed": len(session_tweets)}