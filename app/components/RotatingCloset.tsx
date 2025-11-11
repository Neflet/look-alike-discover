"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// === Tunable Constants ===
const THETA = 24; // degrees between cards on the wheel
const RADIUS = 560; // distance from camera (translateZ)
const DEG_PER_PX = 0.15; // drag sensitivity
const CARD_W = "clamp(240px, 36vw, 380px)";
const CARD_H = "clamp(360px, 56vh, 560px)";

export type ClosetItem = {
  id: string;
  title: string;
  brand?: string;
  price?: number;
  image: string; // absolute URL or data URL
  url?: string; // affiliate/product URL
};

type Props = {
  items: ClosetItem[];
  initialIndex?: number;
  className?: string;
  onIndexChange?: (index: number) => void;
};

export default function RotatingCloset({
  items,
  initialIndex = 0,
  className,
  onIndexChange,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const angle = useMotionValue<number>(-activeIndex * THETA);
  const springAngle = useSpring(angle, {
    stiffness: 100,
    damping: 20,
    mass: 0.5,
  });

  // Sync angle when activeIndex changes (from buttons/dots/keyboard)
  useEffect(() => {
    angle.set(-activeIndex * THETA);
  }, [activeIndex, angle]);

  // Notify parent of index changes
  useEffect(() => {
    onIndexChange?.(activeIndex);
  }, [activeIndex, onIndexChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, items.length]);

  const wrap = (n: number, len: number) => ((n % len) + len) % len;

  const goToPrevious = () => {
    setActiveIndex((prev) => wrap(prev - 1, items.length));
  };

  const goToNext = () => {
    setActiveIndex((prev) => wrap(prev + 1, items.length));
  };

  const goToIndex = (index: number) => {
    if (index >= 0 && index < items.length) {
      setActiveIndex(index);
    }
  };

  const handleDragEnd = (_: any, info: { offset: { x: number } }) => {
    const deltaDeg = info.offset.x * DEG_PER_PX;
    const currentAngle = angle.get() + deltaDeg;
    const snappedIndex = wrap(
      Math.round(-currentAngle / THETA),
      items.length
    );
    setActiveIndex(snappedIndex);
    angle.set(-snappedIndex * THETA);
  };

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-[80vh] min-h-[560px]">
        <p className="text-muted-foreground">No items to display</p>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full", className)}>
      {/* Controls - Arrows */}
      <div className="mb-4 flex items-center justify-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-full border"
          onClick={goToPrevious}
          aria-label="Previous item"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-xs text-muted-foreground tabular-nums">
          {activeIndex + 1} / {items.length}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-full border"
          onClick={goToNext}
          aria-label="Next item"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* 3D Stage - Centered */}
      <div
        className="relative h-[80vh] min-h-[560px] w-full overflow-visible"
        style={{ perspective: 2000 }}
      >
        <motion.div
          className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 [transform-style:preserve-3d]"
          style={{ rotateY: springAngle }}
        >
          {items.map((item, i) => {
            const rot = i * THETA; // each card's base angle around the wheel
            const diff = wrap(i - activeIndex, items.length);
            const isCenter = diff === 0;
            const isNeighbor = diff === 1 || diff === items.length - 1;

            // Calculate scale and opacity based on position
            let scale = 0.85;
            let opacity = 0.6;
            if (isCenter) {
              scale = 1.0;
              opacity = 1.0;
            } else if (isNeighbor) {
              scale = 0.9;
              opacity = 0.75;
            }

            return (
              <div
                key={item.id}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible [transform-style:preserve-3d] will-change-transform"
                style={{
                  width: CARD_W,
                  height: CARD_H,
                  transform: `rotateY(${rot}deg) translateZ(${RADIUS}px)`,
                }}
              >
                <Card
                  className="h-full overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
                  style={{
                    transform: `scale(${scale})`,
                    opacity,
                    transition: "opacity 0.3s ease, transform 0.3s ease",
                  }}
                >
                  {/* Image Section - 82% height */}
                  <div className="relative h-[82%] w-full overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 240px, (max-width: 1200px) 36vw, 380px"
                    />
                  </div>

                  {/* Reflection - 10% height */}
                  <div className="relative h-[10%] w-full -translate-y-1">
                    <div
                      className="relative h-full w-full"
                      style={{ transform: "scaleY(-1)", opacity: 0.25 }}
                    >
                      <Image
                        src={item.image}
                        alt="reflection"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 240px, (max-width: 1200px) 36vw, 380px"
                      />
                    </div>
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to bottom, rgba(255,255,255,0.2), rgba(255,255,255,1))",
                      }}
                    />
                  </div>

                  {/* Card Content - 8% height */}
                  <CardContent className="flex h-[8%] items-center justify-between gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      {item.brand && (
                        <div className="truncate text-xs text-muted-foreground">
                          {item.brand}
                        </div>
                      )}
                      <div className="truncate text-sm font-semibold">
                        {item.title}
                      </div>
                      {item.price !== undefined && (
                        <div className="text-xs font-semibold text-foreground/80 mt-1">
                          ${item.price.toFixed(2)}
                        </div>
                      )}
                    </div>

                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button size="sm" className="gap-1">
                          View <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                    ) : (
                      <Button size="sm" className="gap-1" disabled>
                        View <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </motion.div>

        {/* Continuous Drag Overlay */}
        <motion.div
          className="absolute inset-0 z-40 cursor-grab touch-none active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDrag={(_, info) => {
            angle.set(-activeIndex * THETA + info.offset.x * DEG_PER_PX);
          }}
          onDragEnd={handleDragEnd}
          style={{ touchAction: "none" }}
        />
      </div>

      {/* Dots Indicator */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => goToIndex(i)}
            className={cn(
              "h-1.5 rounded-full bg-muted transition-all",
              i === activeIndex ? "w-6 bg-foreground" : "w-1.5 hover:bg-foreground/50"
            )}
            aria-label={`Go to item ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

