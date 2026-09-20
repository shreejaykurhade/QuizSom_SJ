'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/components/Logo';
import {
  LayoutDashboard,
  FileQuestion,
  BookOpen,
  PlusCircle,
  BarChart2,
  Settings,
  LogOut,
  Radio,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Pencil,
  X,
  Check,
  Camera,
  Upload,
  Trash2,
  User,
} from 'lucide-react';

import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

interface FacultyProfile {
  name: string;
  department: string;
  semester: string;
  email: string;
  photoUrl?: string;
}

const DEFAULT_PROFILE: FacultyProfile = {
  name: 'Faculty Member',
  department: 'CSE Department',
  semester: 'Sem 4',
  email: 'faculty@university.edu',
  photoUrl: '',
};

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<FacultyProfile>(DEFAULT_PROFILE);
  const [isEditing, setIsEditing] = useState(false);
  const [tempProfile, setTempProfile] = useState<FacultyProfile>(DEFAULT_PROFILE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('quizsom_user_role', 'faculty');
    }
    if (user) {
      const googleName =
        user.displayName ||
        (user.email
          ? user.email
              .split('@')[0]
              .replace(/[._-]/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase())
          : 'Faculty Member');
      const googleEmail = user.email || '';
      const googlePhoto = user.photoURL || '';

      const storageKey = `quizsom_faculty_profile_${user.uid}`;
      const saved = localStorage.getItem(storageKey) || localStorage.getItem('quizsom_faculty_profile');
      let mergedProfile: FacultyProfile = {
        name: googleName,
        department: 'CSE Department',
        semester: 'Sem 4',
        email: googleEmail,
        photoUrl: googlePhoto,
      };

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          mergedProfile = {
            ...mergedProfile,
            ...parsed,
            name: parsed.name && parsed.name !== 'Dr. Arvind Ramanathan' && parsed.name !== 'Faculty Member' ? parsed.name : googleName,
            email: parsed.email && parsed.email !== 'arvind.ramanathan@university.edu' && parsed.email !== 'faculty@university.edu' ? parsed.email : googleEmail,
            photoUrl: parsed.photoUrl || googlePhoto,
          };
        } catch (e) {
          console.warn('Error reading saved faculty profile:', e);
        }
      }

      setProfile(mergedProfile);
      setTempProfile(mergedProfile);
    } else {
      try {
        const saved = localStorage.getItem('quizsom_faculty_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          setProfile(parsed);
          setTempProfile(parsed);
        }
      } catch (e) {
        console.warn('Error reading faculty profile from localStorage:', e);
      }
    }
  }, [user]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(tempProfile);
    try {
      const storageKey = user ? `quizsom_faculty_profile_${user.uid}` : 'quizsom_faculty_profile';
      localStorage.setItem(storageKey, JSON.stringify(tempProfile));
      localStorage.setItem('quizsom_faculty_profile', JSON.stringify(tempProfile));
      window.dispatchEvent(new CustomEvent('faculty-profile-updated', { detail: tempProfile }));
    } catch (e) {
      console.warn('Error saving faculty profile to localStorage:', e);
    }
    setIsEditing(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Please upload an image smaller than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setTempProfile((prev) => ({ ...prev, photoUrl: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setTempProfile((prev) => ({ ...prev, photoUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getInitials = (name: string) => {
    return (
      name
        .replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/i, '')
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'AR'
    );
  };

  if (pathname === '/teacher/login') {
    return <>{children}</>;
  }

  const navItems = [
    { label: 'Overview', href: '/teacher/dashboard', icon: LayoutDashboard },
    { label: 'Create Assessment', href: '/teacher/create', icon: PlusCircle, isHighlight: true },
    { label: 'Question Bank', href: '/teacher/question-bank', icon: FileQuestion },
    { label: 'Materials Library', href: '/teacher/materials', icon: BookOpen },
    { label: 'Live Rooms', href: '/teacher/rooms', icon: Radio, badge: 'Live' },
    { label: 'Results & Analytics', href: '/teacher/results', icon: BarChart2 },
  ];

  return (
    <div className="app-shell min-h-screen flex flex-col md:flex-row text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="app-sidebar w-full md:w-64 border-r border-slate-200/80 flex flex-col justify-between shrink-0 shadow-[4px_0_24px_rgba(15,23,42,0.035)] md:sticky md:top-0 md:h-screen">
        <div>
          {/* Brand Header */}
          <div className="h-16 px-4 border-b border-slate-100 flex items-center justify-between">
            <Logo size="sm" showBadge={false} />
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              FACULTY
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/teacher/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-slate-950 to-blue-900 text-white shadow-[0_6px_16px_rgba(30,58,138,0.18)]'
                      : item.isHighlight
                      ? 'text-blue-600 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-100'
                      : 'text-slate-600 hover:text-blue-900 hover:bg-blue-50/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.isHighlight ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-500 text-white shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-sm mb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {profile.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.photoUrl}
                    alt={profile.name}
                    className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0 shadow-2xs"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center font-mono font-bold text-xs text-blue-700 shrink-0">
                    {getInitials(profile.name)}
                  </div>
                )}
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {profile.name}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {profile.department} {profile.semester ? `· ${profile.semester}` : ''}
                  </div>
                </div>
              </div>

              {/* Edit Faculty Info Button */}
              <button
                type="button"
                onClick={() => {
                  setTempProfile(profile);
                  setIsEditing(true);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
                title="Edit Faculty Information & Photo"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-1 text-xs text-slate-500">
            <Link
              href="/student"
              className="hover:text-slate-900 flex items-center gap-1 transition-colors text-[11px] font-medium"
              target="_blank"
            >
              <span>Student View</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.push('/');
              }}
              className="hover:text-rose-600 flex items-center gap-1 transition-colors text-[11px] font-medium cursor-pointer"
            >
              <span>Sign Out</span>
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
          <div key={pathname} className="app-page-enter">{children}</div>
        </main>
      </div>

      {/* Interactive Faculty Profile Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Faculty Profile</h3>
                  <p className="text-xs text-slate-500">Update photo, instructor name, department & semester</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Profile Photo Uploader Section */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-4">
                <div className="relative shrink-0">
                  {tempProfile.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={tempProfile.photoUrl}
                      alt="Preview"
                      className="w-14 h-14 rounded-xl object-cover border border-slate-300 shadow-xs"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center font-mono font-bold text-base text-blue-700 shadow-2xs">
                      {getInitials(tempProfile.name)}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="text-xs font-bold text-slate-900">Profile Photo</div>
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-[11px] font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-slate-500" />
                      <span>{tempProfile.photoUrl ? 'Change Photo' : 'Upload Photo'}</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>

                    {tempProfile.photoUrl && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 text-[11px] font-semibold transition-colors flex items-center gap-1"
                        title="Remove custom photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">JPG, PNG or WEBP (Max 5MB)</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
                  Faculty Name
                </label>
                <input
                  type="text"
                  required
                  value={tempProfile.name}
                  onChange={(e) => setTempProfile({ ...tempProfile, name: e.target.value })}
                  placeholder="e.g. Dr. Arvind Ramanathan"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
                    Department
                  </label>
                  <input
                    type="text"
                    required
                    value={tempProfile.department}
                    onChange={(e) => setTempProfile({ ...tempProfile, department: e.target.value })}
                    placeholder="e.g. CSE Department"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
                    Semester
                  </label>
                  <input
                    type="text"
                    required
                    value={tempProfile.semester}
                    onChange={(e) => setTempProfile({ ...tempProfile, semester: e.target.value })}
                    placeholder="e.g. Sem 5"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
                  Official Email
                </label>
                <input
                  type="email"
                  required
                  value={tempProfile.email}
                  onChange={(e) => setTempProfile({ ...tempProfile, email: e.target.value })}
                  placeholder="e.g. arvind.ramanathan@university.edu"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
