import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMobile } from "@/hooks/use-mobile";

gsap.registerPlugin(ScrollTrigger);

export interface ShadowInHandle {
  contractShadow: () => void;
  expandShadow: () => void;
}

const ShadowIn = forwardRef<ShadowInHandle, {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  shadowColor?: string;
}>(({ children, className, style, shadowColor = "var(--color-foreground)" }, ref) => {
    const isMobile = useMobile();
    const shadowRef = useRef<HTMLDivElement | null>(null);
    const parentRef = useRef<HTMLDivElement | null>(null);
    const currentAnimationRef = useRef<gsap.core.Tween | null>(null);

    // Expand function
    const expandShadow = () => {
      if (shadowRef.current) {
        if (currentAnimationRef.current) {
          currentAnimationRef.current.kill();
        }
        
        const offset = isMobile ? 6 : 12;
        
        currentAnimationRef.current = gsap.to(shadowRef.current, {
          opacity: 0.7,
          x: offset,
          y: offset,
          duration: 1.2,
          delay: 0,
          ease: "power3.out",
          onComplete: () => {
            currentAnimationRef.current = null;
          }
        });
      }
    };

    // Contract function
    const contractShadow = () => {
      if (shadowRef.current) {
        if (currentAnimationRef.current) {
          currentAnimationRef.current.kill();
        }
        
        currentAnimationRef.current = gsap.to(shadowRef.current, {
          opacity: 0,
          x: 0,
          y: 0,
          duration: 0.6,
          delay: 0,
          ease: "back.out",
          onComplete: () => {
            currentAnimationRef.current = null;
          }
        });
      }
    };

    useImperativeHandle(ref, () => ({ contractShadow, expandShadow }));

    useEffect(() => {
      if (shadowRef.current && parentRef.current) {
        // Kill any existing ScrollTriggers and animations
        ScrollTrigger.getAll().forEach(trigger => {
          if (trigger.trigger === parentRef.current) {
            trigger.kill();
          }
        });
        
        if (currentAnimationRef.current) {
          currentAnimationRef.current.kill();
          currentAnimationRef.current = null;
        }
        
        // Different offset for mobile vs desktop
        const offset = isMobile ? 6 : 12;
        
        // Use scroll trigger for both mobile and desktop
        const scrollTriggerTween = gsap.fromTo(shadowRef.current, 
          { opacity: 0, x: 0, y: 0 }, 
          {
            opacity: 0.7,
            x: offset,
            y: offset,
            duration: 1.2,
            ease: "power3.out",
            onStart: () => {
              currentAnimationRef.current = scrollTriggerTween;
            },
            onComplete: () => {
              if (currentAnimationRef.current === scrollTriggerTween) {
                currentAnimationRef.current = null;
              }
            },
            scrollTrigger: {
              trigger: parentRef.current,
              start: "top bottom-=100", 
              toggleActions: "play none none none", 
            }
          }
        );
      }
      
      // Cleanup function
      return () => {
        ScrollTrigger.getAll().forEach(trigger => {
          if (trigger.trigger === parentRef.current) {
            trigger.kill();
          }
        });
        
        if (currentAnimationRef.current) {
          currentAnimationRef.current.kill();
          currentAnimationRef.current = null;
        }
      };
    }, [isMobile]);

    return (
      <div
        ref={parentRef}
        className={["relative h-full w-full", className].filter(Boolean).join(" ")}
        style={style}
      >
        <div
          ref={shadowRef}
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ background: shadowColor, zIndex: 0 }}
        />
        <div className="relative z-10 h-full w-full flex flex-col">{children}</div>
      </div>
    );
  }
);

export default ShadowIn;