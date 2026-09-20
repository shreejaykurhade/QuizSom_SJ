import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processDocumentBuffer } from '@/lib/rag/documentProcessor';
import { requireFirebaseUser } from '@/lib/auth/server';
import { indexDocumentChunks } from '@/lib/rag/embeddings';

export async function POST(req: NextRequest) {
  try {
    const user = await requireFirebaseUser(req);
    await db.refresh();
    const formData = await req.formData();
    const courseId = (formData.get('courseId') as string) || `course_${user.uid}`;

    // Retrieve all files from multi-file or folder uploads
    const files = (formData.getAll('files') as File[]).concat(
      formData.getAll('file') as File[]
    ).filter(Boolean);

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const processedDocs = [];

    for (const file of files) {
      if (file && typeof file.arrayBuffer === 'function') {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let docMaterial = await processDocumentBuffer(
          buffer,
          file.name,
          file.type || 'application/pdf',
          courseId
        );
        docMaterial.ownerId = user.uid;
        docMaterial.storagePath = await db.saveDocumentFile(docMaterial.id, file.name, file.type || 'application/octet-stream', buffer);
        docMaterial = await indexDocumentChunks(docMaterial);

        db.saveDocument(docMaterial);
        processedDocs.push(docMaterial);
      }
    }

    // Do not report upload success until the document and its chunk index are
    // visible to every Vercel function instance.
    await db.flush();

    const documentSummaries = processedDocs.map(({ rawText: _rawText, chunks, ...document }) => ({
      ...document,
      chunks: chunks.map(({ content: _content, embedding: _embedding, embeddingModel: _embeddingModel, indexedAt: _indexedAt, ...chunk }) => chunk),
    }));

    return NextResponse.json({
      success: true,
      documents: documentSummaries,
      document: documentSummaries[0] || null,
      totalUploaded: documentSummaries.length,
    });
  } catch (err: any) {
    if (err.message === 'AUTH_REQUIRED') return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    console.error('Document upload error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process document(s)' },
      { status: 500 }
    );
  }
}
