import { DocumentChunk, DocumentMaterial } from '@/lib/db/types';

const EMBEDDING_MODEL = 'gemini-embedding-2';

function documentInput(document: DocumentMaterial, chunk: DocumentChunk) {
  return `title: ${document.title} | page: ${chunk.pageNumber} | section: ${chunk.sectionTitle || 'Course material'} | text: ${chunk.content}`;
}

function queryInput(query: string) {
  return `task: question answering | query: ${query}`;
}

async function embed(text: string): Promise<number[] | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: `models/${EMBEDDING_MODEL}`, content: { parts: [{ text }] } }), cache: 'no-store',
  });
  if (!response.ok) return null;
  const data = await response.json();
  const values = data.embedding?.values || data.embeddings?.[0]?.values;
  return Array.isArray(values) && values.length ? values : null;
}

export async function embedQuestion(query: string) { return embed(queryInput(query)); }

export async function indexDocumentChunks(document: DocumentMaterial): Promise<DocumentMaterial> {
  // Embedding hundreds of PDF pages simultaneously exhausts serverless time,
  // memory and API quota. Keep every page chunk for exact citation and keyword
  // retrieval, but eagerly embed an even sample with bounded concurrency.
  const maxEagerEmbeddings = 32;
  const targetIndexes = new Set(
    Array.from({ length: Math.min(document.chunks.length, maxEagerEmbeddings) }, (_, index) =>
      Math.min(document.chunks.length - 1, Math.floor(index * document.chunks.length / Math.min(document.chunks.length, maxEagerEmbeddings)))
    )
  );
  const chunks = [...document.chunks];
  const queue = [...targetIndexes].filter((index) => !chunks[index]?.embedding?.length);
  const concurrency = 4;
  for (let offset = 0; offset < queue.length; offset += concurrency) {
    const batch = queue.slice(offset, offset + concurrency);
    const results = await Promise.all(batch.map(async (index) => ({
      index,
      embedding: await embed(documentInput(document, chunks[index])),
    })));
    for (const result of results) {
      if (result.embedding) {
        chunks[result.index] = {
          ...chunks[result.index],
          embedding: result.embedding,
          embeddingModel: EMBEDDING_MODEL,
          indexedAt: new Date().toISOString(),
        };
      }
    }
  }
  return { ...document, chunks };
}

export function cosineSimilarity(a?: number[], b?: number[]) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0; let aNorm = 0; let bNorm = 0;
  for (let index = 0; index < a.length; index += 1) { dot += a[index] * b[index]; aNorm += a[index] * a[index]; bNorm += b[index] * b[index]; }
  return aNorm && bNorm ? dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm)) : 0;
}
