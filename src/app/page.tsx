'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import FooterCTA from '@/components/FooterCTA';
import { BentoGridShowcase } from '@/components/ui/bento-product-features';
import AboutBento from '@/components/ui/about-bento';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  FileText,
  Shield,
  BarChart3,
  CheckCircle2,
  Users,
  Clock,
  ArrowRight,
  Sparkles,
  BookOpen,
  Lock,
  Layers,
  Award,
  AlertTriangle,
  RotateCcw,
  GraduationCap,
  Maximize2,
  Radio,
  ExternalLink,
  Zap,
  Check,
  ChevronRight,
  KeyRound,
  Shuffle,
  Timer,
  BookMarked,
  Play,
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [studentCode, setStudentCode] = useState('');
  const [showCitations, setShowCitations] = useState(true);

  const handleStudentJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = studentCode.trim().toUpperCase();
    if (code) {
      router.push(`/exam/${code}`);
    } else {
      router.push('/student');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 bg-grid-subtle transition-colors duration-200">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-5 sm:pt-8 pb-2 sm:pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-12 gap-2 sm:gap-6 lg:gap-8 items-center">
          {/* Left Column: Headline & Actions */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-5 min-w-0">
            {/* Main Headline */}
            <h1 className="text-[2rem] sm:text-5xl lg:text-6xl font-black tracking-[-0.045em] text-slate-950 leading-[1.08]">
              Assessment, built for the <span className="italic bg-gradient-to-r from-blue-700 via-indigo-700 to-emerald-600 bg-clip-text text-transparent underline decoration-blue-400/50 decoration-wavy decoration-1">classroom</span><span className="text-emerald-500">.</span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-[15px] sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl">
              Turn any PDF into a quiz, compete with peers, chat with your notes to clear doubts, revisit study material, and take tests in one complete learning platform with <strong className="text-slate-950 font-extrabold">QuizSom</strong>.
            </p>

            {/* Dual Path Action Buttons */}
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-3.5 pt-1">
              <Link
                href="/auth?role=faculty&next=%2Fteacher%2Fdashboard"
                className="px-3 sm:px-6 py-3 rounded-xl bg-gradient-to-r from-slate-950 to-blue-900 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_8px_22px_rgba(30,58,138,0.22)] hover:shadow-[0_10px_28px_rgba(30,58,138,0.28)] hover:-translate-y-0.5 whitespace-nowrap"
              >
                Faculty Sign in
                <ArrowRight className="w-4 h-4 text-white/80" />
              </Link>
              <Link
                href="/auth?role=student&next=%2Fstudent"
                className="px-3 sm:px-6 py-3 rounded-xl bg-white text-slate-900 font-semibold text-sm border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 shadow-sm hover:-translate-y-0.5 whitespace-nowrap"
              >
                Student Sign in
              </Link>
            </div>
          </div>

          {/* Keep the laptop still; float only the four illustrated foreground pieces. */}
          <div className="lg:col-span-6 flex items-center justify-center lg:justify-end relative min-w-0">
            <svg
              viewBox="0 0 4096 2728"
              role="img"
              aria-label="QuizSom quiz dashboard on a laptop, with floating quiz, Gemini, assessment and textbook illustrations"
              className="w-full max-w-xl lg:max-w-2xl h-auto select-none drop-shadow-xl"
            >
              <defs>
                <clipPath id="hero-create"><polygon points="330,340 1270,390 1280,1320 310,1340" /></clipPath>
                <clipPath id="hero-gemini"><polygon points="3210,165 4040,160 4040,650 3200,650" /></clipPath>
                <clipPath id="hero-integrity"><polygon points="3150,710 4040,720 4040,1610 3140,1610" /></clipPath>
                <clipPath id="hero-books"><polygon points="35,1370 1260,1360 1260,2300 35,2300" /></clipPath>
                <mask id="hero-still-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="4096" height="2728">
                  <rect width="4096" height="2728" fill="white" />
                  <polygon points="330,340 1270,390 1280,1320 310,1340" fill="black" />
                  <polygon points="3210,165 4040,160 4040,650 3200,650" fill="black" />
                  <polygon points="3150,710 4040,720 4040,1610 3140,1610" fill="black" />
                  <polygon points="35,1370 1260,1360 1260,2300 35,2300" fill="black" />
                </mask>
              </defs>
              <image href="/hero-illustration.png" width="4096" height="2728" mask="url(#hero-still-mask)" />
              <g className="hero-float hero-float-create" clipPath="url(#hero-create)"><image href="/hero-illustration.png" width="4096" height="2728" /></g>
              <g className="hero-float hero-float-gemini" clipPath="url(#hero-gemini)"><image href="/hero-illustration.png" width="4096" height="2728" /></g>
              <g className="hero-float hero-float-integrity" clipPath="url(#hero-integrity)"><image href="/hero-illustration.png" width="4096" height="2728" /></g>
              <g className="hero-float hero-float-books" clipPath="url(#hero-books)"><image href="/hero-illustration.png" width="4096" height="2728" /></g>
            </svg>
          </div>
        </div>
      </section>

      {/* Subtle Section Divider */}
      <div className="w-full border-t border-slate-200/80" />

      {/* Features & Arena Bento Showcase */}
      <AboutBento />

      {/* Subtle Section Divider */}
      <div className="w-full border-t border-slate-200/80" />

      {/* Platform Capabilities Section with Real Grounded BentoGridShowcase */}
      <section id="features" className="py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="max-w-2xl mb-8">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-950 font-black mb-1.5">Platform Capabilities</div>
          <h2 className="text-3xl font-black text-slate-950 tracking-tight">
            Learn, practise, compete, and take tests in one place.
          </h2>
          <p className="text-sm text-slate-600 mt-1.5">
            Build quizzes from PDFs, clear doubts with your notes, revise source material, challenge classmates, and move confidently from study to assessment.
          </p>
        </div>

        {/* Bento Grid Showcase for Real QuizSom Features */}
        <BentoGridShowcase
          integration={
            <Card className="flex h-full flex-col justify-between p-6 sm:p-7 bg-white border-slate-200 relative overflow-hidden">
              <div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 shadow-xs">
                  <Image
                    src="/gemini-star.png"
                    alt="Google Gemini"
                    width={26}
                    height={26}
                    className="object-contain"
                    unoptimized
                    priority
                  />
                </div>
                <CardTitle className="text-xl font-bold mb-2">Source-Grounded Questions</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Upload university course syllabus PDFs and reference textbooks. QuizSom indexes every module chunk with Gemini Flash, generating MCQs with exact page citations and verifiable textbook excerpts.
                </CardDescription>

                {/* 4K Mascot in the Middle Blank Space */}
                <div className="my-6 sm:my-8 flex items-center justify-center relative">
                  <motion.div
                    whileHover={{ scale: 1.06, rotate: [0, -3, 3, 0] }}
                    transition={{ duration: 0.4 }}
                    className="relative w-44 h-44 sm:w-52 sm:h-52 drop-shadow-md cursor-pointer"
                  >
                    <Image
                      src="/gemini-mascot-idea.png"
                      alt="Gemini AI Mascot"
                      fill
                      className="object-contain"
                      unoptimized
                      priority
                    />
                  </motion.div>
                </div>
              </div>
              <CardFooter className="p-0 pt-6 mt-auto flex items-center justify-between border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-700">Page Citations</span>
                </div>
                <Switch
                  checked={showCitations}
                  onCheckedChange={setShowCitations}
                  aria-label="Toggle page citations"
                />
              </CardFooter>
            </Card>
          }
          trackers={
            <Card className="h-full bg-white border-slate-200 overflow-hidden relative">
              <CardContent className="flex h-full flex-col justify-between p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">Live Room Telemetry</CardTitle>
                    <CardDescription className="text-xs">Real-Time Examinee Audit</CardDescription>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span>Active Sync</span>
                  </div>
                </div>

                {/* Sleek Overlapping Dynamic Avatar Stack */}
                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center -space-x-2.5 hover:space-x-1 transition-all duration-300">
                    {/* Examinee 1 - Aarav */}
                    <div
                      title="Aarav Sharma · Active (Q14/15)"
                      className="group relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 font-mono text-xs font-bold text-white shadow-md ring-2 ring-white transition-all duration-200 hover:scale-120 hover:z-30 hover:-translate-y-1 cursor-pointer"
                    >
                      <span>AS</span>
                    </div>

                    {/* Examinee 2 - Ananya */}
                    <div
                      title="Ananya Iyer · Submitted (96%)"
                      className="group relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 font-mono text-xs font-bold text-white shadow-md ring-2 ring-white transition-all duration-200 hover:scale-120 hover:z-30 hover:-translate-y-1 cursor-pointer"
                    >
                      <span>AI</span>
                    </div>

                    {/* Examinee 3 - Rohan */}
                    <div
                      title="Rohan Patil · 1 Warning Logged"
                      className="group relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 font-mono text-xs font-bold text-white shadow-md ring-2 ring-white transition-all duration-200 hover:scale-120 hover:z-30 hover:-translate-y-1 cursor-pointer"
                    >
                      <span>RP</span>
                    </div>

                    {/* Examinee 4 - Priya */}
                    <div
                      title="Priya Shah · Auto-Submitted (Strike 2)"
                      className="group relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-rose-500 to-red-600 font-mono text-xs font-bold text-white shadow-md ring-2 ring-white transition-all duration-200 hover:scale-120 hover:z-30 hover:-translate-y-1 cursor-pointer"
                    >
                      <span>PS</span>
                    </div>

                    {/* Count Pill */}
                    <div className="flex h-9 items-center justify-center rounded-full bg-slate-900 text-white font-mono text-xs font-extrabold px-3 shadow-md ring-2 ring-white transition-transform duration-200 hover:scale-110 hover:z-30 cursor-pointer">
                      +44
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-semibold text-slate-500">
                    48 Enrolled
                  </span>
                </div>
              </CardContent>
            </Card>
          }
          statistic={
            <Card className="relative h-full w-full overflow-hidden bg-white border-slate-200">
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage: "radial-gradient(#64748B 1px, transparent 1px)",
                  backgroundSize: "14px 14px",
                }}
              />
              <CardContent className="relative z-10 flex flex-col h-full items-center justify-center p-6 text-center">
                <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">2-Strike</span>
                <span className="text-xs font-mono uppercase font-bold text-amber-600 mt-1">Full-Screen Policy</span>
              </CardContent>
            </Card>
          }
          focus={
            <Card className="h-full bg-white border-slate-200">
              <CardContent className="flex h-full flex-col justify-between p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">Server-Side Authority</CardTitle>
                    <CardDescription className="text-xs">Zero Client Answer Exposure</CardDescription>
                  </div>
                  <Badge variant="outline" className="border-blue-300 text-blue-600 text-[10px] font-mono">
                    Protected
                  </Badge>
                </div>
                <div className="my-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">Server Clocks</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>Tamper-Proof Timer</span>
                  <span>Evaluated at Submit</span>
                </div>
              </CardContent>
            </Card>
          }
          productivity={
            <Card className="h-full bg-white border-slate-200">
              <CardContent className="flex h-full flex-col justify-between p-6">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                  <Shuffle className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Anti-Cheat Randomization</CardTitle>
                  <CardDescription className="text-xs">
                    Shuffled question sequences and randomized option IDs per student prevent answer sharing in exam halls.
                  </CardDescription>
                </div>
              </CardContent>
            </Card>
          }
          shortcuts={
            <Card className="h-full bg-white border-slate-200">
              <CardContent className="flex h-full flex-wrap items-center justify-between gap-4 p-6">
                <div className="max-w-md">
                  <CardTitle className="text-base font-bold">Deterministic Leaderboards & Pedagogical Analytics</CardTitle>
                  <CardDescription className="text-xs">
                    Tie-breaking by verified server completion timestamps and instant topic-level accuracy breakdown for faculty.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono">
                    <span className="text-slate-400 text-[10px] block">AVG SCORE</span>
                    <strong className="text-slate-900 font-bold">72%</strong>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono">
                    <span className="text-slate-400 text-[10px] block">COMPLETION</span>
                    <strong className="text-emerald-600 font-bold">100%</strong>
                  </div>
                </div>
              </CardContent>
            </Card>
          }
        />
      </section>

      {/* Unified Seamless Footer & CTA Component */}
      <FooterCTA />
    </div>
  );
}
