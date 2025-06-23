'use client';

import React, { useMemo, useRef, useEffect, useLayoutEffect, useState } from "react";
import gsap from "gsap";

interface ShinyBorderEffectProps {
  children: React.ReactElement<SVGSVGElement>;
  borderColor?: string;
  shineColor?: string;
  duration?: number;
  active?: boolean; // NEW: controls when the shine animation runs
}

function hasPathProps(props: any): props is { d: string; strokeWidth?: number } {
  return typeof props === 'object' && props !== null && 'd' in props;
}

// Recursively collect all <path> elements from the SVG
function collectPaths(node: React.ReactNode, paths: Array<{ d: string; strokeWidth: number }>) {
  React.Children.forEach(node, (child) => {
    if (React.isValidElement(child)) {
      if (child.type === "path" && hasPathProps(child.props)) {
        paths.push({
          d: child.props.d,
          strokeWidth: child.props.strokeWidth || 2,
        });
      } else if (typeof child.props === 'object' && child.props !== null && 'children' in child.props && (child.props as any).children) {
        collectPaths((child.props as any).children as React.ReactNode, paths);
      }
    }
  });
}

/**
 * Wraps an SVG and animates a shiny clockwise border effect using CSS keyframes.
 */
const ShinyBorderEffect: React.FC<ShinyBorderEffectProps> = ({
  children,
  borderColor = "#FFFFFF",
  shineColor = "#000000",
  duration = 2.5,
  active = true, // default to true for backward compatibility
}) => {
  // Fallback for SSR only
  if (typeof window === "undefined") {
    return (
      <div style={{ position: "relative", width: "fit-content", height: "fit-content" }}>
        {React.cloneElement(children, { ...children.props })}
      </div>
    );
  }

  const uniqueClass = useMemo(() => {
    // Use a fixed class name for SSR consistency
    return "shiny-border-effect";
  }, []);

  const shineRefs = useRef<Array<SVGPathElement | null>>([]);
  const shineOpacityRefs = useRef<Array<number>>([]); // Track opacity for each path
  const [shineVisible, setShineVisible] = useState(active ? 1 : 0);

  // Animate opacity when active changes
  useEffect(() => {
    gsap.to({ val: shineVisible }, {
      val: active ? 1 : 0,
      duration: 0.35,
      onUpdate: function () {
        setShineVisible(this.targets()[0].val);
      },
      overwrite: true,
      ease: "power2.out"
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  let viewBox = typeof children.props.viewBox === 'string' ? children.props.viewBox : undefined;

  // NEW: Track hydration to ensure refs are attached before animating
  const [hydrated, setHydrated] = useState(false);
  useLayoutEffect(() => {
    setHydrated(true);
  }, []);

  // Memoize effects and paths together to keep them in sync
  const effects = useMemo(() => {
    const collectedPaths: Array<{ d: string; strokeWidth: number }> = [];
    collectPaths(children.props.children as React.ReactNode, collectedPaths);
    if (!viewBox) return [];
    return collectedPaths.map((path) => {
      const tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      tempPath.setAttribute("d", path.d);
      const pathLength = tempPath.getTotalLength();
      const dashLength = pathLength * 0.13;
      const gapLength = (pathLength - 2 * dashLength) / 2;
      const dashArray = `${dashLength},${gapLength},${dashLength},${gapLength}`;
      return {
        d: path.d,
        strokeWidth: path.strokeWidth,
        dashArray,
        pathLength,
      };
    });
  }, [viewBox, children.props.children]);

  // Reset shineRefs if number of paths changes
  useEffect(() => {
    shineRefs.current = Array(effects.length).fill(null);
  }, [effects.length]);

  // GSAP animation effect (run only after hydration and refs are attached)
  useEffect(() => {
    if (!effects.length || !active || !hydrated) return;
    // Wait for refs to be attached after hydration and for browser paint
    requestAnimationFrame(() => {
      shineRefs.current.forEach((el, idx) => {
        if (el) {
          gsap.killTweensOf(el);
          gsap.set(el, { strokeDashoffset: 0 });
          gsap.to(el, {
            strokeDashoffset: -effects[idx].pathLength,
            duration,
            repeat: -1,
            ease: "linear",
          });
        }
      });
    });
    // Cleanup on unmount
    return () => {
      shineRefs.current.forEach((el) => el && gsap.killTweensOf(el));
    };
  }, [duration, effects, active, hydrated]);

  return (
    <div style={{ position: "relative", width: "fit-content", height: "fit-content" }}>
      {React.cloneElement(children, { ...children.props })}
      {effects.length > 0 && viewBox && (
        <svg
          className={uniqueClass}
          viewBox={viewBox}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}
        >
          {effects.map((e, idx) => (
            <React.Fragment key={e.d + idx}>
              <path
                d={e.d}
                fill="none"
                stroke={borderColor}
                strokeWidth={e.strokeWidth}
              />
              <path
                ref={el => {
                  shineRefs.current[idx] = el;
                }}
                d={e.d}
                fill="none"
                stroke={shineColor}
                strokeWidth={e.strokeWidth}
                strokeLinecap="round"
                style={{
                  filter: "blur(2px)",
                  opacity: shineVisible * 0.7,
                  strokeDasharray: e.dashArray,
                  strokeDashoffset: 0,
                  transition: 'opacity 0.3s',
                }}
              />
            </React.Fragment>
          ))}
        </svg>
      )}
    </div>
  );
};

export default ShinyBorderEffect;
