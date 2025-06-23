import localFont from "next/font/local";

export const helveticaNeueThin = localFont({
  src: "../../../public/fonts/HelveticaNeueThin.otf",
  weight: "100",
  style: "normal",
  variable: "--font-helvetica-neue-thin"
});

export const helveticaNeueLight = localFont({
  src: "../../../public/fonts/HelveticaNeueLight.otf",
  weight: "300",
  style: "normal",
  variable: "--font-helvetica-neue-light"
});

export const helveticaNeueBold = localFont({
  src: "../../../public/fonts/HelveticaNeueBold.otf",
  weight: "700",
  style: "normal",
  variable: "--font-helvetica-neue-bold"
});

export const helveticaNeueThinItalic = localFont({
  src: "../../../public/fonts/HelveticaNeueThinItalic.otf",
  weight: "100",
  style: "italic",
  variable: "--font-helvetica-neue-thin-italic"
});

export const nothingFont = localFont({
  src: "../../../public/fonts/nothing-font-5x7.ttf",
  weight: "400",
  style: "normal",
  variable: "--font-nothing"
});

export const jetBrainsMono = localFont({
  src: "../../../public/fonts/JetBrainsMonoNL-Light.ttf",
  weight: "300",
  style: "normal",
  variable: "--font-jetbrains-mono"
});

export const jetBrainsMonoBold = localFont({
  src: "../../../public/fonts/JetBrainsMonoNL-ExtraBold.ttf",
  weight: "700",
  style: "normal",
  variable: "--font-jetbrains-mono-bold"
});
