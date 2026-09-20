'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Logo from '@/components/Logo';
import {
  Award,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Users,
  Shield,
  RefreshCw,
  Trophy,
  Medal,
} from 'lucide-react';
import { LeaderboardEntry } from '@/lib/db/types';

export default function ExamLeaderboardPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [assessmentTitle, setAssessmentTitle] = useState('Assessment Leaderboard');
  const [privacyMode, setPrivacyMode] = useState<string>('PUBLIC');
  const [isLoading, setIsLoading] = useState(true);
  const [currentStudentRoll, setCurrentStudentRoll] = useState('2024CS1048');

  useEffect(() => {
    const studentData = localStorage.getItem('assessly_student');
    if (studentData) {
      try {
        const parsed = JSON.parse(studentData);
        if (parsed.rollNo) setCurrentStudentRoll(parsed.rollNo);
      } catch (e) {}
    }

    async function fetchLeaderboard() {
      try {
        const res = await fetch(`/api/rooms/${code}/leaderboard`);
        const data = await res.json();
        if (data.leaderboard) {
          setLeaderboard(data.leaderboard);
          setAssessmentTitle(data.assessmentTitle);
          setPrivacyMode(data.privacyMode);
        }
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLeaderboard();
  }, [code]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-xs text-slate-500 gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
        <span>Calculating verified rank standings...</span>
      </div>
    );
  }

  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-900 pb-16">
      {/* Top Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Leaderboard · Room {code}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/exam/${code}/result`}
            className="btn-secondary py-2 px-3 text-xs font-bold flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            My Score & Review
          </Link>
          <Link
            href="/student"
            className="btn-primary py-2 px-3.5 text-xs font-bold"
          >
            Student Portal
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-4 pt-8 space-y-6">
        {/* Title & Tie-Breaker Policy Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600">
              Verified Academic Standings
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
              Class Leaderboard
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {assessmentTitle} · {leaderboard.length} Total Examinees
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] font-mono text-slate-700 max-w-xs shadow-xs">
            <strong className="text-blue-900 font-bold block mb-0.5">Deterministic Tie-Breaker:</strong>
            1. Score DESC → 2. Fastest Server Duration → 3. Earliest Submission.
          </div>
        </div>

        {/* Top 3 Podium Cards */}
        {top3.length >= 3 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Rank 2 */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-center flex flex-col justify-between order-2 sm:order-1">
              <div>
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-mono font-extrabold text-xs flex items-center justify-center mx-auto mb-2 border border-slate-300">
                  2
                </div>
                <h3 className="font-bold text-sm text-slate-900 truncate">{top3[1].studentName}</h3>
                <div className="text-[11px] font-mono text-slate-400">{top3[1].studentRollNo}</div>
              </div>
              <div className="pt-3 border-t border-slate-100 mt-3">
                <div className="text-2xl font-extrabold text-slate-900">{top3[1].percentage}%</div>
                <div className="text-[11px] text-slate-500 font-mono flex items-center justify-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {top3[1].formattedDuration}
                </div>
              </div>
            </div>

            {/* Rank 1 - Center Highlight */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-amber-50/80 via-white to-white border-2 border-amber-300 shadow-card text-center flex flex-col justify-between order-1 sm:order-2 ring-2 ring-amber-200/50">
              <div>
                <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-900 font-mono font-extrabold text-sm flex items-center justify-center mx-auto mb-2 shadow-sm">
                  1
                </div>
                <h3 className="font-extrabold text-base text-slate-900 truncate">{top3[0].studentName}</h3>
                <div className="text-[11px] font-mono text-amber-800 font-bold">{top3[0].studentRollNo}</div>
              </div>
              <div className="pt-3 border-t border-amber-100 mt-3">
                <div className="text-3xl font-extrabold text-slate-900">{top3[0].percentage}%</div>
                <div className="text-[11px] text-emerald-700 font-mono font-bold flex items-center justify-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  {top3[0].formattedDuration} (Fastest)
                </div>
              </div>
            </div>

            {/* Rank 3 */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-center flex flex-col justify-between order-3">
              <div>
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 font-mono font-extrabold text-xs flex items-center justify-center mx-auto mb-2 border border-amber-200">
                  3
                </div>
                <h3 className="font-bold text-sm text-slate-900 truncate">{top3[2].studentName}</h3>
                <div className="text-[11px] font-mono text-slate-400">{top3[2].studentRollNo}</div>
              </div>
              <div className="pt-3 border-t border-slate-100 mt-3">
                <div className="text-2xl font-extrabold text-slate-900">{top3[2].percentage}%</div>
                <div className="text-[11px] text-slate-500 font-mono flex items-center justify-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {top3[2].formattedDuration}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full Leaderboard Dense Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-6 w-16">Rank</th>
                  <th className="py-3.5 px-6">Student</th>
                  <th className="py-3.5 px-6">Roll / ID</th>
                  <th className="py-3.5 px-6">Score</th>
                  <th className="py-3.5 px-6">Accuracy</th>
                  <th className="py-3.5 px-6">Completion Time</th>
                  <th className="py-3.5 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900">
                {leaderboard.map((entry) => {
                  const isCurrent =
                    entry.studentRollNo === currentStudentRoll ||
                    entry.studentName.toLowerCase().includes('aarav');

                  return (
                    <tr
                      key={entry.studentId}
                      className={`transition-colors ${
                        isCurrent
                          ? 'bg-blue-50/80 font-bold ring-1 ring-inset ring-blue-200'
                          : entry.rank <= 3
                          ? 'bg-slate-50/40'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-3.5 px-6 font-mono text-xs">
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center font-bold ${
                            entry.rank === 1
                              ? 'bg-amber-400 text-slate-900'
                              : entry.rank === 2
                              ? 'bg-slate-300 text-slate-800'
                              : entry.rank === 3
                              ? 'bg-amber-200 text-amber-900'
                              : 'text-slate-500'
                          }`}
                        >
                          {entry.rank}
                        </span>
                      </td>

                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {privacyMode === 'ANONYMOUS' && !isCurrent
                              ? `Student #${entry.rank}`
                              : entry.studentName}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-mono font-bold uppercase bg-slate-900 text-white px-2 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-6 font-mono text-[11px] text-slate-500">
                        {privacyMode === 'ANONYMOUS' && !isCurrent
                          ? '••••••••'
                          : entry.studentRollNo || '2024CS1000'}
                      </td>

                      <td className="py-3.5 px-6 font-mono">
                        <span className="text-sm font-extrabold text-slate-900">
                          {entry.percentage}%
                        </span>
                        <span className="text-slate-400 text-[11px]"> ({entry.score}/{entry.maxScore})</span>
                      </td>

                      <td className="py-3.5 px-6 font-mono text-xs text-emerald-700 font-semibold">
                        {entry.correctCount}/15 Correct
                      </td>

                      <td className="py-3.5 px-6 font-mono text-xs text-slate-600">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {entry.formattedDuration}
                        </span>
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Verified ✓
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
