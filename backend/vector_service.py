from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from cortex import CortexClient, DistanceMetric
from pydantic import BaseModel

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

COLLECTION = "tweets"
DIMENSION = 3072

def get_client():
    return CortexClient("localhost:50051")

@app.on_event("startup")
def startup():
    with get_client() as client:
        if not client.has_collection(COLLECTION):
            client.create_collection(COLLECTION, dimension=DIMENSION, distance_metric=DistanceMetric.COSINE)
            print("Created tweets collection")
        else:
            print("tweets collection already exists")

class UpsertRequest(BaseModel):
    id: int
    vector: list[float]
    payload: dict

class SearchRequest(BaseModel):
    vector: list[float]
    top_k: int = 5

class SimilarRequest(BaseModel):
    text_vector: list[float]
    top_k: int = 5

@app.post("/similar")
def similar(req: SimilarRequest):
    with get_client() as client:
        results = client.search(COLLECTION, query=req.text_vector, top_k=req.top_k)
        return [{"id": r.id, "score": r.score, "text": r.payload.get("text", "")} for r in results]

@app.post("/upsert")
def upsert(req: UpsertRequest):
    with get_client() as client:
        client.upsert(COLLECTION, id=req.id, vector=req.vector, payload=req.payload)
    return {"status": "ok"}

@app.post("/search")
def search(req: SearchRequest):
    with get_client() as client:
        results = client.search(COLLECTION, query=req.vector, top_k=req.top_k)
        return [{"id": r.id, "score": r.score, "payload": r.payload} for r in results]

@app.get("/count")
def count():
    with get_client() as client:
        return {"count": client.count(COLLECTION)}
    
@app.delete("/clear")
def clear():
    with get_client() as client:
        client.recreate_collection(COLLECTION, dimension=DIMENSION, distance_metric=DistanceMetric.COSINE)
    return {"status": "cleared"}