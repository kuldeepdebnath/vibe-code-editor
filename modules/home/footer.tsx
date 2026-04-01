import Link from "next/link";

export function Footer() {
  const year = "2026";
  const socialLinks = [
    {
      href: "https://github.com",
      label: "GitHub",
      icon: (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5 fill-current text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.38 7.86 10.9.58.11.79-.25.79-.56v-2.17c-3.2.69-3.88-1.35-3.88-1.35-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.2 1.77 1.2 1.03 1.76 2.69 1.25 3.34.95.1-.75.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.19 1.18a11.1 11.1 0 0 1 5.8 0c2.22-1.49 3.19-1.18 3.19-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.08 0 4.41-2.68 5.38-5.24 5.67.41.35.77 1.03.77 2.08v3.08c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="relative z-20 border-t border-zinc-200/80 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-black/70">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-8 text-center sm:px-6">
        <div className="flex gap-4">
          {socialLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
            >
              {link.icon}
            </Link>
          ))}
        </div>

        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          &copy; {year} VibeCode. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
