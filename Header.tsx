"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const explorerItems = [
  { label: "Overview", href: "/explorer" },
  { section: "Chain" },
  { label: "Blocks & Transactions", href: "/explorer/chain" },
  { section: "Staking" },
  { label: "Pools & Delegations", href: "/explorer/staking" },
  { section: "Governance" },
  { label: "Proposals & Votes", href: "/explorer/governance" },
  { section: "Assets" },
  { label: "Tokens & Mints", href: "/explorer/tokens" },
  { section: "Analysis" },
  { label: "Network Analytics", href: "/explorer/analytics" },
  { label: "Rich List & Whales", href: "/explorer/addresses" },
];

function ExplorerDropdown({ isActive }: { isActive: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className={`px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${isActive ? "text-white bg-gray-700" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"}`}>
        Explorer <span className="text-xs ml-0.5">{"▾"}</span>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-xl py-1 min-w-[220px] z-50">
          {explorerItems.map((item, i) => item.section ? (
            <div key={i} className="px-3 py-1 text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">{item.section}</div>
          ) : (
            <Link key={item.href} href={item.href!} className="block px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition" onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDash = pathname === "/" || (pathname.startsWith("/dashboard") && !pathname.startsWith("/dashboard/chain") && !pathname.startsWith("/dashboard/drep/governance"));
  const isGov = pathname.startsWith("/governance") || pathname.startsWith("/dashboard/drep/governance") || pathname.startsWith("/dashboard/drep/votes") || pathname.startsWith("/dashboard/drep/simulator");
  const isChain = pathname.startsWith("/chain") || pathname === "/dashboard/chain" || pathname.startsWith("/explorer/chain");
  const isExplorer = pathname.startsWith("/explorer") && !pathname.startsWith("/explorer/chain");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setQuery("");
    inputRef.current?.blur();
  };

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT","TEXTAREA","SELECT"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
      <div className="mx-auto px-4 flex items-center gap-3 h-14" style={{ maxWidth: 1900 }}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">{"₳"}</div>
          <span className="text-lg font-bold hidden sm:inline"><span className="text-blue-400">ADA</span>tool</span>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl">
          <div className={`flex items-center bg-gray-800 rounded-lg border transition ${searchFocused ? "border-blue-500" : "border-gray-700"}`}>
            <span className="pl-3 text-gray-500 text-sm">{"\u{1F50D}"}</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search address, tx, block, pool..."
              className="w-full bg-transparent px-2 py-1.5 text-sm text-gray-200 placeholder-gray-500 outline-none"
            />
            {!searchFocused && !query && (
              <kbd className="mr-2 px-1.5 py-0.5 text-[10px] text-gray-500 bg-gray-700 rounded font-mono">/</kbd>
            )}
          </div>
        </form>

        {/* Navigation */}
        <nav className="flex items-center gap-0.5 shrink-0">
          <Link href="/" className={`px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${isDash ? "text-white bg-gray-700" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"}`}>
            Dashboard
          </Link>
          <Link href="/governance" className={`px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${isGov ? "text-white bg-gray-700" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"}`}>
            Governance
          </Link>
          <Link href="/dashboard/chain" className={`px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${isChain ? "text-white bg-gray-700" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"}`}>
            Chain
          </Link>
          <ExplorerDropdown isActive={isExplorer} />
        </nav>
      </div>
    </header>
  );
}
