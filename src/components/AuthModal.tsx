'use client';

import React, { useState, useId } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { GraduationCap, UserRound, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { firebaseAuth, isFirebaseConfigured } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AuthFormProps {
  initialRole?: 'student' | 'faculty';
  onSuccess?: () => void;
  isModal?: boolean;
}

export function AuthFormContent({ initialRole = 'faculty', onSuccess, isModal = false }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = useId();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [role, setRole] = useState<'student' | 'faculty'>(
    (searchParams?.get('role') as 'student' | 'faculty') || initialRole
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const redirectUser = (selectedRole?: 'student' | 'faculty') => {
    const activeRole = selectedRole || role;
    if (typeof window !== 'undefined') {
      localStorage.setItem('quizsom_user_role', activeRole);
    }
    const nextUrl = searchParams?.get('next') || (activeRole === 'faculty' ? '/teacher/dashboard' : '/student');
    if (onSuccess) {
      onSuccess();
    }
    // Navigate reliably to the target dashboard or portal
    if (typeof window !== 'undefined') {
      window.location.href = nextUrl;
    } else {
      router.replace(nextUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      if (isFirebaseConfigured && firebaseAuth) {
        if (mode === 'signup') {
          const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
          if (name.trim()) {
            await updateProfile(cred.user, { displayName: name.trim() });
          }
        } else {
          await signInWithEmailAndPassword(firebaseAuth, email, password);
        }
      }
      redirectUser();
    } catch (err: any) {
      console.error('Auth error:', err);
      setError((err?.message || 'Authentication failed').replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setBusy(true);
    setError('');

    try {
      if (isFirebaseConfigured && firebaseAuth) {
        await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      }
      redirectUser();
    } catch (err: any) {
      console.error('Google auth error:', err);
      setError((err?.message || 'Google sign-in failed').replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Role Switcher */}
      <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setRole('student')}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
            role === 'student'
              ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Student</span>
        </button>
        <button
          type="button"
          onClick={() => setRole('faculty')}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
            role === 'faculty'
              ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <UserRound className="w-4 h-4" />
          <span>Faculty</span>
        </button>
      </div>

      {/* Header */}
      <div className="text-left space-y-1">
        <p className="text-[11px] font-mono font-bold tracking-wider uppercase text-[#3F6B5B]">
          Firebase-Secured Access
        </p>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="text-xs text-slate-500">
          {mode === 'signin'
            ? `Sign in as ${role === 'faculty' ? 'Faculty Professor' : 'Student'} to continue`
            : `Register your institutional account for ${role === 'faculty' ? 'Faculty' : 'Student'} portal`}
        </p>
      </div>

      {/* Google Sign In Button */}
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={handleGoogleSignIn}
        className="w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-2xs"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Continue with Google</span>
      </Button>

      {/* Divider */}
      <div className="flex items-center gap-3 text-[11px] text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        <span>or use email</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-name`} className="text-xs font-semibold text-slate-700">
              Full Name
            </Label>
            <Input
              id={`${id}-name`}
              name="name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Prof. Shreejay Kurhade"
              className="h-10 rounded-xl"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor={`${id}-email`} className="text-xs font-semibold text-slate-700">
            Email address
          </Label>
          <Input
            id={`${id}-email`}
            name="email"
            autoComplete="email"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={role === 'faculty' ? 'faculty@somaiya.edu' : 'student@somaiya.edu'}
            className="h-10 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${id}-password`} className="text-xs font-semibold text-slate-700">
            Password (minimum 6 characters)
          </Label>
          <Input
            id={`${id}-password`}
            name="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={6}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-10 rounded-xl"
          />
        </div>

        {/* Remember me & Forgot Password */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${id}-remember`}
              checked={rememberMe}
              onCheckedChange={(c) => setRememberMe(Boolean(c))}
            />
            <Label htmlFor={`${id}-remember`} className="text-xs font-medium text-slate-600 cursor-pointer">
              Remember me
            </Label>
          </div>
          <a href="#" className="text-xs font-medium text-blue-600 hover:underline">
            Forgot password?
          </a>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={busy}
          className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
        >
          {busy ? (
            'Authenticating...'
          ) : mode === 'signin' ? (
            <>
              <span>Sign in securely</span>
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>Create account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>

        {/* Toggle Mode */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </button>
        </div>

        {/* Footer Security Badge */}
        <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-slate-400 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Real Firebase Authentication</span>
        </div>
      </form>
    </div>
  );
}

export function AuthDialog({
  trigger,
  initialRole = 'faculty',
  open,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  initialRole?: 'student' | 'faculty';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof open === 'boolean';
  const currentOpen = isControlled ? open : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;

  return (
    <Dialog open={currentOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="p-6 sm:p-7 sm:max-w-[420px] rounded-2xl bg-white border border-slate-200 shadow-2xl">
        <AuthFormContent
          initialRole={initialRole}
          isModal={true}
          onSuccess={() => setOpen?.(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
