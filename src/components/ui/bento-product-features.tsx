"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Props for the BentoGridShowcase component.
 * Each prop represents a "slot" in the grid.
 */
export interface BentoGridShowcaseProps {
  /** Slot for the tall card (e.g., Integration) */
  integration: React.ReactNode;
  /** Slot for the top-middle card (e.g., Trackers) */
  trackers: React.ReactNode;
  /** Slot for the top-right card (e.g., Statistic) */
  statistic: React.ReactNode;
  /** Slot for the middle-middle card (e.g., Focus) */
  focus: React.ReactNode;
  /** Slot for the middle-right card (e.g., Productivity) */
  productivity: React.ReactNode;
  /** Slot for the wide bottom card (e.g., Shortcuts) */
  shortcuts: React.ReactNode;
  /** Optional class names for the grid container */
  className?: string;
}

/**
 * A responsive, animated bento grid layout component.
 * It arranges six content slots in the specific layout
 * seen in the "Product Features" UI.
 */
export const BentoGridShowcase = ({
  integration,
  trackers,
  statistic,
  focus,
  productivity,
  shortcuts,
  className,
}: BentoGridShowcaseProps) => {
  return (
    <div
      className={cn(
        // Core grid layout: 1 col on mobile, 3 on desktop
        "grid w-full grid-cols-1 gap-6 md:grid-cols-3",
        // Defines 3 explicit rows on medium screens and up
        "md:grid-rows-3",
        // Use minmax to ensure cards can grow but have a minimum height
        "auto-rows-[minmax(180px,auto)]",
        className
      )}
    >
      {/* Slot 1: Integration (Spans 3 rows) */}
      <div className="min-w-0 md:col-span-1 md:row-span-3">
        {integration}
      </div>

      {/* Slot 2: Trackers */}
      <div className="min-w-0 md:col-span-1 md:row-span-1">
        {trackers}
      </div>

      {/* Slot 3: Statistic */}
      <div className="min-w-0 md:col-span-1 md:row-span-1">
        {statistic}
      </div>

      {/* Slot 4: Focus */}
      <div className="min-w-0 md:col-span-1 md:row-span-1">
        {focus}
      </div>

      {/* Slot 5: Productivity */}
      <div className="min-w-0 md:col-span-1 md:row-span-1">
        {productivity}
      </div>

      {/* Slot 6: Shortcuts (Spans 2 cols) */}
      <div className="min-w-0 md:col-span-2 md:row-span-1">
        {shortcuts}
      </div>
    </div>
  );
};

export default BentoGridShowcase;
