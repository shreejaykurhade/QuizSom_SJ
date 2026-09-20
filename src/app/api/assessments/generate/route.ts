import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { geminiEngine } from '@/lib/gemini/client';
import { DocumentMaterial } from '@/lib/db/types';
import { cleanPdfText, processDocumentBuffer } from '@/lib/rag/documentProcessor';
import { requireFirebaseUser } from '@/lib/auth/server';
import fs from 'fs';
import { indexDocumentChunks } from '@/lib/rag/embeddings';

export async function POST(req: NextRequest) {
  try {
    const user = await requireFirebaseUser(req);
    const body = await req.json();
    const {
      documentId,
      documentIds,
      courseId = `course_${user.uid}`,
      assessmentTitle = 'Module Internal Assessment',
      totalQuestions = 15,
      difficulty = 'mixed',
      topicFocus,
      moduleName,
    } = body;

    // Collect all requested document IDs
    const ids: string[] = [];
    if (Array.isArray(documentIds) && documentIds.length > 0) {
      ids.push(...documentIds);
    } else if (documentId) {
      ids.push(documentId);
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No documents specified for generation' }, { status: 400 });
    }

    const documents: DocumentMaterial[] = [];
    for (const id of ids) {
      const doc = db.getDocumentById(id);
      if (doc && doc.ownerId === user.uid) {
        // Materials uploaded before page-aware extraction are transparently
        // re-indexed from their original private file before quiz creation.
        // This prevents a guessed page number from being presented as proof.
        let indexedDoc = doc;
        if (doc.pageCount > 1 && doc.chunks.length <= 1 && doc.storagePath && fs.existsSync(doc.storagePath)) {
          const refreshed = await processDocumentBuffer(
            fs.readFileSync(doc.storagePath), doc.fileName, doc.mimeType, doc.courseId
          );
          indexedDoc = {
            ...refreshed,
            id: doc.id,
            ownerId: doc.ownerId,
            storagePath: doc.storagePath,
            uploadedAt: doc.uploadedAt,
          };
          indexedDoc = await indexDocumentChunks(indexedDoc);
          db.saveDocument(indexedDoc);
        }
        // Re-clean the stored rawText and chunks before sending to Gemini
        const cleanedDoc: DocumentMaterial = {
          ...indexedDoc,
          rawText: cleanPdfText(indexedDoc.rawText),
          chunks: indexedDoc.chunks?.map((c) => ({
            ...c,
            content: cleanPdfText(c.content),
            sectionTitle: c.sectionTitle ? cleanPdfText(c.sectionTitle) : undefined,
          })),
        };
        documents.push(cleanedDoc);
      }
    }

    if (documents.length === 0) {
      return NextResponse.json({ error: 'Selected document(s) not found in materials index' }, { status: 404 });
    }

    const generatedQuestions = await geminiEngine.generateQuestions({
      documents,
      document: documents[0],
      courseId,
      assessmentTitle,
      totalQuestions: Number(totalQuestions),
      difficulty,
      topicFocus,
      moduleName,
    });
    const questions = generatedQuestions
      .map((question) => {
        const source = documents.find((doc) =>
          doc.title.toLowerCase() === (question.sourceCitation?.documentTitle || '').toLowerCase() ||
          doc.id === question.sourceCitation?.documentId ||
          doc.fileName.toLowerCase() === (question.sourceCitation?.documentTitle || '').toLowerCase()
        ) || documents[0];

        const correctAnswer = question.options?.find((option) => option.id === question.correctOptionId)?.text || '';
        if (!correctAnswer || !question.questionText) return null;

        const citedChunk = (source?.chunks || []).find((c) => c.pageNumber === question.sourceCitation?.pageNumber) || source?.chunks?.[0];

        return {
          ...question,
          sourceCitation: {
            ...question.sourceCitation,
            documentTitle: source?.title || 'Course Material',
            documentId: source?.id || '',
            pageNumber: question.sourceCitation?.pageNumber || citedChunk?.pageNumber || 1,
            sectionTitle: question.sourceCitation?.sectionTitle || citedChunk?.sectionTitle || 'Course material',
            excerpt: question.sourceCitation?.excerpt || citedChunk?.content?.slice(0, 150) || 'Verified from course notes.',
          },
        };
      })
      .filter((q): q is NonNullable<typeof q> => Boolean(q));

    if (questions.length === 0) {
      return NextResponse.json({
        error: 'No questions could be generated from the selected materials. Please ensure the notes contain text or topics.',
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      questions,
      totalGenerated: questions.length,
      documentsCount: documents.length,
      isLiveGemini: geminiEngine.isLiveGeminiEnabled(),
      generationMode: geminiEngine.isLiveGeminiEnabled() ? 'GEMINI_API' : 'LOCAL_RAG',
    });
  } catch (err: any) {
    console.error('Quiz generation error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate assessment questions' },
      { status: 500 }
    );
  }
}
