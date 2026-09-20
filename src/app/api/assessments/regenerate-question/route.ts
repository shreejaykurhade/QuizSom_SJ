import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { geminiEngine } from '@/lib/gemini/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, documentId, customInstruction } = body;

    if (!question || !documentId) {
      return NextResponse.json({ error: 'Missing question or documentId' }, { status: 400 });
    }

    const document = db.getDocumentById(documentId);
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const revisedQuestion = await geminiEngine.regenerateSingleQuestion(
      question,
      document,
      customInstruction
    );

    return NextResponse.json({
      success: true,
      question: revisedQuestion,
    });
  } catch (err: any) {
    console.error('Question regeneration error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to regenerate question' },
      { status: 500 }
    );
  }
}
