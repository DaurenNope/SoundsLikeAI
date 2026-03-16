from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import tempfile
import requests
import whisper

app = FastAPI()
model = whisper.load_model("base")

class TranscribeRequest(BaseModel):
    file_path: Optional[str] = None
    audio_url: Optional[str] = None

@app.post("/transcribe")
def transcribe(req: TranscribeRequest):
    if not req.file_path and not req.audio_url:
        return {"text": ""}

    path = req.file_path
    tmp = None

    if req.audio_url:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".audio")
        with requests.get(req.audio_url, stream=True, timeout=60) as r:
            r.raise_for_status()
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    tmp.write(chunk)
        tmp.flush()
        path = tmp.name

    result = model.transcribe(path)
    return {"text": result.get("text", "")}
