"use client";

import React from "react";
import SearchBar, { Command } from "./SearchBar";

interface NavBarProps {
  onSearch: (command: Command) => void;
}

const NavBar: React.FC<NavBarProps> = ({ onSearch }) => {
  return (
    <div className="sticky top-0 z-30 w-full bg-gradient-to-b from-black via-black/50 to-transparent">
      <div className="max-w-3xl px-5 sm:px-10 lg:px-18 mx-auto w-full z-10 relative">
        <nav className="flex items-center justify-between py-4">
          {/* Left side - Logo placeholder */}
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-link-from to-link-to rounded-full flex items-center justify-center">
              <span className="font-title text-background text-sm font-bold">X</span>
            </div>
            <span className="ml-2 font-title text-lg title">Xodo</span>
          </div>

          {/* Center - Search Bar */}
          <div className="flex-1 max-w-md mx-4">
            <SearchBar onSearch={onSearch} />
          </div>

          {/* Right side - Name and Profile pic placeholder */}
          <div className="flex items-center gap-3">
            <span className="font-main text-sm text-foreground/80 hidden sm:block">John Doe</span>
            <div className="w-8 h-8 bg-background-muted rounded-full border-2 border-foreground/20 flex items-center justify-center">
              <div className="w-6 h-6 bg-gradient-to-br from-link-from to-link-to rounded-full"></div>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default NavBar;
