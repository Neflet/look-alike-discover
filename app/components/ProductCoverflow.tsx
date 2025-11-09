"use client";

import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SaveButton } from './SaveButton';
import type { SearchHit } from '../../lib/search-image';

type UISearchHit = SearchHit & {
  score: number;
};

interface ProductCoverflowProps {
  products: UISearchHit[];
  onProductClick: (product: UISearchHit) => void;
}

export function ProductCoverflow({ products, onProductClick }: ProductCoverflowProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: 'center',
      skipSnaps: false,
      dragFree: false,
    },
    []
  );

  const scrollTo = useCallback(
    (index: number) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi]
  );

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on('select', onSelect);
    onSelect(); // Set initial index

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        scrollPrev();
      } else if (e.key === 'ArrowRight') {
        scrollNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollPrev, scrollNext]);

  if (products.length === 0) return null;

  const getSlideStyle = (index: number) => {
    const n = products.length;
    const diff = ((index - selectedIndex + n) % n);
    
    // Center slide
    if (diff === 0) {
      return {
        zIndex: 3,
        scale: 1,
        x: 0,
        y: 0,
        rotateY: 0,
        opacity: 1,
        filter: 'blur(0px)',
      };
    }
    
    // Left slide (previous)
    if (diff === n - 1) {
      return {
        zIndex: 2,
        scale: 0.9,
        x: -14,
        y: 0,
        rotateY: 18,
        opacity: 0.85,
        filter: 'blur(0.5px)',
      };
    }
    
    // Right slide (next)
    if (diff === 1) {
      return {
        zIndex: 2,
        scale: 0.9,
        x: 14,
        y: 0,
        rotateY: -18,
        opacity: 0.85,
        filter: 'blur(0.5px)',
      };
    }
    
    // Far slides
    return {
      zIndex: 1,
      scale: 0.8,
      x: diff < n / 2 ? -20 : 20,
      y: 0,
      rotateY: diff < n / 2 ? 25 : -25,
      opacity: 0.55,
      filter: 'blur(1px)',
    };
  };

  return (
    <div className="relative w-full" style={{ perspective: '1200px' }}>
      {/* Coverflow Container */}
      <div className="relative overflow-hidden" ref={emblaRef}>
        <div className="flex" style={{ backfaceVisibility: 'hidden' }}>
          {products.map((product, index) => {
            const style = getSlideStyle(index);
            const isActive = index === selectedIndex;
            
            return (
              <div
                key={product.id}
                className="flex-[0_0_100%] min-w-0 px-4"
                onClick={() => !isActive && scrollTo(index)}
                style={{ cursor: isActive ? 'default' : 'pointer' }}
              >
                <motion.div
                  className="relative aspect-[3/4] bg-muted/20 rounded-lg overflow-hidden border border-border"
                  style={{
                    transformStyle: 'preserve-3d',
                    willChange: 'transform',
                  }}
                  animate={{
                    scale: style.scale,
                    x: `${style.x}%`,
                    y: style.y,
                    rotateY: style.rotateY,
                    opacity: style.opacity,
                    filter: style.filter,
                    zIndex: style.zIndex,
                  }}
                  transition={{
                    duration: 0.3,
                    ease: 'easeOut',
                  }}
                >
                  <div className="absolute inset-0">
                    <img
                      src={product.main_image_url || '/placeholder.jpg'}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/0 to-background/0" />
                    
                    {/* Save Button */}
                    <div className="absolute top-4 right-4 z-10">
                      <SaveButton productId={product.id} productTitle={product.title} />
                    </div>

                    {/* Product Info Overlay - Only show on active card */}
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-0 left-0 right-0 p-6 bg-background/95 backdrop-blur-sm"
                        style={{ pointerEvents: 'none', zIndex: 20 }}
                      >
                        <h3 className="text-lg font-bold mb-2 line-clamp-2" title={product.title}>
                          {product.title}
                        </h3>
                        <div className="flex items-center justify-between">
                          <div style={{ pointerEvents: 'none' }}>
                            {product.brand && (
                              <p className="text-sm opacity-60 mb-1">{product.brand}</p>
                            )}
                            <p className="text-xl font-bold">
                              {product.price ? `$${product.price.toFixed(2)}` : 'Price N/A'}
                            </p>
                          </div>
                          {product.url ? (
                            <a
                              href={product.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                e.stopPropagation();
                                onProductClick(product);
                              }}
                              className="px-6 py-2 text-sm bg-foreground text-background hover:bg-foreground/80 transition-colors rounded-md inline-flex items-center justify-center"
                              style={{ pointerEvents: 'auto', zIndex: 30 }}
                            >
                              View Product
                            </a>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onProductClick(product);
                              }}
                              className="px-6 py-2 text-sm bg-foreground text-background hover:bg-foreground/80 transition-colors rounded-md"
                              style={{ pointerEvents: 'auto', zIndex: 30 }}
                            >
                              View Product
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Arrows */}
      {products.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-background/80 hover:bg-background rounded-full border border-border transition-colors"
            aria-label="Previous product"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-background/80 hover:bg-background rounded-full border border-border transition-colors"
            aria-label="Next product"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {products.length > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {products.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === selectedIndex
                  ? 'bg-foreground w-8'
                  : 'bg-border hover:bg-foreground/50'
              }`}
              aria-label={`Go to product ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Product Counter */}
      <div className="text-center mt-4 text-xs opacity-60">
        {selectedIndex + 1} / {products.length}
      </div>
    </div>
  );
}

