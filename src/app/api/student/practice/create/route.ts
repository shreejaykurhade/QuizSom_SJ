import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUser } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { Assessment, DocumentMaterial, Question } from '@/lib/db/types';
import { geminiEngine } from '@/lib/gemini/client';

export const dynamic = 'force-dynamic';

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

export async function POST(req: NextRequest) {
  try {
    const user = await requireFirebaseUser(req);
    await db.ready();
    const { attemptId, topic, totalQuestions = 8 } = await req.json();
    const attempt = db.getAttemptById(String(attemptId || ''));
    if (!attempt) return NextResponse.json({ error: 'Source attempt not found' }, { status: 404 });
    if (attempt.studentId !== user.uid) return NextResponse.json({ error: 'This attempt does not belong to you' }, { status: 403 });
    if (attempt.status === 'IN_PROGRESS') return NextResponse.json({ error: 'Finish the quiz before starting remediation' }, { status: 409 });

    const sourceAssessment = db.getAssessmentById(attempt.assessmentId);
    if (!sourceAssessment) return NextResponse.json({ error: 'Source assessment not found' }, { status: 404 });
    const sourceQuestions = db.getQuestions({ assessmentId: sourceAssessment.id });
    const questionMap = new Map(sourceQuestions.map((question) => [question.id, question]));
    const weakTopics = new Set(
      attempt.assignedQuestionIds
        .map((id) => ({ question: questionMap.get(id), answer: attempt.answers[id] }))
        .filter(({ question, answer }) => question && (!answer?.selectedOptionId || answer.selectedOptionId !== question.correctOptionId))
        .map(({ question }) => question!.topic)
    );
    const requestedTopic = String(topic || '').trim();
    if (!requestedTopic || !weakTopics.has(requestedTopic)) {
      return NextResponse.json({ error: 'Choose a topic identified from an incorrect or unanswered question' }, { status: 400 });
    }

    const documents = sourceAssessment.materialDocumentIds
      .map((id) => db.getDocumentById(id))
      .filter((document): document is DocumentMaterial => Boolean(document?.chunks?.length));
    if (!documents.length) {
      return NextResponse.json({ error: 'This quiz has no indexed PDF material available for grounded practice' }, { status: 422 });
    }

    const count = Math.min(Math.max(Number(totalQuestions) || 8, 5), 15);
    const generated = await geminiEngine.generateQuestions({
      documents,
      document: documents[0],
      courseId: `practice_${user.uid}`,
      assessmentTitle: `Weak-topic practice: ${requestedTopic}`,
      totalQuestions: count,
      difficulty: 'mixed',
      topicFocus: requestedTopic,
    });
    const verified = generated.filter((question) => {
      const source = documents.find((document) => document.title === question.sourceCitation.documentTitle);
      const correctAnswer = question.options.find((option) => option.id === question.correctOptionId)?.text || '';
      const excerpt = question.sourceCitation.excerpt || '';
      if (!source || !correctAnswer || !excerpt) return false;
      const chunk = source.chunks.find((candidate) =>
        candidate.pageNumber === question.sourceCitation.pageNumber &&
        normalise(candidate.content).includes(normalise(excerpt)) &&
        normalise(candidate.content).includes(normalise(correctAnswer))
      );
      if (!chunk || !normalise(excerpt).includes(normalise(correctAnswer))) return false;
      question.sourceCitation.documentId = source.id;
      question.sourceCitation.sectionTitle = chunk.sectionTitle;
      return true;
    });
    if (verified.length < 3) {
      return NextResponse.json({ error: 'The PDFs did not contain enough verifiable evidence for a practice round on this topic' }, { status: 422 });
    }

    const now = new Date().toISOString();
    const assessmentId = `practice_assess_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const questions: Question[] = verified.map((question, index) => ({
      ...question,
      id: `practice_q_${Date.now()}_${index}`,
      assessmentId,
      courseId: `practice_${user.uid}`,
      topic: requestedTopic,
      createdAt: now,
      isValidated: true,
    }));
    db.saveQuestionsBatch(questions);
    const displayName = user.name || user.email?.split('@')[0] || 'Student';
    const assessment: Assessment = {
      id: assessmentId,
      courseId: `practice_${user.uid}`,
      teacherId: user.uid,
      title: `Practice: ${requestedTopic}`,
      moduleName: requestedTopic,
      description: `Adaptive PDF-grounded remediation generated after ${sourceAssessment.title}`,
      materialDocumentIds: sourceAssessment.materialDocumentIds,
      questionIds: questions.map((question) => question.id),
      assessmentType: 'PLAYGROUND',
      creatorRole: 'STUDENT',
      creatorStudentId: user.uid,
      creatorStudentName: displayName,
      settings: {
        durationMinutes: Math.max(10, questions.length * 2),
        totalQuestions: questions.length,
        difficultyDistribution: 'mixed',
        randomizeQuestions: true,
        randomizeOptions: true,
        positiveMarks: 1,
        negativeMarks: 0,
        allowReviewAfterSubmit: true,
        showLeaderboard: 'ANONYMOUS',
        requireFullscreen: false,
        maxFullscreenViolations: 99,
      },
      status: 'PUBLISHED',
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    db.saveAssessment(assessment);
    const room = db.createRoomForAssessment(assessment.id, user.uid, undefined, {
      assessmentType: 'PLAYGROUND',
      creatorRole: 'STUDENT',
      creatorStudentId: user.uid,
      creatorStudentName: displayName,
    });
    return NextResponse.json({ success: true, roomCode: room.code, topic: requestedTopic, questionCount: questions.length });
  } catch (error: any) {
    if (error.message === 'AUTH_REQUIRED') return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    console.error('Practice creation error:', error);
    return NextResponse.json({ error: error.message || 'Could not create a grounded practice round' }, { status: 500 });
  }
}
