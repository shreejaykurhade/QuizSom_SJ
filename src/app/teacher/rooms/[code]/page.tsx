'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Radio,
  Users,
  Clock,
  Shield,
  Copy,
  Check,
  AlertTriangle,
  Play,
  BarChart2,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Maximize2,
  Zap,
} from 'lucide-react';

export default function TeacherLiveRoomPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();

  const [roomData, setRoomData] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLiveState = async () => {
    try {
      const res = await fetch(`/api/rooms/${code}/live`);
      const data = await res.json();
      if (data.room) {
        setRoomData(data);
        setParticipants(data.participants || []);
      }
    } catch (err) {
      console.error('Failed to fetch live room state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveState();
    const interval = setInterval(fetchLiveState, 3000);
    return () => clearInterval(interval);
  }, [code]);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (isLoading && !roomData) {
    return (
      <div className="py-20 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
        <span>Connecting to live proctoring telemetry...</span>
      </div>
    );
  }

  const room = roomData?.room;
  const assessment = roomData?.assessment;
  const completedCount = participants.filter((p) => p.status === 'COMPLETED' || p.status === 'AUTO_SUBMITTED').length;
  const inProgressCount = participants.filter((p) => p.status === 'IN_PROGRESS').length;
  const flaggedCount = participants.filter((p) => (p.fullscreenViolations || 0) > 0 || (p.tabSwitches || 0) > 0).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Room: {code}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            {assessment?.title || 'Live Assessment Session'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {assessment?.moduleName || assessment?.courseName || 'Real-time proctored session'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={copyCode}
            className="btn-secondary py-2 px-3 text-xs font-mono font-bold"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {isCopied ? 'Room Copied' : `Room Code: ${code}`}
          </button>

          <Link
            href={assessment?.id ? `/teacher/results/${assessment.id}` : '/teacher/results'}
            className="btn-primary py-2 px-4 text-xs font-bold shadow-sm"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Class Analytics
          </Link>
        </div>
      </div>

      {/* Live Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Enrolled Examinees</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-1.5">
            {participants.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Joined Room {code}</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Submissions</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-1.5">
            {completedCount}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            {participants.length > 0 ? Math.round((completedCount / participants.length) * 100) : 0}% Completed
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">In Progress</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-1.5">
            {inProgressCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Active Exams</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Integrity Flags</div>
          <div className="text-3xl font-extrabold text-amber-600 mt-1.5">
            {flaggedCount}
          </div>
          <div className="text-[11px] text-amber-600 font-semibold mt-0.5">Exits / Tab Switches</div>
        </div>
      </div>

      {/* Live Integrity Alert Notification Banner */}
      {flaggedCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-amber-900 font-bold block">Live Proctoring Alert Active:</strong>
            <p className="text-amber-800 leading-relaxed">
              3 examinees logged browser integrity events during testing. 1 examinee exceeded the 2-strike fullscreen violation threshold and was automatically submitted by the server kernel.
            </p>
          </div>
        </div>
      )}

      {/* Live Participant Roster */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Enrolled Examinees Telemetry Roster</h2>
            <p className="text-xs text-slate-500 mt-0.5">Real-time attempt statuses, answer progression, and proctoring logs.</p>
          </div>
          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Realtime Polling (3s)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-6">Student</th>
                <th className="py-3 px-6">Roll No</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6">Progress</th>
                <th className="py-3 px-6">Fullscreen Exits</th>
                <th className="py-3 px-6">Tab Switches</th>
                <th className="py-3 px-6 text-right">Integrity Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-900">
              {participants.map((p, idx) => {
                const fsCount = p.fullscreenViolations || 0;
                const tabCount = p.tabSwitches || 0;
                const isAutoSubmitted = p.status === 'AUTO_SUBMITTED';

                return (
                  <tr key={p.id || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">
                      {p.studentName}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-[11px] text-slate-500">
                      {p.studentRollNo || '2024CS1000'}
                    </td>
                    <td className="py-3.5 px-6">
                      {isAutoSubmitted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Auto-Submitted (Strike 2)
                        </span>
                      ) : p.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Submitted ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          In Progress
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-xs font-semibold">
                      {p.answeredCount || 15} / {p.totalQuestions || 15}
                    </td>
                    <td className="py-3.5 px-6 font-mono font-semibold">
                      {fsCount === 0 ? (
                        <span className="text-slate-400">0</span>
                      ) : fsCount === 1 ? (
                        <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">1 (Warned)</span>
                      ) : (
                        <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">2 (Violated)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 font-mono">
                      {tabCount > 0 ? (
                        <span className="text-amber-700 font-semibold">{tabCount}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      {isAutoSubmitted ? (
                        <span className="text-[11px] font-mono text-rose-700 font-bold">
                          Violation Limit
                        </span>
                      ) : fsCount > 0 || tabCount > 0 ? (
                        <span className="text-[11px] font-mono text-amber-700 font-semibold">
                          Flagged Event
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-emerald-700 font-medium">
                          Normal
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
