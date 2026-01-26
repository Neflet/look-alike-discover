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
          <button
            onClick={() => setShowAuthModal(true)}
            className="h-12 px-6 bg-zinc-200 hover:bg-white text-black font-bold transition-colors rounded-full"
          >
            SIGN IN
          </button>
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
            className="h-12 px-6 bg-zinc-200 hover:bg-white text-black font-bold transition-colors rounded-full flex items-center gap-2"
          >
            <User className="w-5 h-5" />
            <span className="text-sm truncate max-w-[150px]">
              {user.email?.split('@')[0] || 'User'}
            </span>
          </button>
          
          {menuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute top-full right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg z-50 min-w-[200px]">
                <div className="p-1">
                  <button
                    onClick={() => {
                      setShowCloset(true);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <Heart className="w-4 h-4" />
                    My Closet
                  </button>
                  <button
                    onClick={() => {
                      signOut();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-zinc-800 rounded-lg transition-colors"
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
        <div className="fixed inset-0 z-50">
          <ClosetView onHome={() => setShowCloset(false)} onClose={() => setShowCloset(false)} />
        </div>
      )}
    </>
  );
}

