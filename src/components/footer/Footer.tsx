"use client";

import Link from "next/link";
import FooterBottom from "./FooterBottom";
import Logo from "./Logo"; // Importing the Logo component

interface FooterLink {
  label: string;
  href: string;
  isEmail?: boolean;
}

interface FooterSection {
  title: string;
  mainLink?: FooterLink;
  subLinks?: FooterLink[];
  links?: FooterLink[]; // For sections without main/sub distinction
}

const footerSections: FooterSection[] = [
  {
    title: "FAQ",
    links: [
      { label: "WHY should you use Xodo?", href: "#" },
      { label: "HOW do you use Xodo?", href: "#" },
      { label: "List of commands", href: "https://ktiong.com/blog/xodo-commands" },
    ],
  },
  {
    title: "SOCIALS",
    links: [
      { label: "ktiong.com", href: "https://ktiong.com" },
      { label: "X", href: "https://x.com/kuntiniong" },
      { label: "GitHub", href: "https://github.com/kuntiniong" },
    ],
  },
  {
    title: "TECHNICAL ZONE",
    links: [
      { label: "Source Code", href: "https://github.com/kuntiniong/todo-list" },
      { label: "\"How I made Xodo?\" - Blog", href: "#" },
    ],
  },
];

export default function Component() {
  return (
    <div className="w-full bg-gradient-to-b from-transparent via-black/93 to-black mt-20">
      <footer className="max-w-7xl px-1 sm:px-6 lg:px-18 relative w-screen left-1/2 -translate-x-1/2 py-16 overflow-x-hidden z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Main Footer Content - Two Column Layout with more width to the right column */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 mb-16">
            {/* Left Column - Logo */}
            <div className="order-2 lg:order-1 lg:col-span-1 flex justify-center lg:justify-start items-center">
              <Logo /> {/* Rendering the Logo component */}
            </div>

            {/* Right Column - All Navigation Links (takes 3 out of 4 columns) */}
            <div className="order-1 lg:order-2 lg:col-span-3">
              {/* Updated grid: three columns for links on small screens and larger */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                {footerSections.map((section) => (
                  <div key={section.title} className="p-6">
                    <h3 className="text-lg mb-6 border-b border-gray-700/50 pb-2 title">
                      {section.title}
                    </h3>
                    <div className="flex flex-col space-y-3">
                      {/* Render simple links if provided */}
                      {section.links?.map((link) =>
                        link.isEmail ? (
                          <a
                            key={link.label}
                            href={link.href}
                            className="nav-link"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <Link
                            key={link.label}
                            href={link.href}
                            className="nav-link"
                          >
                            {link.label}
                          </Link>
                        )
                      )}

                      {/* Render main link if it exists */}
                      {section.mainLink &&
                        (section.mainLink.isEmail ? (
                          <a href={section.mainLink.href} className="nav-link">
                            {section.mainLink.label}
                          </a>
                        ) : (
                          <Link
                            href={section.mainLink.href}
                            className="nav-link"
                          >
                            {section.mainLink.label}
                          </Link>
                        ))}

                      {/* Render sub-links if they exist */}
                      {section.subLinks?.map((subLink) =>
                        subLink.isEmail ? (
                          <a
                            key={subLink.label}
                            href={subLink.href}
                            className="nav-link text-sm ml-1"
                          >
                            {subLink.label}
                          </a>
                        ) : (
                          <Link
                            key={subLink.label}
                            href={subLink.href}
                            className="nav-link text-sm ml-1"
                          >
                            {subLink.label}
                          </Link>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Bottom Section */}
          <FooterBottom />
        </div>
      </footer>
    </div>
  );
}