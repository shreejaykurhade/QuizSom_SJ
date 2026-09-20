'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { apiFetch } from '@/lib/auth/apiFetch';
import SourcePagePreview from '@/components/SourcePagePreview';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  BookOpen,
  Sparkles,
  RefreshCw,
  MinusCircle,
  Target,
  Dumbbell,
} from 'lucide-react';

import { useAuth } from '@/components/AuthProvider';

export default function StudentResultReviewPage() {
  const params = useParams();
  const { user } = useAuth();
  const code = (params.code as string)?.toUpperCase();

  const [resultData, setResultData] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [practiceTopic, setPracticeTopic] = useState('');
  const [practiceError, setPracticeError] = useState('');

  useEffect(() => {
    async function loadResult() {
      try {
        const savedAttemptId = localStorage.getItem(`assessly_attempt_${code}`);
        const attemptId = savedAttemptId || 'attempt_0';

        const res = await apiFetch(`/api/attempts/${attemptId}/result`);
        const data = await res.json();
        if (data.attempt) {
          setResultData(data);
        }
      } catch (err) {
        console.error('Failed to load result:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadResult();
  }, [code]);

  if (isLoading && !resultData) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-xs text-slate-500 gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
        <span>Compiling source-grounded score report...</span>
      </div>
    );
  }

  const attempt = resultData?.attempt;
  const assessment = resultData?.assessment;
  const course = resultData?.course;
  const questions = resultData?.reviewQuestions || [];

  const correctQuestions = questions.filter((q: any) => q.isCorrect);
  const incorrectQuestions = questions.filter((q: any) => q.isAnswered && !q.isCorrect);
  const unansweredQuestions = questions.filter((q: any) => !q.isAnswered);

  const filteredQuestions = questions.filter((q: any) => {
    if (activeFilter === 'correct') return q.isCorrect;
    if (activeFilter === 'incorrect') return q.isAnswered && !q.isCorrect;
    if (activeFilter === 'unanswered') return !q.isAnswered;
    return true;
  });

  const durationSecs = attempt?.completionDurationSeconds ?? 0;
  const durMins = Math.floor(durationSecs / 60);
  const durSecs = durationSecs % 60;
  const formattedDuration = `${durMins}m ${durSecs}s`;

  const totalQuestions = attempt?.totalQuestions ?? questions.length ?? 0;
  const correctCount = attempt?.correctCount ?? correctQuestions.length;
  const incorrectCount = attempt?.incorrectCount ?? incorrectQuestions.length;
  const unansweredCount = attempt?.unansweredCount ?? unansweredQuestions.length;
  const percentageScore = attempt?.percentageScore ?? 0;
  const scoreMarks = attempt?.score ?? 0;
  const rank = attempt?.rank ?? 1;
  const totalParticipants = attempt?.totalParticipants ?? 1;
  const remediationTopics = Array.from(new Set(
    questions.filter((q: any) => !q.isCorrect).map((q: any) => q.topic).filter(Boolean)
  )) as string[];

  async function startPractice(topic: string) {
    setPracticeTopic(topic);
    setPracticeError('');
    try {
      const response = await apiFetch('/api/student/practice/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId: attempt.id, topic, totalQuestions: 8 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create practice round');
      window.location.href = `/exam/${data.roomCode}`;
    } catch (error: any) {
      setPracticeError(error.message || 'Could not create practice round');
      setPracticeTopic('');
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-900 pb-16">
      {/* Top Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Assessment Results · {code}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {assessment?.assessmentType === 'PLAYGROUND' ? (
            <Link
              href={`/student/playground/rooms/${code}`}
              className="btn-secondary py-2 px-3 text-xs font-bold flex items-center gap-1.5 text-purple-700 bg-purple-50 hover:bg-purple-100"
            >
              <Award className="w-3.5 h-3.5 text-purple-600" />
              Playground Leaderboard
            </Link>
          ) : (
            <Link
              href={`/exam/${code}/leaderboard`}
              className="btn-secondary py-2 px-3 text-xs font-bold flex items-center gap-1.5"
            >
              <Award className="w-3.5 h-3.5 text-blue-600" />
              Class Leaderboard
            </Link>
          )}
          <Link
            href="/student"
            className="btn-primary py-2 px-3.5 text-xs font-bold"
          >
            Student Portal
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-4 pt-8 space-y-8">
        {/* Score Card Hero */}
        <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                {course?.code || 'CS301'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {assessment?.title || 'Course Assessment'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Examinee: <strong className="text-slate-800">{attempt?.studentName || user?.displayName || user?.email?.split('@')[0] || 'Student Candidate'}</strong> ({attempt?.studentRollNo || (user?.email ? user.email.split('@')[0].toUpperCase() : '2024CS1048')})
              </p>
            </div>

            {attempt?.status === 'AUTO_SUBMITTED' && (
              <div className="text-xs font-mono text-rose-700 bg-rose-50 px-3.5 py-1.5 rounded-lg border border-rose-200 font-bold">
                Auto-Submitted ({attempt?.autoSubmitReason === 'TAB_SWITCH_LIMIT_EXCEEDED' ? 'Tab Switch Policy Enforced' : 'Full-Screen Violation Limit Exceeded'})
              </div>
            )}
          </div>

          {/* Primary Score Presentation */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-mono text-slate-500 font-bold uppercase">Final Score</div>
              <div className="text-4xl font-extrabold text-slate-900 mt-1">
                {percentageScore}%
              </div>
              <div className="text-[11px] text-emerald-600 mt-1 font-bold">
                {scoreMarks} / {totalQuestions} Marks
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-mono text-slate-500 font-bold uppercase">Accuracy</div>
              <div className="text-4xl font-extrabold text-emerald-600 mt-1">
                {correctCount}
                <span className="text-base text-slate-400 font-normal"> / {totalQuestions}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">
                {incorrectCount} Incorrect · {unansweredCount} Unanswered
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-mono text-slate-500 font-bold uppercase">Duration</div>
              <div className="text-4xl font-extrabold text-slate-900 mt-1 font-mono">
                {formattedDuration}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                Server Clock Sync
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-mono text-slate-500 font-bold uppercase">Class Rank</div>
              <div className="text-4xl font-extrabold text-blue-700 mt-1 font-mono">
                #{rank}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">
                {totalParticipants > 1 ? `Rank ${rank} of ${totalParticipants} Students` : 'Classroom Session'}
              </div>
            </div>
          </div>

          {/* Performance Summary & Suggested Revision */}
          {attempt?.performanceSummary && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50/70 to-blue-50/50 border border-emerald-200 text-xs space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Pedagogical Performance Summary</span>
              </div>
              <p className="text-slate-800 leading-relaxed font-medium">
                {attempt.performanceSummary.pedagogicalFeedback}
              </p>
              <div className="grid sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div>
                  <span className="text-emerald-700 font-bold">Mastered Concepts: </span>
                  <span className="text-slate-900 font-semibold">{attempt.performanceSummary.strongTopics?.join(', ') || 'None yet'}</span>
                </div>
                <div>
                  <span className="text-amber-800 font-bold">Recommended Revision: </span>
                  <span className="text-slate-900 font-semibold">{attempt.performanceSummary.weakTopics?.join(', ') || 'All topics'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-violet-600 p-2 text-white"><Target className="h-5 w-5" /></div>
              <div>
                <h2 className="font-bold text-violet-950">Adaptive weak-topic practice</h2>
                <p className="mt-1 text-xs leading-5 text-violet-900/70">Generate a fresh Battleground round from the same PDFs. Every practice question is source-verified, and the next result will measure whether this topic improved.</p>
              </div>
            </div>
            {remediationTopics.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {remediationTopics.map((topic) => (
                  <button key={topic} onClick={() => startPractice(topic)} disabled={Boolean(practiceTopic)} className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-white px-3 py-2 text-xs font-bold text-violet-800 transition hover:bg-violet-100 disabled:cursor-wait disabled:opacity-60">
                    {practiceTopic === topic ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Dumbbell className="h-3.5 w-3.5" />}
                    {practiceTopic === topic ? `Building ${topic} practice…` : `Practice ${topic}`}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-800">No weak topics detected. You mastered every assessed topic.</p>
            )}
            {practiceError && <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{practiceError}</p>}
          </div>
        </div>

        {/* Detailed Question Review List */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Detailed Answer Review</h2>
              <p className="text-xs text-slate-500">Inspect your responses against grounded syllabus references and explanations.</p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold flex-wrap">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                All ({questions.length})
              </button>
              <button
                onClick={() => setActiveFilter('correct')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeFilter === 'correct'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Correct ({correctQuestions.length})
              </button>
              <button
                onClick={() => setActiveFilter('incorrect')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeFilter === 'incorrect'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Incorrect ({incorrectQuestions.length})
              </button>
              <button
                onClick={() => setActiveFilter('unanswered')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeFilter === 'unanswered'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Unanswered ({unansweredQuestions.length})
              </button>
            </div>
          </div>

          {/* Question Review Cards */}
          <div className="space-y-4">
            {filteredQuestions.map((q: any) => (
              <div
                key={q.questionId}
                className={`p-6 rounded-2xl bg-white border shadow-sm space-y-4 ${
                  q.isCorrect
                    ? 'border-slate-200'
                    : q.isAnswered
                    ? 'border-rose-200 bg-rose-50/10'
                    : 'border-slate-200'
                }`}
              >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700">
                      Q{q.questionIndex < 10 ? `0${q.questionIndex}` : q.questionIndex}
                    </span>
                    <span className="min-w-0 break-words [overflow-wrap:anywhere] text-sm font-bold leading-relaxed text-slate-900 sm:text-base">
                      {q.questionText}
                    </span>
                  </div>

                  <div className="shrink-0">
                    {q.isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Correct (+1.0)
                      </span>
                    ) : q.isAnswered ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                        <XCircle className="w-3.5 h-3.5" />
                        Incorrect (-0.25)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                        <MinusCircle className="w-3.5 h-3.5 text-slate-400" />
                        Unanswered (0.0)
                      </span>
                    )}
                  </div>
                </div>

                {/* Options List */}
                <div className="grid sm:grid-cols-2 gap-2 text-xs">
                  {q.options?.map((opt: any, optIdx: number) => {
                    const isStudentPick = q.selectedOptionId === opt.id;
                    const isCorrectAnswer = q.correctOptionId === opt.id;

                    return (
                      <div
                        key={opt.id}
                        className={`min-w-0 p-3.5 rounded-xl border flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between ${
                          isCorrectAnswer
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-bold'
                            : isStudentPick && !isCorrectAnswer
                            ? 'border-rose-300 bg-rose-50 text-rose-900 font-bold'
                            : 'border-slate-200 bg-slate-50/60 text-slate-800'
                        }`}
                      >
                        <div className="flex min-w-0 items-start gap-2">
                          <span className="shrink-0 font-mono text-xs font-bold">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span className="min-w-0 break-words [overflow-wrap:anywhere]">{opt.text}</span>
                        </div>

                        {isCorrectAnswer && (
                          <span className="text-[10px] font-mono uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                            Correct Answer
                          </span>
                        )}
                        {isStudentPick && !isCorrectAnswer && (
                          <span className="text-[10px] font-mono uppercase bg-rose-600 text-white px-2 py-0.5 rounded-full font-bold">
                            Your Choice
                          </span>
                        )}
                        {isStudentPick && isCorrectAnswer && (
                          <span className="text-[10px] font-mono uppercase bg-emerald-700 text-white px-2 py-0.5 rounded-full font-bold">
                            Your Choice ✓
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Gemini Grounded Explanation */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-blue-700 text-[11px] uppercase font-mono">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    Gemini Source-Grounded Explanation
                  </div>
                  <p className="text-slate-800 leading-relaxed text-xs">
                    {q.explanation}
                  </p>
                </div>

                <SourcePagePreview citation={q.sourceCitation} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
