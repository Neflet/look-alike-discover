"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Crop, FilterX } from 'lucide-react';

interface CantFindItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefineCrop: () => void;
  onClearFilters: () => void;
}

export function CantFindItemModal({
  isOpen,
  onClose,
  onRefineCrop,
  onClearFilters,
}: CantFindItemModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Let's improve your search</DialogTitle>
          <DialogDescription className="pt-2">
            Sometimes the AI struggles with busy backgrounds or angles. Try one of these options:
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => {
              onRefineCrop();
              onClose();
            }}
            className="w-full justify-start gap-2"
          >
            <Crop className="w-4 h-4" />
            Refine crop
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onClearFilters();
              onClose();
            }}
            className="w-full justify-start gap-2"
          >
            <FilterX className="w-4 h-4" />
            Clear all filters and search again
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

