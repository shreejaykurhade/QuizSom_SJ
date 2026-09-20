'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { apiFetch } from '@/lib/auth/apiFetch';
import {
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Maximize2,
  Send,
  RefreshCw,
} from 'lucide-react';

import { useAuth } from '@/components/AuthProvider';

export default function StudentQuizInterfacePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const code = (params.code as string)?.toUpperCase();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(900);
  const [serverExpiresAt, setServerExpiresAt] = useState<string | null>(null);

  const [fullscreenStrikes, setFullscreenStrikes] = useState(0);
  const [warningMessage, setWarningMessage] = useState('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showAutoSubmitModal, setShowAutoSubmitModal] = useState(false);
  const [autoSubmitReasonText, setAutoSubmitReasonText] = useState('');
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [showTimeExpiredModal, setShowTimeExpiredModal] = useState(false);

  const isExamActive = useRef(true);
  const hasAutoSubmitted = useRef(false);

  // Initialize Exam Session
  useEffect(() => {
    async function initExam() {
      try {
        const studentData = localStorage.getItem('assessly_student');
        let parsedStudent = studentData ? JSON.parse(studentData) : null;

        if (user) {
          const googleName =
            user.displayName ||
            (user.email
              ? user.email
                  .split('@')[0]
                  .replace(/[._-]/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase())
              : 'Student Candidate');

          const googleRoll = user.email
            ? user.email.split('@')[0].toUpperCase().slice(0, 10)
            : `STU-${user.uid.slice(0, 6).toUpperCase()}`;

          parsedStudent = {
            name: parsedStudent?.name && parsedStudent.name !== 'Aarav Sharma' ? parsedStudent.name : googleName,
            rollNo: parsedStudent?.rollNo && parsedStudent.rollNo !== '2024CS1048' ? parsedStudent.rollNo : googleRoll,
          };
        } else if (!parsedStudent) {
          parsedStudent = { name: 'Student Candidate', rollNo: '2024CS1048' };
        }

        const roomRes = await apiFetch(`/api/rooms/${code}`);
        const roomJson = await roomRes.json();

        if (!roomJson.room) {
          alert('Room not found or no longer active');
          router.push('/student');
          return;
        }

        setAssessment(roomJson.assessment);
        setQuestions(roomJson.questions || []);

        const joinRes = await apiFetch(`/api/rooms/${code}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentName: parsedStudent.name,
            studentRollNo: parsedStudent.rollNo,
          }),
        });
        const joinJson = await joinRes.json();

        if (joinJson.attempt) {
          const att = joinJson.attempt;
          setAttemptId(att.id);

          const initialViolations =
            (att.fullscreenViolationCount || 0) + (att.tabSwitchCount || 0);
          setFullscreenStrikes(initialViolations);

          if (att.status === 'COMPLETED' || att.status === 'AUTO_SUBMITTED') {
            router.replace(`/exam/${code}/result`);
            return;
          }

          if (att.answers) {
            const restored: Record<string, string> = {};
            Object.entries(att.answers).forEach(([qId, ans]: [string, any]) => {
              if (ans.selectedOptionId) {
                restored[qId] = ans.selectedOptionId;
              }
            });
            setSelectedAnswers(restored);
          }

          if (att.expiresAt) {
            setServerExpiresAt(att.expiresAt);
            const remaining = Math.max(
              0,
              Math.floor((new Date(att.expiresAt).getTime() - Date.now()) / 1000)
            );
            setTimeLeftSeconds(remaining);
          }
        }
      } catch (err) {
        console.error('Quiz init error:', err);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    }

    initExam();
  }, [code, router]);

  // Authoritative Submission Routine
  const executeSubmission = useCallback(
    async (isAuto = false, reason = '') => {
      if (!attemptId || hasAutoSubmitted.current) return;
      hasAutoSubmitted.current = true;
      isExamActive.current = false;
      setIsSubmitting(true);

      try {
        await apiFetch(`/api/attempts/${attemptId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isAutoSubmitted: isAuto, reason }),
        });
      } catch (err) {
        console.error('Submit error:', err);
      } finally {
        setTimeout(() => {
          router.replace(`/exam/${code}/result`);
        }, 1500);
      }
    },
    [attemptId, code, router]
  );

  // Auto-Submit on Time Expiry
  const handleAutoSubmitOnExpiry = useCallback(() => {
    if (!isExamActive.current || hasAutoSubmitted.current) return;
    setShowTimeExpiredModal(true);
    setShowWarningModal(false);
    executeSubmission(true, 'TIME_EXPIRED');
  }, [executeSubmission]);

  // Real-time Expiry Countdown Timer
  useEffect(() => {
    if (!serverExpiresAt || !isExamActive.current) return;

    const timer = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(serverExpiresAt).getTime() - Date.now()) / 1000)
      );
      setTimeLeftSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        handleAutoSubmitOnExpiry();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [serverExpiresAt, handleAutoSubmitOnExpiry]);

  // Record Integrity Event & Handle Strikes
  const logIntegrityEvent = useCallback(
    async (eventType: string, metadata?: Record<string, any>) => {
      if (!attemptId || !isExamActive.current || hasAutoSubmitted.current) return;

      try {
        const res = await apiFetch(`/api/attempts/${attemptId}/integrity-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType,
            questionIndex: currentIndex + 1,
            timeRemainingSeconds: timeLeftSeconds,
            metadata,
          }),
        });

        const data = await res.json();

        if (data.shouldAutoSubmit) {
          isExamActive.current = false;
          setShowWarningModal(false);
          setShowAutoSubmitModal(true);
          setAutoSubmitReasonText(
            eventType === 'TAB_SWITCH' || eventType === 'WINDOW_BLUR'
              ? 'Multiple tab switches or application switches detected. Anti-cheating policy enforced.'
              : 'Full-screen mode was exited repeatedly, exceeding the proctoring violation threshold.'
          );
          executeSubmission(true, data.attempt?.autoSubmitReason || 'INTEGRITY_LIMIT_EXCEEDED');
        } else if (data.violationCount >= 1) {
          setFullscreenStrikes(data.violationCount);
          setWarningMessage(
            eventType === 'TAB_SWITCH' || eventType === 'WINDOW_BLUR'
              ? 'Tab switch or window blur detected! Tab switching is strictly prohibited during exams.'
              : 'Full-screen mode was exited! Full-screen lockdown is required.'
          );
          setShowWarningModal(true);
        }
      } catch (err) {
        console.error('Integrity log error:', err);
      }
    },
    [attemptId, currentIndex, timeLeftSeconds, executeSubmission]
  );

  // Anti-Cheating: Fullscreen, Tab Switch, Window Blur, and Keyboard Traps
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!isExamActive.current || hasAutoSubmitted.current) return;
      const isFullscreen = Boolean(document.fullscreenElement);
      if (!isFullscreen && !showAutoSubmitModal) {
        logIntegrityEvent('FULLSCREEN_EXIT', { action: 'exited_fullscreen' });
      }
    };

    const handleVisibilityChange = () => {
      if (!isExamActive.current || hasAutoSubmitted.current) return;
      if (document.hidden) {
        logIntegrityEvent('TAB_SWITCH', { action: 'document_hidden_tab_switched' });
      }
    };

    const handleWindowBlur = () => {
      if (!isExamActive.current || hasAutoSubmitted.current) return;
      logIntegrityEvent('WINDOW_BLUR', { action: 'window_blur_app_switched' });
    };

    // Trap keyboard shortcuts used for cheating or switching
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isExamActive.current || hasAutoSubmitted.current) return;

      // Trap Alt+Tab, Cmd+Tab, Ctrl+Tab
      if (e.key === 'Tab' && (e.altKey || e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        logIntegrityEvent('TAB_SWITCH', { shortcut: 'TabSwitchKeyCombo' });
        return;
      }

      // Trap Cmd+T, Ctrl+T (New Tab)
      if ((e.ctrlKey || e.metaKey) && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        e.stopPropagation();
        logIntegrityEvent('TAB_SWITCH', { shortcut: 'NewTabCombo' });
        return;
      }

      // Trap Cmd+N, Ctrl+N (New Window)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        e.stopPropagation();
        logIntegrityEvent('TAB_SWITCH', { shortcut: 'NewWindowCombo' });
        return;
      }

      // Trap Cmd+W, Ctrl+W (Close Tab)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Trap F12, Cmd+Option+I, Ctrl+Shift+I (DevTools)
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'I' || e.key === 'i'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        logIntegrityEvent('DEVTOOLS_ATTEMPT', { shortcut: 'DevToolsCombo' });
        return;
      }

      // Trap Copy / Paste shortcuts (Ctrl+C, Ctrl+V, Cmd+C, Cmd+V)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'a' || e.key === 'x')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };

    // Prevent context menu (right click) and selection
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleCopyCutPaste = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyCutPaste);
    document.addEventListener('cut', handleCopyCutPaste);
    document.addEventListener('paste', handleCopyCutPaste);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyCutPaste);
      document.removeEventListener('cut', handleCopyCutPaste);
      document.removeEventListener('paste', handleCopyCutPaste);
    };
  }, [logIntegrityEvent, showAutoSubmitModal]);

  const resumeFullscreen = async () => {
    setShowWarningModal(false);
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {}
  };

  const handleSelectOption = async (questionId: string, optionId: string) => {
    if (!isExamActive.current || hasAutoSubmitted.current) return;

    const updated = { ...selectedAnswers, [questionId]: optionId };
    setSelectedAnswers(updated);

    if (attemptId) {
      try {
        await apiFetch(`/api/attempts/${attemptId}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId,
            selectedOptionId: optionId,
          }),
        });
        setIsConnected(true);
      } catch (err) {
        console.warn('Answer sync error:', err);
        setIsConnected(false);
      }
    }
  };

  const handleFinalSubmit = () => {
    setShowSubmitConfirmModal(false);
    executeSubmission(false, 'MANUAL_SUBMISSION');
  };

  if (isLoading || questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-xs text-slate-500 gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
        <span>Initializing proctored exam console...</span>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(selectedAnswers).length;
  const unansweredCount = questions.length - answeredCount;

  const mins = Math.floor(timeLeftSeconds / 60);
  const secs = timeLeftSeconds % 60;
  const formattedTimer = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const isTimeCritical = timeLeftSeconds < 120;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between text-slate-900 select-none">
      {/* Top Proctored Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-2 shadow-xs">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Logo size="sm" showBadge={false} />

          <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 break-words [overflow-wrap:anywhere] max-w-[110px] min-[390px]:max-w-[180px] sm:max-w-md">
              {assessment?.title || 'Course Assessment'}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Question {currentIndex + 1} of {questions.length}<span className="hidden sm:inline"> · Room: {code}</span>
            </div>
          </div>
        </div>

        {/* Proctoring, Timer & Connection Status */}
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono">
            <span
              className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                fullscreenStrikes === 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
              }`}
            >
              {fullscreenStrikes === 0 ? '0/2 Strikes' : `${fullscreenStrikes}/2 Strikes`}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
            {isConnected ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            )}
            <span>{isConnected ? 'Sync Active' : 'Reconnecting...'}</span>
          </div>

          <div
            className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 font-mono font-bold text-sm shadow-xs ${
              isTimeCritical
                ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse ring-2 ring-rose-200'
                : 'bg-slate-900 text-white border-slate-900'
            }`}
          >
            <Clock className={`w-4 h-4 ${isTimeCritical ? 'text-rose-600' : 'text-slate-300'}`} />
            <span>{formattedTimer}</span>
          </div>
        </div>
      </header>

      {/* Main Question Focus Body */}
      <main className="max-w-3xl mx-auto w-full px-3 sm:px-4 py-5 sm:py-8 flex-1 flex flex-col justify-center">
        <div className="min-w-0 bg-white p-4 sm:p-10 rounded-2xl border border-slate-200 shadow-card space-y-6">
          {/* Question Eyebrow */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-3 border-b border-slate-100">
            <span className="font-mono text-xs font-bold px-3 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              QUESTION {currentIndex + 1} OF {questions.length}
            </span>
            <span className="min-w-0 break-words text-[11px] text-slate-500 font-mono">
              Topic: <strong className="text-slate-700">{currentQ?.topic}</strong>
            </span>
          </div>

          {/* Question Text */}
          <h2 className="break-words [overflow-wrap:anywhere] text-base sm:text-xl font-bold text-slate-900 leading-relaxed">
            {currentQ?.questionText}
          </h2>

          {/* Vertically Stacked Options */}
          <div className="space-y-3 pt-2">
            {currentQ?.options?.map((opt: any, optIdx: number) => {
              const isSelected = selectedAnswers[currentQ.id] === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelectOption(currentQ.id, opt.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full border flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 text-slate-500'
                    }`}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </div>
                  <div className="min-w-0 break-words [overflow-wrap:anywhere] text-sm font-medium text-slate-800 leading-relaxed pt-0.5">
                    {opt.text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Bottom Sticky Proctored Controls */}
      <footer className="bg-white border-t border-slate-200 p-2.5 sm:p-4 sticky bottom-0 z-30 shadow-lg">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="btn-secondary px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {/* Question Grid / Status */}
          <div className="order-3 flex w-full items-center gap-1.5 overflow-x-auto py-1 sm:order-none sm:w-auto sm:min-w-0 sm:flex-1 no-scrollbar">
            {questions.map((q, idx) => {
              const isAns = Boolean(selectedAnswers[q.id]);
              const isCurr = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all shrink-0 ${
                    isCurr
                      ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/30'
                      : isAns
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() =>
                  setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))
                }
                className="btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowSubmitConfirmModal(true)}
                className="btn-primary px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>Submit Exam</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* STRIKE 1 INTEGRITY LOCKDOWN MODAL */}
      {showWarningModal && !showAutoSubmitModal && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-amber-300 shadow-modal max-w-md w-full p-6 sm:p-8 text-center space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto shadow-sm">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-amber-700 font-bold">
                Strike 1 of 2 · Proctoring Warning
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                {warningMessage || 'Integrity Policy Violation Detected'}
              </h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Tab switching (Alt+Tab / Cmd+Tab) and exiting full-screen mode are strictly prohibited.
                <strong className="block text-rose-700 font-bold mt-1.5">
                  One more violation will immediately trigger automatic submission and scoring of your exam!
                </strong>
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={resumeFullscreen}
                className="w-full btn-primary py-3.5 text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
                <span>I Understand · Resume Full-Screen Exam</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STRIKE 2 HARD AUTO-SUBMIT MODAL */}
      {showAutoSubmitModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-rose-300 shadow-modal max-w-md w-full p-6 sm:p-8 text-center space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto shadow-sm">
              <Shield className="w-7 h-7" />
            </div>

            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-rose-700 font-bold">
                Strike 2 Enforced · Exam Terminated
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Assessment Auto-Submitted
              </h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {autoSubmitReasonText ||
                  'The maximum proctoring violation threshold was reached. Your answers have been recorded and your exam has been automatically submitted to the server.'}
              </p>
            </div>

            <div className="text-xs font-mono text-slate-500 flex items-center justify-center gap-2 pt-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <RefreshCw className="w-4 h-4 animate-spin text-rose-600" />
              <span>Finalizing server-side scoring & generating analytics...</span>
            </div>
          </div>
        </div>
      )}

      {/* TIME EXPIRED AUTO-SUBMIT MODAL */}
      {showTimeExpiredModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-blue-200 shadow-modal max-w-md w-full p-6 sm:p-8 text-center space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto shadow-sm">
              <Clock className="w-7 h-7" />
            </div>

            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-blue-700 font-bold">
                Time Limit Reached
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Exam Duration Concluded
              </h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                The allocated exam duration has ended. Your responses are being automatically submitted and evaluated by the server.
              </p>
            </div>

            <div className="text-xs font-mono text-slate-500 flex items-center justify-center gap-2 pt-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span>Submitting responses & generating performance breakdown...</span>
            </div>
          </div>
        </div>
      )}

      {/* SUBMISSION CONFIRMATION MODAL */}
      {showSubmitConfirmModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-modal max-w-md w-full p-6 sm:p-8 text-center space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Submit internal assessment?
              </h2>
              <p className="text-xs text-slate-600 mt-1.5">
                You have answered <strong>{answeredCount} of {questions.length}</strong> questions.
                {unansweredCount > 0 && (
                  <span className="text-amber-700 block mt-1 font-bold">
                    {unansweredCount} question{unansweredCount > 1 ? 's remain' : ' remains'} unanswered.
                  </span>
                )}
              </p>
              <div className="text-[11px] text-slate-400 mt-2">
                Once submitted, responses cannot be modified.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowSubmitConfirmModal(false)}
                className="btn-secondary py-2.5 text-xs font-semibold cursor-pointer"
              >
                Review Answers
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="btn-primary py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
              >
                {isSubmitting ? 'Evaluating...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
