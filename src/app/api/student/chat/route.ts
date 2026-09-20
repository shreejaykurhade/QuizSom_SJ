import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { requireFirebaseUser } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { processDocumentBuffer } from '@/lib/rag/documentProcessor';
import { cosineSimilarity, embedQuestion, indexDocumentChunks } from '@/lib/rag/embeddings';

const ignored = new Set(['about', 'after', 'again', 'also', 'and', 'are', 'can', 'does', 'explain', 'for', 'from', 'give', 'have', 'how', 'into', 'is', 'its', 'of', 'on', 'please', 'tell', 'that', 'the', 'their', 'there', 'these', 'this', 'to', 'use', 'was', 'what', 'when', 'where', 'which', 'with', 'would', 'you', 'your']);
const terms = (value: string) => new Set((value.toLowerCase().match(/[a-z][a-z-]{2,}/g) || []).filter(word => !ignored.has(word)));

function sentences(content: string, queryTerms: Set<string>) {
  return content.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).map(text => text.trim()).filter(text => text.length >= 25).map(text => ({ text, score: Array.from(queryTerms).reduce((total, term) => total + (text.toLowerCase().includes(term) ? 1 : 0), 0) })).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.text.length - b.text.length).slice(0, 2).map(item => item.text);
}

async function flashAnswer(question: string, evidence: any[]): Promise<{ answer: string[]; evidenceIds: number[] } | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  const sourceText = evidence.map((item, index) => `[${index}] ${item.doc.title}, page ${item.chunk.pageNumber}: ${item.quote}`).join('\n');
  const prompt = `Answer the student using ONLY the evidence below. Do not add outside facts. Return JSON only: {"answer":["short factual point"],"evidenceIds":[0]}. Each answer point must be supported by one selected evidence item. If evidence does not answer the question return {"answer":[],"evidenceIds":[]}.\nQuestion: ${question}\nEvidence:\n${sourceText}`;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1 } }), cache: 'no-store' });
    if (!response.ok) return null;
    const text = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.answer) || !Array.isArray(parsed.evidenceIds)) return null;
    const evidenceIds = parsed.evidenceIds.filter((id: unknown): id is number => typeof id === 'number' && Number.isInteger(id) && id >= 0 && id < evidence.length);
    return { answer: parsed.answer.filter((line: unknown) => typeof line === 'string' && line.length < 500).slice(0, 4), evidenceIds };
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireFirebaseUser(req); const { question } = await req.json();
    if (!question || String(question).trim().length < 3) return NextResponse.json({ error: 'Ask a specific question (at least 3 characters).' }, { status: 400 });
    const attempts = db.getAttemptsByStudent(user.uid);
    const allowedDocumentIds = new Set(attempts.flatMap(attempt => db.getAssessmentById(attempt.assessmentId)?.materialDocumentIds || []));
    const saved = Array.from(allowedDocumentIds).map(id => db.getDocumentById(id)).filter(Boolean) as any[];
    if (!saved.length) return NextResponse.json({ error: 'Join an assessment room before using its course-material chatbot.' }, { status: 403 });
    const docs = await Promise.all(saved.map(async (doc) => {
      if (doc.pageCount > 1 && doc.chunks.length <= 1 && doc.storagePath && fs.existsSync(doc.storagePath)) {
        const rebuilt = await processDocumentBuffer(fs.readFileSync(doc.storagePath), doc.fileName, doc.mimeType, doc.courseId);
        const indexed = await indexDocumentChunks({ ...rebuilt, id: doc.id, ownerId: doc.ownerId, storagePath: doc.storagePath, uploadedAt: doc.uploadedAt });
        db.saveDocument(indexed); return indexed;
      }
      if (doc.chunks.some((chunk: any) => !chunk.embedding?.length)) {
        const indexed = await indexDocumentChunks(doc);
        db.saveDocument(indexed); return indexed;
      }
      return doc;
    }));
    const queryTerms = terms(String(question));
    if (!queryTerms.size) return NextResponse.json({ answer: ['Please include the specific topic or term from your notes.'], citations: [] });
    const queryEmbedding = await embedQuestion(String(question));
    const ranked = docs.flatMap(doc => doc.chunks.map((chunk: any) => {
      const keywordScore = Array.from(queryTerms).filter(term => chunk.content.toLowerCase().includes(term)).length / queryTerms.size;
      const vectorScore = cosineSimilarity(queryEmbedding || undefined, chunk.embedding);
      return { doc, chunk, keywordScore, vectorScore, score: keywordScore * 0.45 + vectorScore * 0.55 };
    })).filter(item => item.keywordScore > 0 || item.vectorScore > 0.45).sort((a, b) => b.score - a.score).slice(0, 8);
    if (!ranked.length) return NextResponse.json({ answer: ['I cannot answer that from the assigned notes. Try a term that appears in the course material.'], citations: [] });
    const evidence = ranked.map(item => ({ ...item, quote: sentences(item.chunk.content, queryTerms)[0] || item.chunk.content.replace(/\s+/g, ' ').slice(0, 420) })).filter(item => item.quote.length > 20).slice(0, 4);
    const generated = await flashAnswer(String(question), evidence);
    const selectedIds: number[] = generated?.evidenceIds?.length ? generated.evidenceIds : [];
    const selected = selectedIds.length ? Array.from(new Set(selectedIds)).map(id => evidence[id]) : evidence.slice(0, 2);
    const answer = generated?.answer?.length ? generated.answer : selected.flatMap(item => sentences(item.chunk.content, queryTerms)).slice(0, 4);
    if (!answer.length) return NextResponse.json({ answer: ['The retrieved pages do not state an answer clearly enough, so I will not guess.'], citations: [] });
    const citations = selected.map(item => ({ documentId: item.doc.id, documentTitle: item.doc.title, pageNumber: item.chunk.pageNumber, sourceLabel: `Page ${item.chunk.pageNumber}`, sectionTitle: item.chunk.sectionTitle, excerpt: item.quote, retrievalScore: Number(item.score.toFixed(3)) }));
    return NextResponse.json({ answer, citations, retrieval: { mode: queryEmbedding ? 'hybrid_vector_keyword_flash_rerank' : 'keyword_flash_rerank', allowedDocumentCount: docs.length }, guardrail: 'Only owner-authorized material linked to rooms joined by this student was searched.' });
  } catch (error: any) { return NextResponse.json({ error: error.message === 'AUTH_REQUIRED' ? 'Sign in required' : 'Could not retrieve grounded material' }, { status: error.message === 'AUTH_REQUIRED' ? 401 : 500 }); }
}
