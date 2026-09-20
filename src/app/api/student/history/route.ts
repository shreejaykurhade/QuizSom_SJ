import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUser } from '@/lib/auth/server';
import { db } from '@/lib/db';
export async function GET(req: NextRequest) { try { const user=await requireFirebaseUser(req); const history=db.getAttemptsByStudent(user.uid).map(attempt=>({id:attempt.id,status:attempt.status,score:attempt.percentageScore,startedAt:attempt.startedAt,roomCode:db.getRoomById(attempt.roomId)?.code,title:db.getAssessmentById(attempt.assessmentId)?.title||'Assessment'})); return NextResponse.json({history}); } catch { return NextResponse.json({error:'Sign in required'},{status:401}); } }
