"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { useLeagueLinks } from "@/components/LeagueProvider";

type Post = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  week: number | null;
  createdAt: string;
};

export function NewsDetailClient() {
  const { p, api } = useLeagueLinks();
  const params = useParams();
  const id = String(params.id || "");
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(api(`/news?id=${encodeURIComponent(id)}`))
      .then(async (r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((d) => setPost(d.post))
      .catch(() => setError("Story not found"));
  }, [id, api]);

  return (
    <AppChrome title={post?.title || "Story"}>
      {error ? <p className="text-danger">{error}</p> : null}
      {!post && !error ? <p className="text-muted">Loading…</p> : null}
      {post ? (
        <article className="max-w-2xl">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-flood">
            {post.pinned ? "Pinned" : post.week ? `Week ${post.week}` : "News"}
            {" · "}
            {new Date(post.createdAt).toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
          <div className="mt-6 whitespace-pre-line text-base leading-relaxed text-chalk">
            {post.body}
          </div>
          <p className="mt-10 text-sm">
            <Link href={p("/news")} className="text-flood hover:underline">
              ← All news
            </Link>
          </p>
        </article>
      ) : null}
    </AppChrome>
  );
}
