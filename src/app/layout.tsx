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
import ClientLayout from "./ClientLayout";

export const metadata: Metadata = {
  title: "Xodo - A Keyboard-first To do list",
  description: "Linux-like syntax Keyboard-first to do list web app",
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
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
