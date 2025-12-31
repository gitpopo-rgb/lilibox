"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface LinkItem {
  name: string;
  url: string;
  selected?: boolean;
}

interface LinkGroup {
  name: string;
  links: LinkItem[];
}

export default function LinksPage() {
  const [groups, setGroups] = useState<LinkGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = useMemo(() => {
    let count = 0;
    groups.forEach((group) => {
      group.links.forEach((link) => {
        if (link.selected) count += 1;
      });
    });
    return count;
  }, [groups]);

  const totalLinks = useMemo(() => {
    let count = 0;
    groups.forEach((group) => {
      count += group.links.length;
    });
    return count;
  }, [groups]);

  useEffect(() => {
    fetchLinks();
  }, []);

  async function fetchLinks() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/links", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("加载链接失败");
      }
      const data: LinkGroup[] = await res.json();
      setGroups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载链接失败");
    } finally {
      setLoading(false);
    }
  }

  function collectSelected(nextGroups: LinkGroup[]) {
    const set = new Set<string>();
    nextGroups.forEach((group) => {
      group.links.forEach((link) => {
        if (link.selected) {
          set.add(link.url);
        }
      });
    });
    return Array.from(set);
  }

  async function toggleLink(targetUrl: string) {
    setError(null);

    let previousGroups: LinkGroup[] = [];
    let nextGroups: LinkGroup[] = [];

    setGroups((prev) => {
      previousGroups = prev;
      nextGroups = prev.map((group) => ({
        ...group,
        links: group.links.map((link) =>
          link.url === targetUrl ? { ...link, selected: !link.selected } : link,
        ),
      }));
      saveSelection();
      return nextGroups;
    });

    async function saveSelection() {
      const selected = collectSelected(nextGroups);

    try {
      setSaving(true);
      const res = await fetch("/api/links/selection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urls: selected }),
      });

      if (!res.ok) {
        throw new Error("保存选中状态失败");
      }
    } catch (err) {
      setGroups(previousGroups);
      setError(err instanceof Error ? err.message : "保存选中状态失败");
    } finally {
      setSaving(false);
    }
    }

    
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-lg font-semibold">链接卡片</p>
          <p className="text-sm text-muted-foreground">
            来自 Clash README 的分组链接，可标记选中状态
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            已选 {selectedCount} / {totalLinks}
          </span>
          {saving && <span className="text-primary">保存中…</span>}
        </div>
      </header>

      <Separator />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <Skeleton key={idx} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => {
            const groupSelected = group.links.filter((link) => link.selected).length;
            return (
              <Card key={group.name} className="border-border/70">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base font-semibold">
                      {group.name}
                    </CardTitle>
                    <Badge variant="outline">
                      已选 {groupSelected}/{group.links.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {group.links.map((link) => (
                      <button
                        key={link.url}
                        onClick={() => toggleLink(link.url)}
                        className={clsx(
                          "group w-full rounded-lg border p-3 text-left transition-colors",
                          link.selected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/60",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-medium leading-tight">{link.name}</p>
                            <p className="text-xs text-muted-foreground break-all">
                              {link.url}
                            </p>
                          </div>
                          <Badge variant={link.selected ? "default" : "secondary"}>
                            {link.selected ? "已选" : "未选"}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
