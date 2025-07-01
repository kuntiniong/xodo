"use client";

import React from "react";
import Image from "next/image";
import SearchBar, { Command } from "../app/components/SearchBar";
import { useSidebarStore } from "../app/stores/sidebarStore";

interface NavBarProps {
  onSearch: (command: Command) => void;
}

const NavBar: React.FC<NavBarProps> = ({ onSearch }) => {
  const { setSidebarOpen } = useSidebarStore();

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="sticky top-0 z-30 w-full bg-gradient-to-b from-black via-black/50 to-transparent">
      <div className="max-w-6xl px-5 sm:px-10 lg:px-18 mx-auto w-full z-10 relative">
        <nav className="flex items-center justify-between py-4">
          {/* Left side - Logo */}
          <div className="hidden sm:flex items-center">
            <button 
              onClick={handleLogoClick}
              className="w-32 h-8 relative cursor-pointer hover:opacity-80 transition-opacity duration-200"
              aria-label="Scroll to top"
            >
              <Image
                src="/logo.png"
                alt="Xodo Logo"
                fill
                className="object-contain"
                priority
              />
            </button>
          </div>

          {/* Center - Search Bar */}
          <div className="flex-1 max-w-2xl mx-4">
            <SearchBar onSearch={onSearch} />
          </div>

          {/* Right side - Name, Profile pic and Sidebar button */}
          <div className="flex items-center gap-3">
            <span className="font-main text-sm text-foreground/80 hidden sm:block">John Doe</span>
            <div className="w-8 h-8 bg-background-muted rounded-full border-2 border-foreground/20 flex items-center justify-center">
              <div className="w-6 h-6 bg-gradient-to-br from-link-from to-link-to rounded-full"></div>
            </div>
            
            {/* Sidebar toggle button - visible on mobile and tablet */}
            <button
              className="rounded-lg lg:hidden p-2"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <defs>
                  <linearGradient
                    id="menu-gradient"
                    x1="0"
                    y1="0"
                    x2="24"
                    y2="0"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="var(--color-link-from)" />
                    <stop offset="1" stopColor="var(--color-link-to)" />
                  </linearGradient>
                </defs>
                <rect y="4" width="24" height="2" rx="1" fill="url(#menu-gradient)" />
                <rect y="11" width="24" height="2" rx="1" fill="url(#menu-gradient)" />
                <rect y="18" width="24" height="2" rx="1" fill="url(#menu-gradient)" />
              </svg>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default NavBar;
