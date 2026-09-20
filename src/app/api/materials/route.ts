import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireFirebaseUser } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireFirebaseUser(req);
    await db.refresh();
    const documents = db.getDocuments()
      .filter(document => document.ownerId === user.uid)
      .map(({ rawText: _rawText, chunks, ...document }) => ({
        ...document,
        chunks: chunks.map(({ content: _content, embedding: _embedding, embeddingModel: _embeddingModel, indexedAt: _indexedAt, ...chunk }) => chunk),
      }));

    return NextResponse.json({
      success: true,
      documents,
    });
  } catch (err: any) {
    if (err.message === 'AUTH_REQUIRED') return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    console.error('Materials list error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch materials' },
      { status: 500 }
    );
  }
}
