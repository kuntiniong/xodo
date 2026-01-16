"use client";

import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768; // Corresponds to Tailwind's 'md' breakpoint

export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDeviceSize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Check on initial mount
    checkDeviceSize();

    // Add event listener for window resize
    window.addEventListener('resize', checkDeviceSize);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('resize', checkDeviceSize);
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount

  return isMobile;
}
