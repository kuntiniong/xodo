"use client";

import React, { useEffect } from "react";
import NavBar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import Image from "next/image";
import { AuthProvider } from "@/components/navbar/AuthProvider";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  // Command handler to broadcast commands to listeners
  const sendCommand = (cmd: any) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("todo-command", { detail: cmd }));
    }
  };

  useEffect(() => {
    const handleStorageImport = () => {
      // We need to reload the page to reflect the changes
      // because the server-rendered components won't automatically update.
      // A better solution would be to manage state globally (e.g., with Zustand or Redux)
      // and update it upon this event.
      window.location.reload();
    };

    window.addEventListener("local-storage-imported", handleStorageImport);

    return () => {
      window.removeEventListener("local-storage-imported", handleStorageImport);
    };
  }, []);

  return (
    <AuthProvider>
      {/* Navigation bar at the top */}
      <NavBar onSearch={sendCommand} />
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
    </AuthProvider>
  );
}
