import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireFirebaseUser } from '@/lib/auth/server';
import { DocumentMaterial } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireFirebaseUser(req);
    await db.ready();

    // 1. Get all attempts for this authenticated student
    const attempts = db.getAttemptsByStudent(user.uid);

    // If the student hasn't joined any room yet, they have no unlocked study materials
    if (!attempts || attempts.length === 0) {
      return NextResponse.json({
        success: true,
        materials: [],
        joinedRooms: [],
        totalCount: 0,
        message: 'No study materials available until you join a room.',
      });
    }

    // 2. Map only the documents assigned to assessments/rooms the student has joined
    const docToRoomsMap = new Map<
      string,
      { roomCode: string; assessmentTitle: string; courseName?: string }[]
    >();
    const joinedRoomCodes = new Set<string>();

    attempts.forEach((att) => {
      const asmt = db.getAssessmentById(att.assessmentId);
      const room = db.getRoomById(att.roomId);
      const roomCode = room?.code || att.roomId || '';

      if (roomCode) {
        joinedRoomCodes.add(roomCode);
      }

      if (asmt && Array.isArray(asmt.materialDocumentIds)) {
        asmt.materialDocumentIds.forEach((docId) => {
          const list = docToRoomsMap.get(docId) || [];
          if (roomCode && !list.some((item) => item.roomCode === roomCode)) {
            list.push({
              roomCode,
              assessmentTitle: asmt.title,
              courseName: asmt.moduleName || 'Course Notes',
            });
          }
          docToRoomsMap.set(docId, list);
        });
      }
    });

    // 3. Collect only the authorized documents
    const accessibleDocIds = Array.from(docToRoomsMap.keys());
    const accessibleDocs = accessibleDocIds
      .map((docId) => db.getDocumentById(docId))
      .filter(Boolean) as DocumentMaterial[];

    const materials = accessibleDocs.map((doc) => {
      const roomInfos = docToRoomsMap.get(doc.id) || [];
      const course = doc.courseId ? db.getCourseById(doc.courseId) : undefined;
      return {
        id: doc.id,
        title: doc.title,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        pageCount: doc.pageCount,
        chunkCount: doc.chunks?.length || 0,
        uploadedAt: doc.uploadedAt,
        courseId: doc.courseId,
        courseName: course?.name || roomInfos[0]?.courseName || 'Assigned Room Notes',
        joinedRooms: roomInfos,
        primaryRoomCode: roomInfos[0]?.roomCode || '',
        isAssigned: true,
      };
    });

    return NextResponse.json({
      success: true,
      materials,
      joinedRooms: Array.from(joinedRoomCodes),
      totalCount: materials.length,
    });
  } catch (err: any) {
    if (err.message === 'AUTH_REQUIRED') {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    console.error('Student materials list error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch study materials' },
      { status: 500 }
    );
  }
}
