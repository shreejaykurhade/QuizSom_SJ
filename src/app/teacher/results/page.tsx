'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart2,
  BookOpen,
  PlusCircle,
  RefreshCw,
  Radio,
  FileText,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { apiFetch } from '@/lib/auth/apiFetch';

import { useAuth } from '@/components/AuthProvider';

export default function TeacherResultsDirectoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/assessments');
      const body = await response.json();
      if (response.ok) {
        setAssessments(body.assessments || []);
      }
    } catch (e) {
      console.error('Failed to load assessments for analytics:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      void load();
    }
  }, [authLoading, user, load]);

  return (
    <div className="space-y-7 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">
              {assessments.length} Assessment{assessments.length === 1 ? '' : 's'}
            </span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
            Results & Pedagogical Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Inspect source-grounded score distributions, question difficulty analysis, and proctoring integrity audits.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => void load()}
            className="btn-secondary py-2 px-3 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/teacher/create"
            className="btn-primary py-2 px-3.5 text-xs font-bold shadow-sm flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            New Assessment
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Loading analytics catalog and score reports...</span>
        </div>
      ) : assessments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-4">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Assessment Reports Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Generate an assessment to track institutional performance, topic mastery curves, and integrity telemetry.
            </p>
          </div>
          <Link
            href="/teacher/create"
            className="btn-primary py-2 px-4 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            Create Assessment
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {assessments.map((asmt) => {
            const primaryRoom = asmt.rooms?.[0];
            return (
              <div
                key={asmt.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-indigo-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {asmt.courseCode || 'COURSE'}
                    </span>
                    {primaryRoom && (
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                        Room: {primaryRoom.code}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      Created {new Date(asmt.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 truncate">
                    {asmt.title}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                    <span>{asmt.moduleName || asmt.courseName || 'Course Assessment'}</span>
                    <span>·</span>
                    <span>{asmt.questionCount || 15} Questions</span>
                    <span>·</span>
                    <span>{asmt.durationMinutes || 15} Mins</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {primaryRoom && (
                    <Link
                      href={`/teacher/rooms/${primaryRoom.code}`}
                      className="btn-secondary py-2 px-3 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Radio className="w-3.5 h-3.5 text-emerald-600" />
                      Live Room
                    </Link>
                  )}
                  <Link
                    href={`/teacher/results/${asmt.id}`}
                    className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <BarChart2 className="w-3.5 h-3.5 text-indigo-300" />
                    Inspect Analytics
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
