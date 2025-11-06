"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { User, LogOut, Heart, X } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { ClosetView } from './ClosetView';

export function UserMenu() {
  const { user, signOut, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCloset, setShowCloset] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-background border px-4 py-2 rounded text-xs">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="fixed top-4 right-4 z-50">
          <Button
            onClick={() => setShowAuthModal(true)}
            className="text-xs tracking-wide uppercase"
            size="sm"
          >
            Sign In
          </Button>
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="bg-background border rounded-lg px-4 py-2 flex items-center gap-2 hover:bg-muted transition-colors"
          >
            <User className="w-4 h-4" />
            <span className="text-sm font-medium truncate max-w-[150px]">
              {user.email?.split('@')[0] || 'User'}
            </span>
          </button>
          
          {menuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute top-full right-0 mt-2 bg-background border rounded-lg shadow-lg z-50 min-w-[200px]">
                <div className="p-1">
                  <button
                    onClick={() => {
                      setShowCloset(true);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded"
                  >
                    <Heart className="w-4 h-4" />
                    My Closet
                  </button>
                  <button
                    onClick={() => {
                      signOut();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showCloset && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4">
          <div className="w-full max-w-4xl bg-background border rounded-lg p-6 relative max-h-[90vh] overflow-auto">
            <button
              onClick={() => setShowCloset(false)}
              className="absolute top-4 right-4 p-1 hover:bg-muted rounded"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <ClosetView />
          </div>
        </div>
      )}
    </>
  );
}

