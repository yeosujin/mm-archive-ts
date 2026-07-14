const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY')!;
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// 768차원 임베딩. 코사인 사용이므로 정규화 불필요(스케일 불변).
export async function embedText(
  text: string,
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY',
): Promise<number[]> {
  const res = await fetch(
    `${BASE}/gemini-embedding-001:embedContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: 768,
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Gemini embed failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.embedding.values as number[];
}

export async function generateAnswer(prompt: string): Promise<string> {
  const res = await fetch(
    `${BASE}/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Gemini generate failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}
