'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  UserRound,
  Trophy,
} from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/components/AuthProvider';

const links = [
  { label: 'Overview', href: '/student', icon: LayoutDashboard },
  { label: 'Study Materials', href: '/student/materials', icon: BookOpen },
  { label: 'Playground', href: '/student/playground', icon: Trophy },
  { label: 'Study chat', href: '/student/chat', icon: MessageSquareText },
  { label: 'Past quizzes', href: '/student/history', icon: History },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Student';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('quizsom_user_role', 'student');
    }
  }, []);

  return (
    <div className="app-shell min-h-screen text-slate-900 md:flex">
      <aside className="app-sidebar flex w-full shrink-0 flex-col justify-between border-b border-slate-200/80 shadow-[4px_0_24px_rgba(15,23,42,0.035)] md:sticky md:top-0 md:h-screen md:w-64 md:border-b-0 md:border-r">
        <div>
          <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
            <Logo size="sm" showBadge={false} />
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-emerald-700">
              Student
            </span>
          </div>
          <nav className="space-y-1 p-3">
            {links.map((link) => {
              const Icon = link.icon;
              const active =
                pathname === link.href ||
                (link.href !== '/student' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-gradient-to-r from-slate-950 to-blue-900 text-white shadow-[0_6px_16px_rgba(30,58,138,0.18)]'
                      : 'text-slate-600 hover:bg-blue-50/70 hover:text-blue-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-500'}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/50 p-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt={displayName}
                className="h-8 w-8 rounded-lg object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
                <UserRound className="w-4" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">{displayName}</p>
              <p className="truncate text-[11px] text-slate-500">{user?.email || 'Signed-in student'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.push('/');
            }}
            className="mt-2 flex items-center gap-1 px-1 text-[11px] font-medium text-slate-500 hover:text-rose-600 cursor-pointer w-full text-left"
          >
            <LogOut className="w-3" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
          <div key={pathname} className="app-page-enter">{children}</div>
        </main>
      </div>
    </div>
  );
}
