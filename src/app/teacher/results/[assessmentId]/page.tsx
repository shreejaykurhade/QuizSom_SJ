'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/auth/apiFetch';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Shield,
  ArrowRight,
  TrendingUp,
  Download,
  Users,
  Award,
  Sparkles,
  RefreshCw,
  Zap,
} from 'lucide-react';

export default function TeacherResultsAnalyticsPage() {
  const params = useParams();
  const assessmentId = params.assessmentId as string;

  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'topics' | 'integrity'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await apiFetch(`/api/assessments/${assessmentId}/analytics`);
        const json = await res.json();
        if (json.analytics) {
          setData(json);
        }
      } catch (err) {
        console.error('Analytics load error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAnalytics();
  }, [assessmentId]);

  if (isLoading && !data) {
    return (
      <div className="py-20 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
        <span>Compiling institutional analytics & integrity audit...</span>
      </div>
    );
  }

  const assessment = data?.assessment;
  const analytics = data?.analytics;
  const integrityList = data?.integrityAuditList || [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
              {assessment?.courseCode || 'COURSE'}
            </span>
            <span className="text-xs text-slate-400 font-mono">Evaluation & Integrity Audit</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            {assessment?.title || 'Course Assessment Analytics'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {assessment?.moduleName || assessment?.courseName || 'Institutional Performance Report'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={data?.rooms?.[0]?.code ? `/teacher/rooms/${data.rooms[0].code}` : '/teacher/rooms'}
            className="btn-secondary py-2 px-3.5 text-xs font-semibold"
          >
            Live Room View
          </Link>
          <button
            onClick={() => window.print()}
            className="btn-primary py-2 px-4 text-xs font-bold shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export Audit Report
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="text-[11px] text-slate-500 font-medium">Participants</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{analytics?.totalParticipants ?? 0}</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">{analytics?.totalParticipants ? 'Active Session' : 'No Attempts'}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="text-[11px] text-slate-500 font-medium">Class Average</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{analytics?.averageScorePercentage ?? 0}%</div>
          <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Average Score</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="text-[11px] text-slate-500 font-medium">Median Score</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{analytics?.medianScorePercentage ?? 0}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">50th Percentile</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="text-[11px] text-slate-500 font-medium">Highest Score</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{analytics?.highestScorePercentage ?? 0}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Top Score</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="text-[11px] text-slate-500 font-medium">Lowest Score</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">{analytics?.lowestScorePercentage ?? 0}%</div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">Lowest Score</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="text-[11px] text-slate-500 font-medium">Integrity Events</div>
          <div className="text-2xl font-extrabold text-rose-600 mt-1">{analytics?.integritySummary?.totalFlaggedStudents ?? 0}</div>
          <div className="text-[10px] text-rose-700 font-medium mt-0.5">{analytics?.integritySummary?.totalFlaggedStudents ? 'Flagged Attempts' : 'Clean Session'}</div>
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div className="-mx-1 flex items-center gap-6 overflow-x-auto border-b border-slate-200 px-1 text-xs font-semibold whitespace-nowrap">
        {[
          { id: 'overview', label: 'Score Distribution & Insights' },
          { id: 'questions', label: 'Question Accuracy Breakdown' },
          { id: 'topics', label: 'Topic Mastery Matrix' },
          { id: 'integrity', label: 'Integrity Audit Log' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 transition-all relative ${
              activeTab === tab.id
                ? 'text-slate-900 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full"></span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & SCORE DISTRIBUTION */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Class Score Distribution Histogram</h2>
            <div className="space-y-3 pt-2">
              {analytics?.scoreDistribution?.map((bin: any) => {
                const total = analytics?.totalParticipants || 0;
                const pct = total > 0 ? Math.round((bin.count / total) * 100) : 0;
                return (
                  <div key={bin.range} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-700">
                      <span className="font-semibold">{bin.range}</span>
                      <span>{bin.count} Students ({pct}%)</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-slate-900 to-indigo-900 rounded-full transition-all"
                        style={{ width: `${bin.count > 0 ? Math.max(5, pct) : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUESTION ACCURACY ANALYSIS */}
      {activeTab === 'questions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Question Accuracy Breakdown</h2>
            <p className="text-xs text-slate-500 mt-0.5">Identifies difficult concepts, discriminator questions, and textbook citations.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-6">#</th>
                  <th className="py-3 px-6">Question & Concept</th>
                  <th className="py-3 px-6">Topic</th>
                  <th className="py-3 px-6">Difficulty</th>
                  <th className="py-3 px-6">Accuracy</th>
                  <th className="py-3 px-6 text-right">Source Grounding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900">
                {analytics?.questionStats?.map((qs: any) => {
                  const isTricky = qs.accuracyPercentage < 65;
                  return (
                    <tr key={qs.questionId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6 font-mono text-xs font-bold text-indigo-700">
                        Q{qs.questionIndex < 10 ? `0${qs.questionIndex}` : qs.questionIndex}
                      </td>
                      <td className="py-3.5 px-6 max-w-sm">
                        <div className="font-semibold text-slate-900">{qs.questionText}</div>
                      </td>
                      <td className="py-3.5 px-6 text-slate-600 font-medium">
                        {qs.topic}
                      </td>
                      <td className="py-3.5 px-6 capitalize">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          qs.difficulty === 'hard'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {qs.difficulty}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-mono">
                        <span className={`font-extrabold ${isTricky ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {qs.accuracyPercentage}%
                        </span>
                        <span className="text-slate-400 text-[11px]"> ({qs.correctCount}/{qs.totalAnswered})</span>
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono text-[11px] text-slate-500">
                        Page {qs.sourceCitation?.pageNumber || 1} · {qs.sourceCitation?.sectionTitle || 'Section'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TOPIC MASTERY MATRIX */}
      {activeTab === 'topics' && (
        <div className="grid sm:grid-cols-2 gap-4">
          {analytics?.topicStats?.map((ts: any) => (
            <div
              key={ts.topic}
              className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 hover:border-slate-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900">{ts.topic}</h3>
                <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                  ts.status === 'STRONG'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : ts.status === 'MODERATE'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {ts.status.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">{ts.totalQuestions} Questions Evaluated</span>
                  <span className="font-extrabold text-slate-900">{ts.accuracyPercentage}% Mastery</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      ts.accuracyPercentage >= 75
                        ? 'bg-emerald-500'
                        : ts.accuracyPercentage >= 60
                        ? 'bg-slate-900'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${ts.accuracyPercentage}%` }}
                  />
                </div>
              </div>

              <div className="text-[11px] text-slate-500 pt-1">
                {ts.accuracyPercentage >= 75
                  ? 'High student retention and concept fluency across all class sections.'
                  : ts.accuracyPercentage >= 60
                  ? 'Good general understanding; targeted revision recommended for edge cases.'
                  : 'Requires remedial tutorial focus in upcoming lecture sessions.'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: INTEGRITY AUDIT LOG */}
      {activeTab === 'integrity' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">Proctoring & Integrity Telemetry Log</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Timestamped browser telemetry: Full-screen exits, tab switches, and auto-submission events.
              </p>
            </div>
            <div className="text-xs font-mono bg-amber-50 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-200 font-bold">
              Enforced Policy: 2-Strike Violation Limit
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-6">Student</th>
                  <th className="py-3 px-6">Roll No</th>
                  <th className="py-3 px-6">Score</th>
                  <th className="py-3 px-6">Fullscreen Exits</th>
                  <th className="py-3 px-6">Tab Switches</th>
                  <th className="py-3 px-6">Final Status</th>
                  <th className="py-3 px-6 text-right">Audit Assessment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900">
                {integrityList.map((item: any, idx: number) => {
                  const isViolated = item.fullscreenExits >= 2 || item.status === 'AUTO_SUBMITTED';
                  const isWarned = item.fullscreenExits === 1 || item.tabSwitches > 0;

                  return (
                    <tr
                      key={item.attemptId || idx}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isViolated ? 'bg-rose-50/40' : isWarned ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-6 font-semibold text-slate-900">
                        {item.studentName}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-[11px] text-slate-500">
                        {item.studentRollNo}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-bold">
                        {item.scorePercentage}%
                      </td>
                      <td className="py-3.5 px-6 font-mono">
                        {item.fullscreenExits === 0 ? (
                          <span className="text-slate-400">0</span>
                        ) : item.fullscreenExits === 1 ? (
                          <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">1 (Warned)</span>
                        ) : (
                          <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">2 (Auto-submit)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 font-mono">
                        {item.tabSwitches > 0 ? (
                          <span className="text-amber-800 font-semibold">{item.tabSwitches}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6">
                        {isViolated ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Auto-Submitted (Strike 2)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Completed Normally
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono text-[11px]">
                        {isViolated ? (
                          <span className="text-rose-700 font-bold">Flagged & Locked</span>
                        ) : isWarned ? (
                          <span className="text-amber-800 font-semibold">Minor Anomaly</span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">Clean</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
