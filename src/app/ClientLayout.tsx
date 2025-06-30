"use client";

import React from "react";
import SearchBar from "./components/SearchBar";
import Footer from "../components/footer/Footer";
import Image from "next/image";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  // Command handler to broadcast commands to listeners
  const sendCommand = (cmd: any) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("todo-command", { detail: cmd }));
    }
  };
  return (
    <>
      {/* Search bar at the top */}
      <div className="sticky top-0 z-30 w-full bg-gradient-to-b from-black via-black/50 to-transparent">
        <div className="max-w-3xl px-5 sm:px-10 lg:px-18 mx-auto w-full z-10 relative">
          <SearchBar onSearch={sendCommand} />
        </div>
      </div>
      {/* Full background image using Next.js Image */}
      <div style={{ position: "fixed", inset: 0, zIndex: -1 }}>
        <Image
          src="/background.png"
          alt="background"
          fill
          style={{ objectFit: "cover" }}
          priority
          sizes="100vw"
          className="blur-[3px]"
        />
      </div>
      <div className="mx-auto px-1 sm:px-6 lg:px-18 -mt-13 mb-8">
        {/* Added max-width container */}
        {children}
      </div>
      <Footer />
    </>
  );
}
