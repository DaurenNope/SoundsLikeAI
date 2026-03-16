from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

app = FastAPI()
model = SentenceTransformer("BAAI/bge-small-en-v1.5")

class EmbedRequest(BaseModel):
    text: str

class EmbedBatchRequest(BaseModel):
    texts: list[str]

@app.post("/embed")
def embed(req: EmbedRequest):
    embedding = model.encode(req.text).tolist()
    return {"embedding": embedding}

@app.post("/embed-batch")
def embed_batch(req: EmbedBatchRequest):
    embeddings = model.encode(req.texts).tolist()
    return {"embeddings": embeddings}
