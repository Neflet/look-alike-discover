"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "./ProductCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SearchHit } from "../../lib/search-image";

interface ProductCarousel3DProps {
  products: (SearchHit & { image?: string })[];
  onProductClick?: (product: SearchHit) => void;
}

export function ProductCarousel3D({ products, onProductClick }: ProductCarousel3DProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance (in pixels) to trigger navigation
  const minSwipeDistance = 50;

  if (products.length === 0) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <p className="text-muted-foreground">No products to display</p>
      </div>
    );
  }

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prevIndex) => {
      const newIndex = prevIndex + newDirection;
      if (newIndex < 0) return products.length - 1;
      if (newIndex >= products.length) return 0;
      return newIndex;
    });
  };

  // Touch event handlers for mobile swipe
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

    if (isLeftSwipe) {
      paginate(1); // Swipe left = next item
    }
    if (isRightSwipe) {
      paginate(-1); // Swipe right = previous item
    }
  };

  const getVisibleProducts = () => {
    const visible = [];
    for (let i = -1; i <= 1; i++) {
      let index = currentIndex + i;
      if (index < 0) index = products.length + index;
      if (index >= products.length) index = index - products.length;
      visible.push({ ...products[index], position: i });
    }
    return visible;
  };

  const visibleProducts = getVisibleProducts();

  return (
    <div 
      ref={carouselRef}
      className="relative w-full flex flex-col items-center overflow-visible"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* 3D Carousel Container */}
      <div className="relative w-full flex items-center justify-center overflow-visible" style={{ perspective: "2000px", minHeight: "560px" }}>
        <div className="relative w-full flex items-center justify-center overflow-visible">
          <AnimatePresence initial={false} custom={direction}>
            {visibleProducts.map((product) => {
              const position = product.position;
              const isCenter = position === 0;
              
              return (
                <motion.div
                  key={`${product.id}-${position}`}
                  className="absolute"
                  initial={{
                    rotateY: direction > 0 ? 60 : -60,
                    x: direction > 0 ? 300 : -300,
                    z: -400,
                    opacity: 0,
                  }}
                  animate={{
                    rotateY: position * 45,
                    x: position * 250,
                    z: isCenter ? 0 : -300,
                    opacity: 1,
                    scale: isCenter ? 1 : 0.75,
                  }}
                  exit={{
                    rotateY: direction > 0 ? -60 : 60,
                    x: direction > 0 ? -300 : 300,
                    z: -400,
                    opacity: 0,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                  style={{
                    transformStyle: "preserve-3d",
                    zIndex: isCenter ? 10 : 1,
                  }}
                >
                  <ProductCard
                    product={product}
                    onProductClick={onProductClick}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation Buttons */}
      {products.length > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="absolute left-8 z-20 w-12 h-12 rounded-full bg-background shadow-lg hover:bg-muted"
            onClick={() => paginate(-1)}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute right-8 z-20 w-12 h-12 rounded-full bg-background shadow-lg hover:bg-muted"
            onClick={() => paginate(1)}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </>
      )}

      {/* Pagination BELOW the cards */}
      {products.length > 1 && (
        <div className="mt-6 w-full flex justify-center gap-2">
          {products.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                const diff = index - currentIndex;
                setDirection(diff > 0 ? 1 : -1);
                setCurrentIndex(index);
              }}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex 
                  ? "bg-black dark:bg-white w-8 opacity-100" 
                  : "bg-black dark:bg-white w-2 opacity-40"
              }`}
              aria-label={`Go to product ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}



