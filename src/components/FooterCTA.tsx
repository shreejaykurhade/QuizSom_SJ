"use client";

import React, { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import {
  Mail,
  Phone,
  MapPin,
  Globe,
  Github,
  Twitter,
  Linkedin,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import { TextHoverEffect } from "@/components/ui/hover-footer";
import { useAuth } from "@/components/AuthProvider";
import { AuthDialog } from "@/components/AuthModal";

export default function FooterCTA() {
  const { user } = useAuth();
  const [facultyAuthOpen, setFacultyAuthOpen] = useState(false);
  const [studentAuthOpen, setStudentAuthOpen] = useState(false);

  // Footer link data for QuizSom
  const footerLinks = [
    {
      title: "Portals",
      links: [
        { label: "Faculty Dashboard", href: "/teacher/dashboard" },
        { label: "Student Exam Join", href: "/student" },
        { label: "Create Assessment", href: "/teacher/create" },
        { label: "Course Materials", href: "/teacher/materials" },
      ],
    },
    {
      title: "Capabilities",
      links: [
        { label: "Syllabus Grounding", href: "#features" },
        { label: "2-Strike Proctoring", href: "#features" },
        { label: "Server-Side Clocks", href: "#features" },
        {
          label: "Live Proctoring Audit",
          href: "/student",
          pulse: true,
        },
      ],
    },
  ];

  // Contact info data
  const contactInfo = [
    {
      icon: <Mail size={18} className="text-slate-700 shrink-0" />,
      text: "kshreejay@gmail.com",
      href: "mailto:kshreejay@gmail.com",
    },
    {
      icon: <Phone size={18} className="text-slate-700 shrink-0" />,
      text: "+91 8879637223",
      href: "tel:+918879637223",
    },
    {
      icon: <MapPin size={18} className="text-slate-700 shrink-0" />,
      text: "Mumbai, India",
    },
  ];

  // Social media icons
  const socialLinks = [
    { icon: <Github size={18} />, label: "GitHub", href: "https://github.com" },
    { icon: <Twitter size={18} />, label: "Twitter", href: "https://twitter.com" },
    { icon: <Linkedin size={18} />, label: "LinkedIn", href: "https://linkedin.com" },
    { icon: <Globe size={18} />, label: "Status", href: "#" },
  ];

  return (
    <footer className="w-full text-slate-900 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-6 relative z-10">
        {/* Top High-Impact Call to Action Block */}
        <div className="rounded-3xl p-6 sm:p-10 bg-white border border-slate-200 shadow-sm max-w-5xl mx-auto text-center space-y-5 mb-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight max-w-3xl mx-auto">
            Transform your syllabus into secure, verified assessments today.
          </h2>

          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            Create AI-grounded question banks in minutes, run 2-strike proctored rooms, and deliver instant pedagogical feedback.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            {/* Faculty Portal Button with Auth Layer */}
            {user ? (
              <Link
                href="/teacher/dashboard"
                className="px-6 py-3.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-sm transition-all flex items-center gap-2 shadow-md hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
              >
                <span>Launch Faculty Portal</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </Link>
            ) : (
              <AuthDialog
                initialRole="faculty"
                open={facultyAuthOpen}
                onOpenChange={setFacultyAuthOpen}
                trigger={
                  <button
                    type="button"
                    className="px-6 py-3.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-sm transition-all flex items-center gap-2 shadow-md hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
                  >
                    <span>Launch Faculty Portal</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </button>
                }
              />
            )}

            {/* Student Exam Portal Button with Auth Layer */}
            {user ? (
              <Link
                href="/student"
                className="px-6 py-3.5 rounded-xl bg-white text-slate-900 font-semibold text-sm border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-xs hover:-translate-y-0.5 cursor-pointer"
              >
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                <span>Student Exam Portal</span>
              </Link>
            ) : (
              <AuthDialog
                initialRole="student"
                open={studentAuthOpen}
                onOpenChange={setStudentAuthOpen}
                trigger={
                  <button
                    type="button"
                    className="px-6 py-3.5 rounded-xl bg-white text-slate-900 font-semibold text-sm border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-xs hover:-translate-y-0.5 cursor-pointer"
                  >
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                    <span>Student Exam Portal</span>
                  </button>
                }
              />
            )}
          </div>
        </div>

        {/* 4-Column Footer Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-8 lg:gap-16 pb-8">
          {/* Brand section */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2">
              <Logo size="md" />
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Institutional AI assessment platform powered by Gemini Flash. Zero hallucination syllabus grounding and deterministic proctoring.
            </p>
          </div>

          {/* Footer link sections */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="text-slate-900 text-sm font-bold uppercase tracking-wider font-mono mb-6">
                {section.title}
              </h4>
              <ul className="space-y-3 text-xs sm:text-sm">
                {section.links.map((link) => (
                  <li key={link.label} className="relative">
                    <Link
                      href={link.href}
                      className="text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      {link.label}
                    </Link>
                    {link.pulse && (
                      <span className="absolute top-1.5 ml-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact section */}
          <div>
            <h4 className="text-slate-900 text-sm font-bold uppercase tracking-wider font-mono mb-6">
              Contact Information
            </h4>
            <ul className="space-y-4 text-xs sm:text-sm">
              {contactInfo.map((item, i) => (
                <li key={i} className="flex items-center space-x-3 text-slate-600">
                  {item.icon}
                  {item.href ? (
                    <a
                      href={item.href}
                      className="hover:text-slate-900 transition-colors"
                    >
                      {item.text}
                    </a>
                  ) : (
                    <span>{item.text}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider and Upper Shifted Info Bar (Social Links + Copyright) */}
        <div className="pt-6 pb-2 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-4 font-mono">
          {/* Social icons */}
          <div className="flex space-x-5 text-slate-600">
            {socialLinks.map(({ icon, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="hover:text-slate-900 transition-colors p-1"
              >
                {icon}
              </a>
            ))}
          </div>

          {/* Copyright */}
          <p className="text-center md:text-right">
            &copy; {new Date().getFullYear()} QuizSom Internal Assessment Platform. All rights reserved.
          </p>
        </div>
      </div>

      {/* Giant Interactive Text Hover Effect — Cleanly Positioned at Bottom */}
      <div className="lg:flex hidden h-[22rem] -mt-20 -mb-20 justify-center pointer-events-auto select-none">
        <TextHoverEffect text="QUIZSOM" className="z-10 w-full" />
      </div>
    </footer>
  );
}
