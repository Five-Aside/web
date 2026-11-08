"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const field =
  "select-field border border-line bg-pitch-lift px-3 py-2 text-sm normal-case tracking-normal text-chalk outline-none focus:border-flood";
const label =
  "grid gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted";

type LeadRow = {
  id: string;
  leagueName: string;
  contactName: string;
  phone: string;
  email: string | null;
  city: string | null;
  venue: string | null;
  playerCount: number | null;
  message: string | null;
  status: string;
  createdAt: string;
};

type LeagueRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  venue: string;
  teamCount: number;
  playerCount: number;
  currentCycle: { label: string } | null;
  organisers: { name: string; phone: string }[];
};

type Prefill = { requestId?: string; name?: string; venue?: string; adminName?: string; adminPhone?: string };

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function PlatformClient({ platformName }: { platformName: string }) {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(
    () =>
      Promise.all([fetch("/api/platform/requests"), fetch("/api/platform/leagues")]).then(
        async ([r, l]) => {
          if (r.ok) setLeads(await r.json());
          if (l.ok) setLeagues(await l.json());
        },
      ),
    [],
  );

  useEffect(() => {
    Promise.all([fetch("/api/platform/requests"), fetch("/api/platform/leagues")]).then(
      async ([r, l]) => {
        if (r.ok) setLeads(await r.json());
        if (l.ok) setLeagues(await l.json());
      },
    );
  }, []);

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(null), 4000);
  }

  async function logout() {
    await fetch("/api/platform/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.refresh();
  }

  async function setLeadStatus(id: string, status: string) {
    await fetch("/api/platform/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await load();
  }

  async function setLeagueStatus(id: string, status: string) {
    const res = await fetch("/api/platform/leagues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    flash(res.ok ? `League ${status}` : "Could not update league");
    await load();
  }

  const openLeads = leads.filter((l) => l.status === "new" || l.status === "contacted");

  return (
    <main className="section-shell py-10 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/" className="font-display text-xl tracking-[0.12em] text-flood">
            {platformName}
          </Link>
          <h1 className="font-display mt-2 text-3xl text-chalk">Platform admin</h1>
        </div>
        <button
          type="button"
          onClick={logout}
          className="border border-line px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted"
        >
          Log out
        </button>
      </div>
      {message ? (
        <p className="sticky top-2 z-10 mt-4 border border-flood/40 bg-pitch-deep px-4 py-2 text-flood-soft">
          {message}
        </p>
      ) : null}

      <section className="mt-10 border-t border-line pt-8">
        <h2 className="font-display text-2xl text-chalk">
          League requests <span className="text-flood">{openLeads.length}</span>
        </h2>
        <ul className="mt-4 space-y-3">
          {leads.length === 0 ? (
            <li className="text-muted">No requests yet.</li>
          ) : (
            leads.map((lead) => (
              <li key={lead.id} className="border border-line px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-chalk">
                    {lead.leagueName}{" "}
                    <span className="text-xs uppercase tracking-[0.1em] text-flood">{lead.status}</span>
                  </p>
                  <p className="text-xs text-muted">{new Date(lead.createdAt).toLocaleString()}</p>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {lead.contactName} ·{" "}
                  <a
                    href={`https://wa.me/${lead.phone.replace(/\D/g, "").replace(/^0/, "234")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-flood hover:underline"
                  >
                    {lead.phone}
                  </a>
                  {lead.email ? ` · ${lead.email}` : ""}
                  {lead.city ? ` · ${lead.city}` : ""}
                  {lead.venue ? ` · ${lead.venue}` : ""}
                  {lead.playerCount ? ` · ~${lead.playerCount} players` : ""}
                </p>
                {lead.message ? <p className="mt-2 text-sm text-chalk/90">{lead.message}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="bg-flood px-3 py-1.5 text-xs font-semibold text-pitch-deep"
                    onClick={() => {
                      setPrefill({
                        requestId: lead.id,
                        name: lead.leagueName,
                        venue: lead.venue ?? "",
                        adminName: lead.contactName,
                        adminPhone: lead.phone,
                      });
                      document.getElementById("create")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Create league
                  </button>
                  {["contacted", "declined", "new"]
                    .filter((s) => s !== lead.status)
                    .map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="border border-line px-3 py-1.5 text-xs text-muted"
                        onClick={() => setLeadStatus(lead.id, s)}
                      >
                        Mark {s}
                      </button>
                    ))}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-12 border-t border-line pt-8">
        <h2 className="font-display text-2xl text-chalk">Leagues</h2>
        <div className="mt-4 overflow-x-auto border border-line">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="border-b border-flood/30 bg-black/20 text-[0.68rem] uppercase tracking-[0.12em] text-flood">
              <tr>
                <th className="px-3 py-2">League</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Players</th>
                <th className="px-3 py-2">Cycle</th>
                <th className="px-3 py-2">Organisers</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {leagues.map((l) => (
                <tr key={l.id} className="border-b border-line align-top">
                  <td className="px-3 py-3">
                    <Link href={`/${l.slug}`} className="font-semibold text-chalk hover:text-flood">
                      {l.name}
                    </Link>
                    <p className="text-xs text-muted">
                      /{l.slug} · {l.venue} · {l.teamCount} teams
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <select
                      className={field}
                      value={l.status}
                      onChange={(e) => setLeagueStatus(l.id, e.target.value)}
                    >
                      <option value="pilot">pilot</option>
                      <option value="active">active</option>
                      <option value="paused">paused</option>
                    </select>
                  </td>
                  <td className="px-3 py-3 text-muted">{l.playerCount}</td>
                  <td className="px-3 py-3 text-muted">{l.currentCycle?.label ?? "—"}</td>
                  <td className="px-3 py-3 text-muted">
                    {l.organisers.length === 0
                      ? "None"
                      : l.organisers.map((o) => `${o.name} (${o.phone})`).join(", ")}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <OrganiserButton
                      leagueId={l.id}
                      onDone={async (msg) => {
                        flash(msg);
                        await load();
                      }}
                    />
                    <Link
                      href={`/${l.slug}/admin/settings`}
                      className="mt-2 block text-xs text-flood hover:underline"
                    >
                      Settings
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          Pilot leagues work fully but aren&apos;t listed on the home page. Paused leagues are hidden
          from everyone except you.
        </p>
      </section>

      <CreateLeagueForm
        key={prefill?.requestId ?? "blank"}
        prefill={prefill}
        onCreated={async (slug) => {
          flash(`Created /${slug}`);
          setPrefill(null);
          await load();
        }}
      />
    </main>
  );
}

function OrganiserButton({
  leagueId,
  onDone,
}: {
  leagueId: string;
  onDone: (msg: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/platform/leagues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: leagueId,
        organiser: { name: fd.get("name"), phone: fd.get("phone"), password: fd.get("password") },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not assign");
      return;
    }
    setOpen(false);
    await onDone("Organiser assigned");
  }

  if (!open) {
    return (
      <button type="button" className="text-xs text-muted hover:text-chalk" onClick={() => setOpen(true)}>
        + Organiser
      </button>
    );
  }
  return (
    <form onSubmit={onSubmit} className="ml-auto grid w-56 gap-2 text-left">
      <input name="phone" required placeholder="Phone" className={field} />
      <input name="name" placeholder="Name (if new)" className={field} />
      <input name="password" type="password" placeholder="Password (if new)" className={field} />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" className="bg-flood px-3 py-1.5 text-xs font-semibold text-pitch-deep">
          Assign
        </button>
        <button type="button" className="text-xs text-muted" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function CreateLeagueForm({
  prefill,
  onCreated,
}: {
  prefill: Prefill | null;
  onCreated: (slug: string) => Promise<void>;
}) {
  const [name, setName] = useState(prefill?.name ?? "");
  const [slug, setSlug] = useState(prefill?.name ? slugify(prefill.name) : "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const value = (key: string) => String(fd.get(key) ?? "").trim();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/platform/leagues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: prefill?.requestId,
        slug,
        name,
        shortName: value("shortName"),
        tagline: value("tagline"),
        venue: value("venue"),
        firstMatchday: value("firstMatchday"),
        kickoffTime: value("kickoffTime"),
        sessionMinutes: value("sessionMinutes"),
        matchMinutes: value("matchMinutes"),
        turnaroundMinutes: value("turnaroundMinutes"),
        teamCount: value("teamCount"),
        cycleWeeks: value("cycleWeeks"),
        matchesPerNight: value("matchesPerNight") || undefined,
        monthlyFee: value("monthlyFee"),
        visitorFee: value("visitorFee"),
        bankName: value("bankName"),
        accountNumber: value("accountNumber"),
        accountName: value("accountName"),
        whatsappGroupName: value("whatsappGroupName"),
        whatsappGroupUrl: value("whatsappGroupUrl"),
        status: value("status"),
        organiser: value("orgPhone")
          ? { name: value("orgName"), phone: value("orgPhone"), password: value("orgPassword") }
          : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not create league");
      return;
    }
    form.reset();
    setName("");
    setSlug("");
    await onCreated(data.slug);
  }

  return (
    <section id="create" className="mt-12 border-t border-line pt-8">
      <h2 className="font-display text-2xl text-chalk">Create a league</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Creates the league, Teams 1–N, the first cycle with generated fixtures, and the organiser
        login. Everything can be changed later from the league&apos;s settings page.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className={label}>
            League name
            <input
              className={field}
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
            />
          </label>
          <label className={label}>
            URL slug
            <input
              className={field}
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
            />
          </label>
          <label className={label}>
            Short name (logo)
            <input name="shortName" className={field} required maxLength={8} placeholder="e.g. FNF" />
          </label>
          <label className={label}>
            Venue
            <input name="venue" className={field} required defaultValue={prefill?.venue ?? ""} />
          </label>
          <label className={`${label} lg:col-span-2`}>
            Tagline
            <input name="tagline" className={field} />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <label className={label}>
            First matchday
            <input name="firstMatchday" type="date" className={field} required />
          </label>
          <label className={label}>
            Kick-off
            <input name="kickoffTime" type="time" className={field} defaultValue="19:00" required />
          </label>
          <label className={label}>
            Session (min)
            <input name="sessionMinutes" type="number" className={field} defaultValue={90} min={20} max={300} />
          </label>
          <label className={label}>
            Match (min)
            <input name="matchMinutes" type="number" className={field} defaultValue={11} min={3} max={90} />
          </label>
          <label className={label}>
            Turnaround (min)
            <input name="turnaroundMinutes" type="number" className={field} defaultValue={3} min={0} max={30} />
          </label>
          <label className={label}>
            Teams
            <input name="teamCount" type="number" className={field} defaultValue={4} min={2} max={12} />
          </label>
          <label className={label}>
            Weeks per cycle
            <input name="cycleWeeks" type="number" className={field} defaultValue={4} min={1} max={12} />
          </label>
          <label className={label}>
            Matches / night
            <input name="matchesPerNight" type="number" className={field} placeholder="Auto" min={1} max={30} />
          </label>
          <label className={label}>
            Monthly fee (₦)
            <input name="monthlyFee" type="number" className={field} defaultValue={5000} min={0} />
          </label>
          <label className={label}>
            Visitor fee (₦)
            <input name="visitorFee" type="number" className={field} defaultValue={1500} min={0} />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className={label}>
            Bank
            <input name="bankName" className={field} />
          </label>
          <label className={label}>
            Account number
            <input name="accountNumber" className={field} />
          </label>
          <label className={label}>
            Account name
            <input name="accountName" className={field} />
          </label>
          <label className={label}>
            WhatsApp group name
            <input name="whatsappGroupName" className={field} />
          </label>
          <label className={`${label} lg:col-span-2`}>
            WhatsApp group link
            <input name="whatsappGroupUrl" className={field} placeholder="https://chat.whatsapp.com/…" />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className={label}>
            Organiser name
            <input name="orgName" className={field} defaultValue={prefill?.adminName ?? ""} />
          </label>
          <label className={label}>
            Organiser phone (login)
            <input name="orgPhone" className={field} defaultValue={prefill?.adminPhone ?? ""} />
          </label>
          <label className={label}>
            Organiser password
            <input name="orgPassword" type="text" className={field} placeholder="Share it with them" />
          </label>
          <label className={label}>
            Status
            <select name="status" className={field} defaultValue="pilot">
              <option value="pilot">pilot</option>
              <option value="active">active (listed)</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={busy}
            className="bg-flood px-5 py-2.5 text-sm font-semibold text-pitch-deep disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create league"}
          </button>
          {error ? <p className="text-danger">{error}</p> : null}
          <p className="text-xs text-muted">
            Match day is taken from the first matchday&apos;s weekday; change it later in settings.
          </p>
        </div>
      </form>
    </section>
  );
}
