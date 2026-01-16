"use client";

export default function FooterBottom() {
  return (
    <div className="border-t border-gray-700/30 pt-8">
      <div className="flex flex-col-reverse md:flex-row justify-between items-center gap-4">
        <div className="text-base text-gray-400">
          <p>Copyright © {new Date().getFullYear()} Kyle Iong. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}