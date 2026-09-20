'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Logo from './Logo';
import { AuthDialog } from './AuthModal';
import { ArrowRight, LayoutDashboard, GraduationCap } from 'lucide-react';
import { useAuth } from './AuthProvider';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [userRole, setUserRole] = useState<'student' | 'faculty' | null>(null);
  const [studentAuthOpen, setStudentAuthOpen] = useState(false);
  const [facultyAuthOpen, setFacultyAuthOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const savedRole = localStorage.getItem('quizsom_user_role') as 'student' | 'faculty' | null;
      setUserRole(savedRole);
    }
  }, []);

  return (
    <header className="w-full bg-white/85 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 relative">
        {/* Left: Brand Logo & Wordmark */}
        <div className="flex items-center shrink-0 z-10">
          <div className="sm:hidden"><Logo size="sm" /></div>
          <div className="hidden sm:block"><Logo size="md" /></div>
        </div>

        {/* Right: Action CTAs */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 z-10">
          {mounted && user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-slate-600 hidden sm:inline-block px-2 py-1 rounded-lg bg-slate-100">
                {user.displayName || user.email?.split('@')[0]}
              </span>

              {/* Dynamic Role-Based Dashboard / Portal Routing */}
              {userRole === 'student' ? (
                <Link
                  href="/student"
                  className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Student Portal</span>
                </Link>
              ) : userRole === 'faculty' ? (
                <Link
                  href="/teacher/dashboard"
                  className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Faculty Dashboard</span>
                </Link>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Link
                    href="/student"
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1 shadow-2xs"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Student</span>
                  </Link>
                  <Link
                    href="/teacher/dashboard"
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center gap-1 shadow-2xs"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Faculty</span>
                  </Link>
                </div>
              )}

              {/* Sign out Button */}
              <button
                type="button"
                onClick={async () => {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('quizsom_user_role');
                  }
                  await logout();
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
              {/* Student Sign In Modal */}
              <AuthDialog
                initialRole="student"
                open={studentAuthOpen}
                onOpenChange={setStudentAuthOpen}
                trigger={
                  <button
                    type="button"
                    className="text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center whitespace-nowrap shadow-sm cursor-pointer"
                  >
                    <span className="sm:hidden">Student</span><span className="hidden sm:inline">Student Sign in</span>
                  </button>
                }
              />

              {/* Faculty Sign In Modal */}
              <AuthDialog
                initialRole="faculty"
                open={facultyAuthOpen}
                onOpenChange={setFacultyAuthOpen}
                trigger={
                  <button
                    type="button"
                    className="text-[11px] sm:text-xs font-semibold px-2.5 sm:px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm hover:shadow cursor-pointer"
                  >
                    <span className="sm:hidden">Faculty</span><span className="hidden sm:inline">Faculty Sign in</span>
                    <ArrowRight className="hidden sm:block w-3.5 h-3.5 text-white/80" />
                  </button>
                }
              />
            </>
          )}

        </div>
      </div>
    </header>
  );
}
