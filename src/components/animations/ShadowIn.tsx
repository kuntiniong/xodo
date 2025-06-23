import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

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
}>(  ({ children, className, style, shadowColor = "white" }, ref) => { // Default to white
    const shadowRef = useRef<HTMLDivElement | null>(null);
    const parentRef = useRef<HTMLDivElement | null>(null); // Ref for the parent div to attach ScrollTrigger
    const currentAnimationRef = useRef<gsap.core.Tween | null>(null); // Track current animation

    // Expand function
    const expandShadow = () => {
      if (shadowRef.current) {
        // Kill any existing animation
        if (currentAnimationRef.current) {
          currentAnimationRef.current.kill();
        }
        
        currentAnimationRef.current = gsap.to(shadowRef.current, {
          opacity: 0.7,
          x: 12,
          y: 12,
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
        // Kill any existing animation
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

    useImperativeHandle(ref, () => ({ contractShadow, expandShadow }));    useEffect(() => {
      if (shadowRef.current && parentRef.current) { // Check for parentRef.current as well
        // Kill any existing ScrollTriggers and animations
        ScrollTrigger.getAll().forEach(trigger => {
          if (trigger.trigger === parentRef.current) {
            trigger.kill();
          }
        });
        
        // Kill any existing manual animations
        if (currentAnimationRef.current) {
          currentAnimationRef.current.kill();
          currentAnimationRef.current = null;
        }
        
        // Always use scroll trigger (no mobile logic)
        const scrollTriggerTween = gsap.fromTo(shadowRef.current, 
          { opacity: 0, x: 0, y: 0 }, 
          {
            opacity: 0.7,
            x: 12,
            y: 12,
            duration: 1.2,
            ease: "power3.out",
            onStart: () => {
              // Set this as the current animation when scroll trigger starts
              currentAnimationRef.current = scrollTriggerTween;
            },
            onComplete: () => {
              // Clear the reference when scroll animation completes
              if (currentAnimationRef.current === scrollTriggerTween) {
                currentAnimationRef.current = null;
              }
            },
            scrollTrigger: {
              trigger: parentRef.current, // Use parentRef.current as the trigger
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
        
        // Kill any existing manual animations
        if (currentAnimationRef.current) {
          currentAnimationRef.current.kill();
          currentAnimationRef.current = null;
        }
      };
    }, []);    return (
      <div
        ref={parentRef}
        className={["relative", className].filter(Boolean).join(" ")}
        style={style}
      >
        <div
          ref={shadowRef}
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ background: shadowColor, zIndex: 0 }} // Use shadowColor here
        />
        <div className="relative z-10 flex flex-col">{children}</div>
      </div>
    );
  }
);

export default ShadowIn;