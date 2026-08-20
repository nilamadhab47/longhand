"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";
import { GlobalSearch } from "@/components/overlays/GlobalSearch";
import { NewTopicDialog } from "@/components/overlays/NewTopicDialog";
import { NoteTree } from "@/components/tree/NoteTree";
import type { TreeFolder } from "@/lib/tree-types";

export function AppShell({
  email,
  folders,
  children,
}: {
  email: string;
  folders: TreeFolder[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeSectionId = pathname.startsWith("/n/")
    ? (pathname.slice(3).split("/")[0] ?? null)
    : null;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [newTopicFolder, setNewTopicFolder] = useState<string | null | false>(
    false,
  );

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sidebar = (
    <>
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <Logo size={22} />
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 hover:text-rule"
        >
          ⌘K
        </button>
      </div>
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="mx-3 mb-2 flex items-center justify-between border border-line bg-paper px-2 py-1.5 text-left font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 hover:border-rule hover:text-rule"
      >
        <span>Search notes</span>
        <span className="text-ink-3">⌘K</span>
      </button>
      <p className="px-3 pb-2 font-mono text-[11px] text-ink-3">{email}</p>
      <Link
        href="/review"
        className={`mx-3 mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] ${
          pathname === "/review" ? "text-rule" : "text-ink-3 hover:text-rule"
        }`}
      >
        Review
      </Link>
      <button
        type="button"
        onClick={() => setNewTopicFolder(null)}
        className="mx-3 mb-3 border border-rule px-2 py-1.5 text-left font-mono text-[11px] uppercase tracking-[0.08em] text-rule hover:bg-sunk"
      >
        New topic
      </button>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <NoteTree
          folders={folders}
          activeSectionId={activeSectionId}
          onNewTopic={(folderId) => setNewTopicFolder(folderId)}
        />
      </div>
      <div className="border-t border-line px-3 py-2">
        <Link
          href="/support"
          className={`mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] ${
            pathname === "/support" ? "text-rule" : "text-ink-3 hover:text-rule"
          }`}
        >
          Support
        </Link>
        <Link
          href="/inbox"
          className={`mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] ${
            pathname === "/inbox" ? "text-rule" : "text-ink-3 hover:text-rule"
          }`}
        >
          Inbox
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 hover:text-rule"
          >
            Sign out
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div
      className="flex min-h-dvh"
      style={{
        paddingLeft: "var(--sal, 0px)",
        paddingRight: "var(--sar, 0px)",
      }}
    >
      <aside
        className="hidden w-[252px] shrink-0 flex-col border-r border-line bg-panel min-[720px]:flex"
        style={{ paddingTop: "var(--sat, 0px)", paddingBottom: "var(--sab, 0px)" }}
      >
        {sidebar}
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 min-[720px]:hidden">
          <button
            type="button"
            aria-label="Close notes"
            className="absolute inset-0 bg-ink/25"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className="relative flex h-full w-[min(280px,100%)] flex-col border-r border-line bg-panel shadow-[0_8px_24px_rgba(22,29,38,0.12)]"
            style={{
              paddingTop: "var(--sat, 0px)",
              paddingBottom: "var(--sab, 0px)",
              paddingLeft: "var(--sal, 0px)",
            }}
          >
            <button
              type="button"
              aria-label="Close notes"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-2 top-2 p-1 text-ink-3 hover:text-ink"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex items-center justify-between border-b border-line bg-paper px-3 py-2 min-[720px]:hidden"
          style={{ paddingTop: "calc(0.5rem + var(--sat, 0px))" }}
        >
          <button
            type="button"
            aria-label="Open notes"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 text-ink"
          >
            <Menu size={18} strokeWidth={1.75} />
            <Logo size={20} />
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setNewTopicFolder(null)}
              className="font-mono text-[11px] uppercase tracking-[0.08em] text-rule"
            >
              New topic
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 hover:text-rule"
            >
              Search
            </button>
          </div>
        </header>
        {children}
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      {newTopicFolder !== false ? (
        <NewTopicDialog
          folders={folders}
          folderId={newTopicFolder}
          onClose={() => setNewTopicFolder(false)}
        />
      ) : null}
    </div>
  );
}
