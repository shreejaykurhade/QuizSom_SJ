'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { apiFetch } from '@/lib/auth/apiFetch';
import {
  Shield,
  Clock,
  FileText,
  AlertTriangle,
  Lock,
  ArrowRight,
  Maximize2,
  CheckCircle2,
  RefreshCw,
  Award,
} from 'lucide-react';

import { useAuth } from '@/components/AuthProvider';

export default function ExamBriefingPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const code = (params.code as string)?.toUpperCase();

  const [roomData, setRoomData] = useState<any>(null);
  const [studentInfo, setStudentInfo] = useState<{ name: string; rollNo: string }>({
    name: 'Student Candidate',
    rollNo: '2024CS1048',
  });
  const [acknowledged, setAcknowledged] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let studentName = 'Student Candidate';
    let studentRoll = '2024CS1048';

    if (user) {
      studentName =
        user.displayName ||
        (user.email
          ? user.email
              .split('@')[0]
              .replace(/[._-]/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase())
          : 'Student Candidate');

      studentRoll = user.email
        ? user.email.split('@')[0].toUpperCase().slice(0, 10)
        : `STU-${user.uid.slice(0, 6).toUpperCase()}`;
    }

    const saved = localStorage.getItem('assessly_student');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.name && parsed.name !== 'Aarav Sharma') {
          studentName = parsed.name;
        }
        if (parsed.rollNo && parsed.rollNo !== '2024CS1048') {
          studentRoll = parsed.rollNo;
        }
      } catch (e) {}
    }

    const updated = { name: studentName, rollNo: studentRoll };
    setStudentInfo(updated);
    localStorage.setItem('assessly_student', JSON.stringify(updated));

    async function loadRoom() {
      try {
        const res = await apiFetch(`/api/rooms/${code}`);
        const data = await res.json();
        if (data.room) {
          setRoomData(data);
        } else {
          setError(data.error || 'Assessment room not found');
        }
      } catch (err) {
        console.error('Failed to load room:', err);
        setError('Connection error loading room');
      } finally {
        setIsLoading(false);
      }
    }
    loadRoom();
  }, [code, user]);

  const handleStartExam = async () => {
    if (!acknowledged) return;
    setIsStarting(true);

    try {
      const res = await apiFetch(`/api/rooms/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: studentInfo.name,
          studentRollNo: studentInfo.rollNo,
        }),
      });

      const data = await res.json();
      if (!data.attempt) {
        alert(data.error || 'Failed to start attempt');
        setIsStarting(false);
        return;
      }

      localStorage.setItem(`assessly_attempt_${code}`, data.attempt.id);

      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (fsErr) {
        console.warn('Fullscreen request bypassed by browser policy:', fsErr);
      }

      router.push(`/exam/${code}/quiz`);
    } catch (err) {
      console.error('Start error:', err);
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-xs text-slate-500 gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
        <span>Loading assessment parameters...</span>
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-card text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">Room Unavailable</h1>
          <p className="text-xs text-slate-500">
            {error || `The assessment room ${code} could not be found or has expired.`}
          </p>
          <Link href="/student" className="btn-primary py-2 px-4 text-xs inline-block">
            Return to Student Join
          </Link>
        </div>
      </div>
    );
  }

  const assessment = roomData.assessment;
  const course = roomData.course;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between p-4 sm:p-6 text-slate-900 bg-grid-subtle">
      {/* Top Header */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between pb-4 border-b border-slate-200">
        <Logo size="sm" />

        <div className="text-xs font-mono font-bold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
          Room Code: <span className="text-blue-700 font-extrabold">{code}</span>
        </div>
      </div>

      {/* Main Briefing Card */}
      <main className="max-w-2xl mx-auto w-full my-8 bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-card space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-bold">
              {course?.code || 'CS301'}
            </span>
            <span className="text-xs text-slate-500 font-medium">{course?.name || 'Department Assessment'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {assessment?.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {assessment?.moduleName}
          </p>
        </div>

        {/* Examinee Identity Box */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono font-bold">Examinee Candidate</div>
            <div className="font-bold text-slate-900 text-sm mt-0.5">{studentInfo.name}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase font-mono font-bold">Roll / Student ID</div>
            <div className="font-mono font-bold text-blue-700 text-sm mt-0.5">{studentInfo.rollNo}</div>
          </div>
        </div>

        {/* Assessment Parameters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="text-slate-400 text-[10px] uppercase font-mono font-bold">Questions</div>
            <div className="font-extrabold text-base text-slate-900 mt-0.5">
              {assessment?.totalQuestions} MCQs
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="text-slate-400 text-[10px] uppercase font-mono font-bold">Duration</div>
            <div className="font-extrabold text-base text-slate-900 mt-0.5 font-mono">
              {assessment?.settings?.durationMinutes} Mins
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="text-slate-400 text-[10px] uppercase font-mono font-bold">Marking</div>
            <div className="font-extrabold text-base text-slate-900 mt-0.5 font-mono">
              +1 / -{assessment?.settings?.negativeMarks ?? 0.25}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="text-slate-400 text-[10px] uppercase font-mono font-bold">Attempts</div>
            <div className="font-extrabold text-base text-slate-900 mt-0.5">
              1 Attempt
            </div>
          </div>
        </div>

        {/* Proctoring & Fullscreen Notice Box */}
        <div className="p-5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-bold">
            <Shield className="w-4 h-4 text-amber-600" />
            <span>Controlled Exam Proctoring Safeguards</span>
          </div>
          <p className="text-amber-800 leading-relaxed">
            This internal assessment runs under enforced full-screen browser mode:
          </p>
          <ul className="list-disc list-inside space-y-1 text-amber-800 text-[11px] pt-1">
            <li><strong>First exit from full-screen:</strong> Generates an integrity warning notice.</li>
            <li><strong>Second exit from full-screen:</strong> Triggers immediate server auto-submission and attempt lock.</li>
            <li><strong>Authoritative server clock:</strong> Answers auto-submit when the countdown expires.</li>
          </ul>
        </div>

        {/* Mandatory Acknowledgment Checkbox */}
        <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:border-slate-300 transition-all">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="rounded text-slate-900 mt-0.5"
          />
          <span className="text-xs text-slate-800 font-medium leading-relaxed">
            I understand that exiting full-screen mode or switching windows will trigger proctoring integrity events and may result in immediate auto-submission.
          </span>
        </label>

        {/* Start Button */}
        <button
          onClick={handleStartExam}
          disabled={!acknowledged || isStarting}
          className="w-full btn-primary py-4 text-sm font-bold shadow-sm flex items-center justify-center gap-2"
        >
          <Maximize2 className="w-4 h-4" />
          {isStarting ? 'Initiating Proctored Session...' : 'Enter Full Screen & Start Assessment'}
        </button>
      </main>

      <footer className="text-center text-[11px] text-slate-400 font-mono">
        Authoritative Server Clock Synchronized · QuizSom Secure Examination Kernel
      </footer>
    </div>
  );
}
