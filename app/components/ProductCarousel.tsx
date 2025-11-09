"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SaveButton } from './SaveButton';
import type { SearchHit } from '../../lib/search-image';

type UISearchHit = SearchHit & {
  score: number;
};

interface ProductCarouselProps {
  products: UISearchHit[];
  onProductClick: (product: UISearchHit) => void;
}

export function ProductCarousel({ products, onProductClick }: ProductCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance (in pixels)
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < products.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : products.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < products.length - 1 ? prev + 1 : 0));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, products.length]);

  if (products.length === 0) return null;

  const currentProduct = products[currentIndex];

  return (
    <div className="relative w-full">
      {/* Carousel Container */}
      <div
        ref={carouselRef}
        className="relative overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Product Display */}
        <div className="relative aspect-[3/4] bg-muted/20 rounded-lg overflow-hidden border border-border">
          <div className="absolute inset-0">
            <img
              src={currentProduct.main_image_url || '/placeholder.jpg'}
              alt={currentProduct.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/0 to-background/0" />
            
            {/* Save Button */}
            <div className="absolute top-4 right-4 z-10">
              <SaveButton productId={currentProduct.id} productTitle={currentProduct.title} />
            </div>

            {/* Product Info Overlay */}
            <div 
              className="absolute bottom-0 left-0 right-0 p-6 bg-background/95 backdrop-blur-sm"
              style={{ pointerEvents: 'none', zIndex: 20 }}
            >
              <h3 className="text-lg font-bold mb-2 line-clamp-2" title={currentProduct.title}>
                {currentProduct.title}
              </h3>
              <div className="flex items-center justify-between">
                <div style={{ pointerEvents: 'none' }}>
                  {currentProduct.brand && (
                    <p className="text-sm opacity-60 mb-1">{currentProduct.brand}</p>
                  )}
                  <p className="text-xl font-bold">
                    {currentProduct.price ? `$${currentProduct.price.toFixed(2)}` : 'Price N/A'}
                  </p>
                </div>
                {currentProduct.url ? (
                  <a
                    href={currentProduct.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation(); // Don't trigger swipe
                      onProductClick(currentProduct);
                    }}
                    className="px-6 py-2 text-sm bg-foreground text-background hover:bg-foreground/80 transition-colors rounded-md inline-flex items-center justify-center"
                    style={{ pointerEvents: 'auto', zIndex: 30 }}
                  >
                    View Product
                  </a>
                ) : (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onProductClick(currentProduct);
                    }}
                    className="px-6 py-2 text-sm"
                    style={{ pointerEvents: 'auto', zIndex: 30 }}
                  >
                    View Product
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        {products.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-background/80 hover:bg-background rounded-full border border-border transition-colors"
              aria-label="Previous product"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={goToNext}
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
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
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
          {currentIndex + 1} / {products.length}
        </div>
      </div>
    </div>
  );
}

