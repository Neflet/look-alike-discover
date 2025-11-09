"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import Image from "next/image";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { 
  Heart, 
  LogIn, 
  Search, 
  Upload, 
  Wand2, 
  ArrowLeftRight, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { SaveButton } from './SaveButton';
import { UserMenu } from './UserMenu';
import { useAuth } from '@/hooks/useAuth';
import { cn } from "@/lib/utils";
import type { SearchHit } from '../../lib/search-image';

// Optional crop overlay (install with: npm i react-rnd)
let Rnd: any = null;
try { 
  Rnd = require("react-rnd").Rnd;
} catch {}

export type ResultItem = SearchHit & {
  score?: number;
  image?: string; // fallback for main_image_url
};

interface ResultsPageProps {
  initialItems: ResultItem[];
  initialUserImage?: string | null;
  onRefineConfirm?: (params: { crop?: any; weights?: any; userImage?: string }) => void;
  onNewSearch?: () => void;
  showHeader?: boolean; // Optional header (default: true)
}

export default function ResultsPage({ 
  initialItems, 
  initialUserImage,
  onRefineConfirm,
  onNewSearch,
  showHeader = true
}: ResultsPageProps) {
  const [items] = useState<ResultItem[]>(initialItems);
  const [active, setActive] = useState(0);
  const [userImage, setUserImage] = useState<string | null>(initialUserImage ?? null);
  const [refineOpen, setRefineOpen] = useState(false);

  // ——— Refine state ———
  const [crop, setCrop] = useState({ x: 80, y: 80, w: 240, h: 240 });
  const [colorWeight, setColorWeight] = useState(50);
  const [textureWeight, setTextureWeight] = useState(50);
  const [silhouetteWeight, setSilhouetteWeight] = useState(50);

  const handleRefineConfirm = () => {
    if (onRefineConfirm) {
      onRefineConfirm({
        crop,
        weights: {
          color: colorWeight,
          texture: textureWeight,
          silhouette: silhouetteWeight
        },
        userImage: userImage || undefined
      });
    }
    setRefineOpen(false);
  };

  const onUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setUserImage(String(e.target?.result || null));
    reader.readAsDataURL(file);
  };

  // Get image URL for an item
  const getImageUrl = (item: ResultItem): string => {
    return item.main_image_url || item.image || '/placeholder.jpg';
  };

  if (initialItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <p className="text-lg text-neutral-500">No results found</p>
          {onNewSearch && (
            <Button onClick={onNewSearch} variant="outline">
              Start New Search
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white text-neutral-900">
      {showHeader && <Header />}

      <main className="mx-auto grid max-w-[120rem] grid-cols-12 gap-6 px-4 pb-24 pt-6 lg:px-8">
        {/* Left dock – user image */}
        <aside className="col-span-12 md:col-span-3 xl:col-span-2">
          <Card className="sticky top-4 border-neutral-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Your image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative aspect-square overflow-hidden rounded-xl border bg-neutral-50">
                {userImage ? (
                  <Image src={userImage} alt="Uploaded" fill className="object-cover" />
                ) : (
                  <div className="grid h-full place-content-center text-sm text-neutral-500">No image</div>
                )}
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50">
                <Upload className="h-4 w-4" />
                <span>Upload new</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => { 
                    const f = e.target.files?.[0]; 
                    if (f) onUpload(f); 
                  }} 
                />
              </label>

              <Sheet open={refineOpen} onOpenChange={setRefineOpen}>
                <SheetTrigger asChild>
                  <Button className="w-full gap-2">
                    <Wand2 className="h-4 w-4"/> Refine search
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-xl">
                  <SheetHeader>
                    <SheetTitle>Refine search</SheetTitle>
                  </SheetHeader>

                  <div className="mt-4 space-y-6">
                    <div className="space-y-2">
                      <Label className="text-sm">Crop focus</Label>
                      <div className="relative aspect-[4/5] overflow-hidden rounded-xl border bg-neutral-50">
                        {userImage && (
                          <div className="absolute inset-0">
                            <Image src={userImage} alt="crop" fill className="object-cover" />
                            {Rnd ? (
                              <Rnd
                                bounds="parent"
                                default={{ x: crop.x, y: crop.y, width: crop.w, height: crop.h }}
                                onDragStop={(e: any, d: any) => setCrop((c) => ({ ...c, x: d.x, y: d.y }))}
                                onResizeStop={(e: any, _dir: any, ref: any, _delta: any, pos: any) => setCrop({ x: pos.x, y: pos.y, w: ref.offsetWidth, h: ref.offsetHeight })}
                                style={{ border: "2px solid white", boxShadow: "0 0 0 9999px rgba(0,0,0,.35) inset" }}
                                className="rounded-lg"
                              />
                            ) : (
                              <div className="absolute inset-0 grid place-content-center text-xs text-white/80">
                                Install <code>react-rnd</code> to enable drag/resize
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <FacetSlider label="Color weight" value={colorWeight} onChange={setColorWeight} />
                    <FacetSlider label="Texture weight" value={textureWeight} onChange={setTextureWeight} />
                    <FacetSlider label="Silhouette weight" value={silhouetteWeight} onChange={setSilhouetteWeight} />

                    <div className="flex gap-3 pt-2">
                      <Button className="flex-1" onClick={handleRefineConfirm}>Apply</Button>
                      <Button variant="outline" className="flex-1" onClick={() => setRefineOpen(false)}>Cancel</Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              {onNewSearch && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={onNewSearch}
                >
                  New Search
                </Button>
              )}
            </CardContent>
          </Card>
        </aside>

        {/* Center – ROTATING CLOSET */}
        <section className="col-span-12 md:col-span-9 xl:col-span-10">
          <RotatingCloset 
            items={items} 
            active={active} 
            setActive={setActive}
            getImageUrl={getImageUrl}
          />
        </section>
      </main>
    </div>
  );
}

// 3D Rotating Closet component
function RotatingCloset({ 
  items, 
  active, 
  setActive, 
  getImageUrl 
}: { 
  items: ResultItem[]; 
  active: number; 
  setActive: (i: number) => void;
  getImageUrl: (item: ResultItem) => string;
}) {
  // === Tunables ===
  const THETA = 24;          // degrees between cards on the wheel
  const RADIUS = 560;        // distance from camera
  const CARD_W = "clamp(240px, 36vw, 380px)";
  const CARD_H = "clamp(360px, 56vh, 560px)";
  const DEG_PER_PX = 0.15;   // drag sensitivity

  // angle of the wheel; negative angles move to next item to the right
  const angle = useMotionValue<number>(-active * THETA);

  // when active changes from buttons/dots, animate the angle to the correct slot
  useEffect(() => {
    angle.stop();
    angle.set(-active * THETA);
  }, [active, angle, THETA]);

  const wrap = (n: number, len: number) => (n % len + len) % len;

  const handleDragEnd = (_: any, info: { offset: { x: number } }) => {
    const deltaDeg = info.offset.x * DEG_PER_PX;
    const current = angle.get() + deltaDeg; // where we ended
    const snappedIndex = wrap(Math.round(-current / THETA), items.length);
    setActive(snappedIndex);
    // snap angle exactly to slot
    angle.set(-snappedIndex * THETA);
  };

  return (
    <div className="relative mx-auto w-full max-w-[1400px]">
      {/* controls */}
      <div className="mb-4 flex items-center justify-center gap-2">
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-10 w-10 rounded-full border" 
          onClick={() => setActive(wrap(active - 1, items.length))}
        >
          <ChevronLeft className="h-5 w-5"/>
        </Button>
        <div className="text-xs text-neutral-500 tabular-nums">
          {active + 1} / {items.length}
        </div>
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-10 w-10 rounded-full border" 
          onClick={() => setActive(wrap(active + 1, items.length))}
        >
          <ChevronRight className="h-5 w-5"/>
        </Button>
      </div>

      {/* 3D stage – perfectly centered */}
      <div 
        className="relative h-[74vh] min-h-[560px] w-full overflow-visible" 
        style={{ perspective: 2000 }}
      >
        <motion.div
          className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 [transform-style:preserve-3d]"
          style={{ rotateY: angle }}
        >
          {items.map((item, i) => {
            const rot = i * THETA; // each card's base angle around the wheel

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
                <Card className="h-full overflow-hidden border border-neutral-200 bg-white shadow-2xl">
                  <div className="relative h-[82%] w-full bg-neutral-100">
                    <Image 
                      src={getImageUrl(item)} 
                      alt={item.title} 
                      fill 
                      className="object-cover" 
                    />
                    
                    {/* Save Button */}
                    <div className="absolute right-3 top-3 z-10">
                      <SaveButton 
                        productId={item.id} 
                        productTitle={item.title} 
                      />
                    </div>
                  </div>
                  
                  <CardContent className="flex h-[18%] items-center justify-between gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      {item.brand && (
                        <div className="truncate text-xs text-neutral-500">{item.brand}</div>
                      )}
                      <div className="truncate text-sm font-semibold">{item.title}</div>
                      {item.price !== undefined && (
                        <div className="text-xs font-semibold text-neutral-700 mt-1">
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
                          View <ExternalLink className="h-3 w-3"/>
                        </Button>
                      </a>
                    ) : (
                      <Button size="sm" className="gap-1" disabled>
                        View <ExternalLink className="h-3 w-3"/>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </motion.div>

        {/* Continuous swipe layer */}
        <motion.div
          className="absolute inset-0 z-40 cursor-grab touch-none active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDrag={(_, info) => angle.set(-active * THETA + info.offset.x * DEG_PER_PX)}
          onDragEnd={handleDragEnd}
        />
      </div>

      {/* dots */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {items.map((_, i) => (
          <button 
            key={i} 
            onClick={() => setActive(i)} 
            className={cn(
              "h-1.5 w-1.5 rounded-full bg-neutral-300 transition-all", 
              i === active ? "w-6 bg-neutral-900" : "w-1.5"
            )} 
            aria-label={`Go to ${i+1}`} 
          />
        ))}
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-[120rem] items-center justify-between gap-3 px-4 py-3 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-content-center rounded-xl border bg-neutral-50 text-sm font-bold">
            S
          </div>
          <span className="hidden text-lg font-semibold sm:inline">SwagAI</span>
        </div>
        
        <div className="hidden flex-1 items-center gap-2 md:flex">
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input 
              placeholder="Search brands, colors, items…" 
              className="pl-9" 
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

function FacetSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <span className="text-xs tabular-nums text-neutral-500">{value}%</span>
      </div>
      <Slider value={[value]} onValueChange={(v) => onChange(v[0])} min={0} max={100} step={1} />
    </div>
  );
}
