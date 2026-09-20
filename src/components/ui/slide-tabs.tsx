'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export interface TabItem {
  label: string;
  href: string;
}

interface SlideTabsProps {
  tabs?: TabItem[];
  className?: string;
}

const DEFAULT_TABS: TabItem[] = [
  { label: 'Interactive Preview', href: '/#preview' },
  { label: 'Features', href: '/#features' },
  { label: 'Integrity Safeguards', href: '/#safeguards' },
  { label: 'Grounded AI', href: '/#grounding' },
];

export const SlideTabs: React.FC<SlideTabsProps> = ({
  tabs = DEFAULT_TABS,
  className = '',
}) => {
  const [position, setPosition] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });

  const [selected, setSelected] = useState<number | null>(null);
  const tabsRef = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (selected !== null && tabsRef.current[selected]) {
      const selectedTab = tabsRef.current[selected];
      if (selectedTab) {
        const { width } = selectedTab.getBoundingClientRect();
        setPosition({
          left: selectedTab.offsetLeft,
          width,
          opacity: 1,
        });
      }
    }
  }, [selected]);

  return (
    <ul
      onMouseLeave={() => {
        if (selected !== null && tabsRef.current[selected]) {
          const selectedTab = tabsRef.current[selected];
          if (selectedTab) {
            const { width } = selectedTab.getBoundingClientRect();
            setPosition({
              left: selectedTab.offsetLeft,
              width,
              opacity: 1,
            });
            return;
          }
        }
        setPosition((prev) => ({
          ...prev,
          opacity: 0,
        }));
      }}
      className={`relative flex items-center gap-1 rounded-full border border-slate-200/90 !bg-white/95 p-1 shadow-sm backdrop-blur-md ${className}`}
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#E2E8F0' }}
    >
      {tabs.map((tab, i) => (
        <Tab
          key={tab.label}
          ref={(el) => {
            tabsRef.current[i] = el;
          }}
          href={tab.href}
          setPosition={setPosition}
          onClick={() => setSelected(i)}
        >
          {tab.label}
        </Tab>
      ))}

      <AnimatePresence>
        {position.opacity > 0 && position.width > 0 && (
          <Cursor position={position} />
        )}
      </AnimatePresence>
    </ul>
  );
};

interface TabProps {
  children: React.ReactNode;
  href: string;
  setPosition: React.Dispatch<
    React.SetStateAction<{ left: number; width: number; opacity: number }>
  >;
  onClick: () => void;
}

const Tab = React.forwardRef<HTMLLIElement, TabProps>(
  ({ children, href, setPosition, onClick }, ref) => {
    return (
      <li
        ref={ref}
        onClick={onClick}
        onMouseEnter={(e) => {
          const target = e.currentTarget;
          if (!target) return;
          const { width } = target.getBoundingClientRect();
          setPosition({
            left: target.offsetLeft,
            width,
            opacity: 1,
          });
        }}
        className="relative z-10 block cursor-pointer transition-colors"
      >
        <Link
          href={href}
          className="block px-3.5 py-1.5 text-xs font-bold !text-[#0F172A] hover:!text-black transition-colors whitespace-nowrap"
          style={{ color: '#0F172A' }}
        >
          {children}
        </Link>
      </li>
    );
  }
);

Tab.displayName = 'Tab';

const Cursor = ({
  position,
}: {
  position: { left: number; width: number; opacity: number };
}) => {
  return (
    <motion.li
      initial={{
        opacity: 0,
        left: position.left,
        width: position.width,
      }}
      animate={{
        opacity: 1,
        left: position.left,
        width: position.width,
      }}
      exit={{
        opacity: 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
      }}
      className="absolute z-0 h-7 rounded-full !bg-[#F1F5F9] shadow-xs pointer-events-none"
      style={{ backgroundColor: '#F1F5F9', border: '1px solid #000000' }}
    />
  );
};

export default SlideTabs;
