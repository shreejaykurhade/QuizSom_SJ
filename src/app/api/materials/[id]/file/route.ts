import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireFirebaseUser } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireFirebaseUser(req);
    await db.ready();

    const document = db.getDocumentById(params.id);
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Access authorization check
    const isOwner = document.ownerId === user.uid;
    const isStudentJoined = db.getAttemptsByStudent(user.uid).some((attempt) => {
      const asmt = db.getAssessmentById(attempt.assessmentId);
      return asmt?.materialDocumentIds?.includes(document.id);
    });

    if (!isOwner && !isStudentJoined) {
      return NextResponse.json(
        { error: 'You have not joined an assessment room assigned to this study material.' },
        { status: 403 }
      );
    }

    const fileBuffer = await db.getDocumentFile(document);
    if (!fileBuffer) {
      return NextResponse.json(
        { error: 'Original file unavailable on server storage.' },
        { status: 404 }
      );
    }

    return new NextResponse(new Blob([new Uint8Array(fileBuffer)]), {
      headers: {
        'Content-Type': document.mimeType || 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(document.fileName)}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message === 'AUTH_REQUIRED' ? 'Sign in required' : 'Could not open source file' },
      { status: error.message === 'AUTH_REQUIRED' ? 401 : 500 }
    );
  }
}
