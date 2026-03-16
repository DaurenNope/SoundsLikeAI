export async function transcribe(audioFilePath: string): Promise<string> {
  const res = await fetch(`${process.env.WHISPER_SERVICE_URL}/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_path: audioFilePath }),
  });
  if (!res.ok) throw new Error(`Whisper service error: ${res.status}`);
  const data = await res.json();
  return data.text;
}

export async function transcribeUrl(audioUrl: string): Promise<string> {
  const res = await fetch(`${process.env.WHISPER_SERVICE_URL}/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio_url: audioUrl }),
  });
  if (!res.ok) throw new Error(`Whisper service error: ${res.status}`);
  const data = await res.json();
  return data.text;
}
