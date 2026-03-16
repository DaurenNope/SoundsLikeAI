export async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${process.env.EMBEDDINGS_SERVICE_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Embeddings service error: ${res.status}`);
  const data = await res.json();
  return data.embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${process.env.EMBEDDINGS_SERVICE_URL}/embed-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts }),
  });
  if (!res.ok) throw new Error(`Embeddings service error: ${res.status}`);
  const data = await res.json();
  return data.embeddings;
}
