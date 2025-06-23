"use client";
import { useRef, useEffect, type ReactNode } from "react";
import gsap from "gsap";

interface FadeInProps {
  children: ReactNode;
  y?: number;
  duration?: number;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function FadeIn({
  children,
  y = 24,
  duration = 0.8,
  delay = 0.3,
  className = "",
  style,
}: FadeInProps) {
  const fadeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (fadeRef.current) {
      gsap.fromTo(
        fadeRef.current,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          delay,
          ease: "power2.out",
        }
      );
    }
  }, [y, duration, delay]);
  return (
    <div ref={fadeRef} className={className} style={style}>
      {children}
    </div>
  );
}
