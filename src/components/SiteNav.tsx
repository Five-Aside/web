"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { useLeague, useLeagueLinks } from "@/components/LeagueProvider";
import { PlayerAvatar } from "@/components/PlayerAvatar";

type AuthPlayer = {
  id: string;
  name: string;
  role?: string;
  status?: string;
  photoPath?: string | null;
};

const pageLinkPaths = [
  { href: "", label: "Home" },
  { href: "/news", label: "News" },
  { href: "/rules", label: "Rules" },
  { href: "/tables", label: "Tables" },
  { href: "/players", label: "Players" },
  { href: "/payments", label: "Payments" },
  { href: "/purse", label: "Purse" },
  { href: "/feedback", label: "Feedback" },
];

export function SiteNav({
  variant = "app",
  sectionLinks = [],
}: {
  variant?: "home" | "app";
  sectionLinks?: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const league = useLeague();
  const { p, api } = useLeagueLinks();
  const pageLinks = pageLinkPaths.map((link) => ({ ...link, href: p(link.href) }));
  const DASHBOARD_HREF = p("/me");
  const [player, setPlayer] = useState<AuthPlayer | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const refreshAuth = useCallback(() => {
    fetch(api("/auth/login"))
      .then((r) => r.json())
      .then((data) => {
        setPlayer(data.player ?? null);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [api]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth, pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function logout() {
    await fetch(api("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setPlayer(null);
    setOpen(false);
    router.push(p());
    router.refresh();
  }

  const linkClass =
    variant === "home"
      ? "text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-flood-soft transition hover:text-chalk"
      : "text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted transition hover:text-chalk";

  const mobileLinkClass =
    "block border-b border-line px-1 py-3.5 text-base font-semibold uppercase tracking-[0.1em] text-chalk";

  const authLinks = (
    <>
      {player ? (
        <>
          <Link
            href={DASHBOARD_HREF}
            className={`${linkClass} inline-flex items-center gap-2`}
            onClick={() => setOpen(false)}
          >
            <PlayerAvatar
              id={player.id}
              name={player.name}
              photoPath={player.photoPath}
              size="sm"
            />
            Dashboard
          </Link>
          {player.role === "organiser" ? (
            <Link
              href={p("/admin")}
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              Admin
            </Link>
          ) : null}
        </>
      ) : null}
    </>
  );

  const authButtons = !loaded ? null : player ? (
    <button
      type="button"
      onClick={logout}
      className="border border-line px-3 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted transition hover:border-chalk/40 hover:text-chalk"
    >
      Log out
    </button>
  ) : (
    <>
      <Link
        href={p("/login")}
        className="border border-line px-3 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted transition hover:border-chalk/40 hover:text-chalk"
        onClick={() => setOpen(false)}
      >
        Log in
      </Link>
      <Link
        href={p("/register")}
        className="bg-flood px-3 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-pitch-deep transition hover:bg-flood-soft"
        onClick={() => setOpen(false)}
      >
        Register
      </Link>
    </>
  );

  const mobileMenu =
    open && mounted
      ? createPortal(
          <div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-[9999] flex flex-col lg:hidden"
            style={{ backgroundColor: "#06150f" }}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/15 px-5 sm:h-16">
              <Link
                href={p()}
                className="font-display text-xl tracking-[0.12em] text-[#e4b53f]"
                onClick={() => setOpen(false)}
              >
                {league.shortName}
              </Link>
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center border border-white/20 text-[#f3f6f1]"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <span className="text-2xl leading-none" aria-hidden>
                  ×
                </span>
              </button>
            </div>
            <nav
              className="flex flex-1 flex-col overflow-y-auto px-5 py-4"
              aria-label="Mobile"
            >
              {pageLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={mobileLinkClass}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {sectionLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={mobileLinkClass}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              {player ? (
                <>
                <Link
                  href={DASHBOARD_HREF}
                  className={`${mobileLinkClass} flex items-center gap-3`}
                  onClick={() => setOpen(false)}
                >
                  <PlayerAvatar
                    id={player.id}
                    name={player.name}
                    photoPath={player.photoPath}
                    size="sm"
                  />
                  Dashboard
                </Link>
                  {player.role === "organiser" ? (
                    <Link
                      href={p("/admin")}
                      className={mobileLinkClass}
                      onClick={() => setOpen(false)}
                    >
                      Admin
                    </Link>
                  ) : null}
                </>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-3 pb-10">{authButtons}</div>
            </nav>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <nav
        className="hidden items-center gap-4 lg:flex xl:gap-5"
        aria-label="Primary"
      >
        {pageLinks.map((link) => (
          <Link key={link.href} href={link.href} className={linkClass}>
            {link.label}
          </Link>
        ))}
        {sectionLinks.map((link) => (
          <a key={link.href} href={link.href} className={linkClass}>
            {link.label}
          </a>
        ))}
        {authLinks}
      </nav>

      <div className="hidden items-center gap-2 lg:flex">{authButtons}</div>

      <button
        type="button"
        className="relative z-10 inline-flex size-10 items-center justify-center border border-line text-chalk lg:hidden"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sr-only">{open ? "Close" : "Menu"}</span>
        <span className="flex flex-col gap-1.5" aria-hidden>
          <span
            className={`block h-0.5 w-5 bg-current transition ${open ? "translate-y-2 rotate-45" : ""}`}
          />
          <span
            className={`block h-0.5 w-5 bg-current transition ${open ? "opacity-0" : ""}`}
          />
          <span
            className={`block h-0.5 w-5 bg-current transition ${open ? "-translate-y-2 -rotate-45" : ""}`}
          />
        </span>
      </button>

      {mobileMenu}
    </>
  );
}
