"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { LogIn, LogOut, User } from 'lucide-react';

const UserDropdown: React.FC = () => {
  const { user, isLoading, signInWithGoogle, signOut } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to sign in:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User profile button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        disabled={isLoading}
      >
        <span className="font-main text-sm text-foreground/80 hidden sm:block">
          {user ? user.displayName || 'User' : 'Anonymous'}
        </span>
        <div className="w-8 h-8 bg-background-muted rounded-full border-2 border-foreground/20 flex items-center justify-center overflow-hidden">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 bg-gradient-to-br from-link-from to-link-to rounded-full flex items-center justify-center">
              <User size={12} className="text-background" />
            </div>
          )}
        </div>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-background border-2 border-foreground/20 rounded-lg shadow-lg z-50">
          <div className="p-3">
            {user ? (
              <>
                {/* User info */}
                <div className="flex items-center gap-3 pb-3 border-b border-foreground/10">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-background-muted">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-link-from to-link-to flex items-center justify-center">
                        <User size={16} className="text-background" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-title text-sm text-foreground truncate">
                      {user.displayName || 'User'}
                    </p>
                    <p className="font-main text-xs text-foreground/60 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Sign out button */}
                <button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="w-full flex items-center gap-2 px-3 py-2 mt-2 text-sm font-main text-foreground/80 hover:text-foreground hover:bg-foreground/5 rounded-md transition-colors"
                >
                  <LogOut size={16} />
                  {isLoading ? 'Signing out...' : 'Sign out'}
                </button>
              </>
            ) : (
              <>
                {/* Anonymous user info */}
                <div className="pb-3 border-b border-foreground/10">
                  <p className="font-title text-sm text-foreground">Anonymous User</p>
                  <p className="font-main text-xs text-foreground/60">
                    Sign in to sync your data across devices
                  </p>
                </div>

                {/* Sign in button */}
                <button
                  onClick={handleSignIn}
                  disabled={isLoading}
                  className="w-full flex items-center gap-2 px-3 py-2 mt-2 text-sm font-main text-foreground/80 hover:text-foreground hover:bg-foreground/5 rounded-md transition-colors"
                >
                  <LogIn size={16} />
                  {isLoading ? 'Signing in...' : 'Sign in with Google'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;
