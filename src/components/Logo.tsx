'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  showBadge?: boolean;
  className?: string;
  href?: string;
}

export default function Logo({
  size = 'md',
  showText = true,
  className = '',
  href = '/',
}: LogoProps) {
  const sizeMap = {
    sm: { img: 26, text: 'text-base font-extrabold -ml-0.5' },
    md: { img: 34, text: 'text-xl font-extrabold -ml-1' },
    lg: { img: 48, text: 'text-2xl font-extrabold -ml-1.5' },
  };

  const current = sizeMap[size];

  const content = (
    <div className={`flex items-center gap-0.5 group cursor-pointer select-none ${className}`}>
      <div className="relative shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
        <Image
          src="/logo.png"
          alt="QuizSom Logo"
          width={current.img * 3}
          height={current.img * 3}
          style={{
            width: `${current.img}px`,
            height: `${current.img}px`,
            imageRendering: 'auto',
          }}
          className="object-contain"
          unoptimized
          priority
        />
      </div>
      {showText && (
        <span className={`tracking-tight text-slate-950 leading-none ${current.text}`}>
          Quiz<span className="text-blue-600">Som</span>
        </span>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="inline-flex items-center">{content}</Link>;
  }

  return content;
}
