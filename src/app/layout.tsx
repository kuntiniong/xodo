import type { Metadata } from "next";
import "./styles/globals.css";
import {
  helveticaNeueThin,
  helveticaNeueLight,
  helveticaNeueBold,
  helveticaNeueThinItalic,
  nothingFont,
  jetBrainsMono,
  jetBrainsMonoBold,
} from "@/app/styles/font";
import Image from "next/image";

export const metadata: Metadata = {
  title: "To do list",
  description: "Retrofuturistic to do list web app",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`
          ${helveticaNeueThin.variable}
          ${helveticaNeueLight.variable}
          ${helveticaNeueBold.variable}
          ${helveticaNeueThinItalic.variable}
          ${nothingFont.variable}
          ${jetBrainsMono.variable}
          ${jetBrainsMonoBold.variable}
          antialiased
          overflow-x-hidden
        `}
      >
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
        <div className="mx-auto px-1 sm:px-6 lg:px-18 -mt-8">
          {/* Added max-width container */}
          {children}
        </div>
      </body>
    </html>
  );
}
