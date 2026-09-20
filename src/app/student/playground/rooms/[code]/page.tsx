'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Trophy,
  ArrowLeft,
  RefreshCw,
  Copy,
  Check,
  Users,
  Clock,
  BookOpen,
  Award,
  Crown,
  Medal,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { apiFetch } from '@/lib/auth/apiFetch';
import { LiveRoom, Assessment } from '@/lib/db/types';

interface LeaderboardItem {
  rank: number;
  studentId: string;
  studentName: string;
  studentRollNo: string;
  score: number;
  percentageScore: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  totalQuestions: number;
  completionDurationSeconds: number;
  status: string;
  submittedAt: string;
}

export default function PlaygroundLeaderboardPage() {
  const params = useParams();
  const router = useRouter();
  const code = String(params?.code || '').toUpperCase();

  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [myRank, setMyRank] = useState<number | undefined>(undefined);
  const [myScore, setMyScore] = useState<number | undefined>(undefined);
  const [hasParticipated, setHasParticipated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    if (!code) return;
    try {
      const res = await apiFetch(`/api/student/playground/rooms/${code}/leaderboard`);
      const data = await res.json();
      if (res.ok) {
        setRoom(data.room);
        setAssessment(data.assessment);
        setLeaderboard(data.leaderboard || []);
        setMyRank(data.myRank);
        setMyScore(data.myScore);
        setHasParticipated(data.hasParticipated);
      }
    } catch (e) {
      console.error('Failed to load leaderboard:', e);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    void fetchLeaderboard();
    // Auto-refresh leaderboard every 8 seconds
    const interval = setInterval(() => {
      void fetchLeaderboard();
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const handleCopyShare = () => {
    navigator.clipboard.writeText(code);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  };

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];

  return (
    <div className="space-y-7 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <Link
            href="/student/playground"
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Playground Hub
          </Link>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
            {assessment?.title || 'Student Peer Challenge'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Topic: <strong>{assessment?.moduleName || 'Peer Battle'}</strong> · Room Code: <strong className="font-mono font-bold text-slate-800">{code}</strong>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleCopyShare}
            className="btn-secondary py-2 px-3.5 text-xs font-bold flex items-center gap-1.5 text-purple-700"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied Code!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code ({code})</span>
              </>
            )}
          </button>

          <Link
            href={`/exam/${code}`}
            className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{hasParticipated ? 'Retake Challenge' : 'Take Battle Now'}</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
          <span>Loading live student rankings...</span>
        </div>
      ) : (
        <div className="space-y-7">
          {/* Your Performance Banner */}
          {hasParticipated && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-mono text-base font-extrabold">
                  #{myRank}
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-purple-200 font-bold">
                    YOUR CURRENT STANDING
                  </div>
                  <div className="text-sm font-extrabold">
                    Rank #{myRank} of {leaderboard.length} Peers
                  </div>
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-[10px] text-purple-200 uppercase font-bold">Your Score</div>
                <div className="text-xl font-extrabold text-white">{myScore}%</div>
              </div>
            </div>
          )}

          {/* Top 3 Podium Cards */}
          {leaderboard.length > 0 && (
            <div className="grid sm:grid-cols-3 gap-4 pt-2">
              {/* Silver 2nd Place */}
              {top2 ? (
                <div className="min-h-56 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between gap-6 order-2 sm:order-1">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center gap-0.5 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 shadow-2xs">
                      <Medal className="h-4 w-4" />
                      <span className="font-mono text-xs font-black">2</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {formatDuration(top2.completionDurationSeconds)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {top2.studentName}
                    </h3>
                    <div className="text-2xl font-extrabold text-slate-800 font-mono mt-1">
                      {top2.percentageScore}%
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {top2.correctCount} of {top2.totalQuestions} correct
                    </div>
                  </div>
                </div>
              ) : (
                <div className="min-h-56 p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400 order-2 sm:order-1 flex flex-col gap-2 items-center justify-center">
                  <Medal className="h-7 w-7 text-slate-300" />
                  <span>Awaiting 2nd Challenger</span>
                </div>
              )}

              {/* Gold 1st Place (Featured Middle) */}
              {top1 && (
                <div className="min-h-56 p-5 rounded-2xl bg-gradient-to-b from-amber-50 to-white border-2 border-amber-300 shadow-md relative overflow-hidden flex flex-col justify-between gap-6 order-1 sm:order-2">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center gap-0.5 rounded-xl bg-amber-400 text-amber-950 shadow-sm">
                      <Trophy className="h-4 w-4" />
                      <span className="font-mono text-sm font-black">1</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-300">
                      <Crown className="w-3 h-3 text-amber-600" />
                      Leader
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-amber-700 font-bold">
                      TOP SCORER
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 truncate mt-0.5">
                      {top1.studentName}
                    </h3>
                    <div className="text-3xl font-extrabold text-amber-600 font-mono mt-1">
                      {top1.percentageScore}%
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-1">
                      {top1.correctCount} of {top1.totalQuestions} correct · {formatDuration(top1.completionDurationSeconds)}
                    </div>
                  </div>
                </div>
              )}

              {/* Bronze 3rd Place */}
              {top3 ? (
                <div className="min-h-56 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between gap-6 order-3">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center gap-0.5 rounded-xl border border-orange-200 bg-orange-50 text-orange-700 shadow-2xs">
                      <Medal className="h-4 w-4" />
                      <span className="font-mono text-xs font-black">3</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {formatDuration(top3.completionDurationSeconds)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {top3.studentName}
                    </h3>
                    <div className="text-2xl font-extrabold text-slate-800 font-mono mt-1">
                      {top3.percentageScore}%
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {top3.correctCount} of {top3.totalQuestions} correct
                    </div>
                  </div>
                </div>
              ) : (
                <div className="min-h-56 p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400 order-3 flex flex-col gap-2 items-center justify-center">
                  <Medal className="h-7 w-7 text-slate-300" />
                  <span>Awaiting 3rd Challenger</span>
                </div>
              )}
            </div>
          )}

          {/* Full Participant Table */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider">
                  All Participants ({leaderboard.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => void fetchLeaderboard()}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {leaderboard.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                  <Trophy className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-900">No Submissions Yet</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Be the first student to take this challenge and claim the #1 spot on the leaderboard!
                </p>
                <Link
                  href={`/exam/${code}`}
                  className="btn-primary py-2 px-4 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Take Quiz Now
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-mono font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4 text-center">Score</th>
                      <th className="py-3 px-4 text-center">Accuracy</th>
                      <th className="py-3 px-4 text-right">Time</th>
                      <th className="py-3 px-4 text-right">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leaderboard.map((item) => {
                      const isTop3 = item.rank <= 3;
                      return (
                        <tr
                          key={item.studentId}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono font-extrabold text-slate-800">
                            {item.rank === 1 ? '🥇 #1' : item.rank === 2 ? '🥈 #2' : item.rank === 3 ? '🥉 #3' : `#${item.rank}`}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs font-mono uppercase ${
                                item.rank === 1
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {item.studentName.charAt(0)}
                              </div>
                              <span className="truncate max-w-xs">{item.studentName}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-extrabold text-sm text-emerald-700">
                            {item.percentageScore}%
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-600">
                            <span className="text-emerald-700 font-bold">{item.correctCount}</span>
                            <span className="text-slate-400"> / {item.totalQuestions}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-600 text-[11px]">
                            {formatDuration(item.completionDurationSeconds)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-400">
                            {new Date(item.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
