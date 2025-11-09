"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  Heart, 
  ExternalLink, 
  ArrowLeftRight, 
  Search, 
  LogIn,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { SaveButton } from './SaveButton';
import { UserMenu } from './UserMenu';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { SearchHit } from '../../lib/search-image';

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
  const [active, setActive] = useState(0);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const { user } = useAuth();
  
  // Get image URL for an item
  const getImageUrl = (item: ResultItem): string => {
    return item.main_image_url || item.image || '/placeholder.jpg';
  };

  // Calculate rotation and scale for main card animation
  const rotate = active % 2 === 0 ? 0 : 0;
  const scale = 1;

  if (initialItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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

  const items = initialItems;
  const currentItem = items[active];

  return (
    <div className="min-h-screen bg-neutral-50">
      {showHeader && <Header />}
      
      <main className="mx-auto max-w-[120rem] px-4 py-8 lg:px-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Left - Main Product Display */}
          <section className="col-span-12 xl:col-span-9">
            {/* User Image Preview */}
            {initialUserImage && (
              <div className="mb-6 flex items-center gap-4">
                <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-neutral-200">
                  <Image 
                    src={initialUserImage} 
                    alt="Your image" 
                    fill 
                    className="object-cover" 
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-neutral-600">Searching for similar items...</p>
                </div>
                {onNewSearch && (
                  <Button onClick={onNewSearch} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-2" />
                    New Search
                  </Button>
                )}
              </div>
            )}

            {/* Main Product Card */}
            <motion.div 
              style={{ rotate, scale }} 
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            >
              <Card className="overflow-hidden border-neutral-200 shadow-md">
                <div className="relative aspect-[16/10] w-full bg-neutral-100">
                  <Image 
                    src={getImageUrl(currentItem)} 
                    alt={currentItem.title} 
                    fill 
                    className="object-cover" 
                  />
                  
                  {/* Save Button */}
                  <div className="absolute right-4 top-4 z-10">
                    <SaveButton 
                      productId={currentItem.id} 
                      productTitle={currentItem.title} 
                    />
                  </div>
                </div>
                
                <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:p-5">
                  <div>
                    {currentItem.brand && (
                      <div className="text-sm text-neutral-500">{currentItem.brand}</div>
                    )}
                    <h3 className="text-lg font-semibold leading-tight md:text-xl">
                      {currentItem.title}
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {currentItem.price !== undefined && (
                      <Badge variant="secondary" className="text-base font-semibold">
                        ${currentItem.price.toFixed(2)}
                      </Badge>
                    )}
                    {currentItem.url ? (
                      <a 
                        href={currentItem.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <Button className="gap-2">
                          View Product <ExternalLink className="h-4 w-4"/>
                        </Button>
                      </a>
                    ) : (
                      <Button className="gap-2" disabled>
                        View Product <ExternalLink className="h-4 w-4"/>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Thumbnail Strip */}
            <div className="mt-6 flex items-center gap-4 overflow-x-auto pb-2">
              {items.map((it, i) => (
                <motion.button
                  key={it.id}
                  onClick={() => setActive(i)}
                  className={cn(
                    "relative h-28 min-w-[8.5rem] overflow-hidden rounded-xl border",
                    i === active 
                      ? "ring-2 ring-neutral-900 border-neutral-900" 
                      : "opacity-80 hover:opacity-100 border-neutral-200"
                  )}
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  aria-label={`Show ${it.title}`}
                >
                  <Image 
                    src={getImageUrl(it)} 
                    alt={it.title} 
                    fill 
                    className="object-cover" 
                  />
                </motion.button>
              ))}
            </div>
          </section>

          {/* Right - Actions Sidebar */}
          <aside className="col-span-12 xl:col-span-3">
            <Card className="sticky top-4 border-neutral-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full gap-2" variant="outline">
                  <ArrowLeftRight className="h-4 w-4"/> Compare similar
                </Button>
                
                <Button className="w-full gap-2" variant="ghost">
                  <Heart className="h-4 w-4"/> Go to Closet
                </Button>
                
                <p className="text-xs text-neutral-500">
                  Tip: use Refine search on the left to crop to the exact garment, then re-run.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
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

