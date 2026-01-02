"use client";

import { useEffect, useMemo, useState } from "react";

import clsx from "clsx";
import { Download, Filter, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

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

  // Filtered groups based on search and selection filter
  const filteredGroups = useMemo(() => {
    return groups
      .map((group) => {
        const filteredLinks = group.links.filter((link) => {
          // Apply selection filter
          if (showSelectedOnly && !link.selected) return false;

          // Apply search filter
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            return link.name.toLowerCase().includes(query) || link.url.toLowerCase().includes(query);
          }

          return true;
        });

        return {
          ...group,
          links: filteredLinks,
        };
      })
      .filter((group) => group.links.length > 0); // Only show groups with links
  }, [groups, searchQuery, showSelectedOnly]);

  const filteredCount = useMemo(() => {
    let count = 0;
    filteredGroups.forEach((group) => {
      count += group.links.length;
    });
    return count;
  }, [filteredGroups]);

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
        links: group.links.map((link) => (link.url === targetUrl ? { ...link, selected: !link.selected } : link)),
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

  const handleExport = async () => {
    if (selectedCount === 0) {
      toast.error("请先选择要导出的链接");
      return;
    }

    setSaving(true);
    try {
      // 提取所有选中的链接
      const selectedLinks: { name: string; url: string }[] = [];
      groups.forEach((group) => {
        group.links.forEach((link) => {
          if (link.selected) {
            selectedLinks.push({ name: link.name, url: link.url });
          }
        });
      });

      const response = await fetch("/api/export-ros", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ links: selectedLinks }),
      });

      if (!response.ok) {
        throw new Error("导出失败");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "lilibox-export.rsc";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("导出成功！脚本已开始下载。");
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("导出过程中出现错误，请稍后重试。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <style jsx>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        /* Gradient Border - Light Mode */
        .gradient-border {
          position: relative;
          background: linear-gradient(135deg, 
            hsl(var(--card)) 0%, 
            hsl(var(--card)) 100%
          );
        }

        .gradient-border::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 2px;
          background: linear-gradient(135deg, 
            hsl(280, 100%, 70%), 
            hsl(200, 100%, 60%), 
            hsl(320, 100%, 65%)
          );
          -webkit-mask: 
            linear-gradient(#fff 0 0) content-box, 
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
        }

        /* Dark Mode - Enhanced Gradient Border */
        :global(.dark) .gradient-border::before {
          background: linear-gradient(135deg, 
            hsl(280, 100%, 60%), 
            hsl(200, 100%, 55%), 
            hsl(320, 100%, 60%)
          );
          filter: brightness(1.2);
        }

        /* Link Card Base */
        .link-card {
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .link-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            transparent 0%,
            hsl(var(--primary) / 0.1) 50%,
            transparent 100%
          );
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .link-card:hover::before {
          opacity: 1;
        }

        /* Dark Mode - Enhanced Hover Effect */
        :global(.dark) .link-card:hover::before {
          background: linear-gradient(
            135deg,
            transparent 0%,
            hsl(280, 100%, 50% / 0.15) 50%,
            transparent 100%
          );
        }

        /* Dark Mode - Enhanced text contrast for unselected cards */
        :global(.dark) .link-card:not(.link-card-selected) {
          background: rgba(17, 24, 39, 0.8);
        }

        :global(.dark) .link-card:not(.link-card-selected) p {
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        /* Link Card Selected - Light Mode */
        .link-card-selected {
          background: linear-gradient(
            135deg,
            hsl(280, 100%, 95%) 0%,
            hsl(200, 100%, 95%) 50%,
            hsl(320, 100%, 95%) 100%
          );
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
          border: 2px solid hsl(280, 80%, 70%);
          box-shadow: 
            0 0 20px hsl(280, 100%, 70% / 0.3),
            0 0 40px hsl(200, 100%, 60% / 0.2),
            0 4px 20px hsl(var(--primary) / 0.1);
        }

        /* Link Card Selected - Dark Mode */
        :global(.dark) .link-card-selected {
          background: linear-gradient(
            135deg,
            hsl(280, 70%, 20%) 0%,
            hsl(200, 70%, 20%) 50%,
            hsl(320, 70%, 20%) 100%
          );
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
          box-shadow: 
            0 0 30px hsl(280, 100%, 50% / 0.4),
            0 0 50px hsl(200, 100%, 50% / 0.3),
            0 4px 30px hsl(320, 100%, 50% / 0.2),
            inset 0 0 60px hsl(280, 100%, 50% / 0.1);
          border: 1px solid hsl(280, 100%, 50% / 0.3);
        }

        /* Enhanced text readability on selected cards */
        :global(.dark) .link-card-selected p {
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
        }

        :global(.dark) .link-card-selected p:first-child {
          color: white;
          font-weight: 600;
        }

        /* Shimmer Effect */
        .shimmer-effect {
          background: linear-gradient(
            90deg,
            transparent 0%,
            hsl(var(--primary) / 0.2) 50%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite;
        }

        :global(.dark) .shimmer-effect {
          background: linear-gradient(
            90deg,
            transparent 0%,
            hsl(280, 100%, 60% / 0.3) 50%,
            transparent 100%
          );
          background-size: 200% 100%;
        }

        /* Stats Badge - Light Mode */
        .stats-badge {
          background: linear-gradient(
            135deg,
            hsl(280, 100%, 85%) 0%,
            hsl(200, 100%, 85%) 100%
          );
          transition: all 0.3s ease;
        }

        /* Stats Badge - Dark Mode */
        :global(.dark) .stats-badge {
          background: linear-gradient(
            135deg,
            hsl(280, 70%, 35%) 0%,
            hsl(200, 70%, 35%) 100%
          );
          box-shadow: 
            0 0 20px hsl(280, 100%, 50% / 0.3),
            inset 0 0 20px hsl(280, 100%, 50% / 0.15);
        }

        :global(.dark) .stats-badge span {
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
          font-weight: 700;
        }

        .stats-badge:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px hsl(var(--primary) / 0.3);
        }

        :global(.dark) .stats-badge:hover {
          box-shadow: 
            0 4px 20px hsl(280, 100%, 50% / 0.4),
            0 0 30px hsl(200, 100%, 50% / 0.3);
        }

        /* Group Card */
        .group-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid hsl(var(--border));
        }

        .group-card:hover {
          transform: translateY(-4px);
          box-shadow: 
            0 12px 24px hsl(var(--primary) / 0.1),
            0 0 0 1px hsl(var(--primary) / 0.2);
        }

        :global(.dark) .group-card:hover {
          box-shadow: 
            0 12px 40px hsl(280, 100%, 50% / 0.2),
            0 0 60px hsl(200, 100%, 50% / 0.15),
            0 0 0 1px hsl(280, 100%, 50% / 0.4);
        }

        /* Error Banner */
        .error-banner {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        /* Saving Indicator */
        .saving-indicator {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .saving-indicator::before {
          content: '';
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: linear-gradient(
            135deg,
            hsl(280, 100%, 60%),
            hsl(200, 100%, 60%)
          );
          animation: pulse-glow 1s ease-in-out infinite;
          box-shadow: 0 0 10px hsl(280, 100%, 60% / 0.5);
        }

        :global(.dark) .saving-indicator::before {
          background: linear-gradient(
            135deg,
            hsl(280, 100%, 65%),
            hsl(200, 100%, 65%)
          );
          box-shadow: 0 0 15px hsl(280, 100%, 60% / 0.7);
        }

        /* Progress Bar */
        .progress-bar {
          background: linear-gradient(
            90deg,
            hsl(280, 100%, 60%),
            hsl(200, 100%, 60%),
            hsl(320, 100%, 60%)
          );
          box-shadow: 0 0 10px hsl(280, 100%, 60% / 0.5);
        }

        :global(.dark) .progress-bar {
          background: linear-gradient(
            90deg,
            hsl(280, 100%, 65%),
            hsl(200, 100%, 65%),
            hsl(320, 100%, 65%)
          );
          box-shadow: 
            0 0 15px hsl(280, 100%, 60% / 0.6),
            0 0 30px hsl(200, 100%, 60% / 0.4);
        }

        /* Dynamic Badge - adapts to selection percentage */
        .dynamic-badge {
          transition: all 0.3s ease;
        }

        :global(.dark) .dynamic-badge {
          filter: brightness(0.6) saturate(1.3);
        }

        /* Loading Skeleton */
        .loading-skeleton {
          position: relative;
          overflow: hidden;
        }

        .loading-skeleton::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.1) 50%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite;
        }

        :global(.dark) .loading-skeleton::after {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.05) 50%,
            transparent 100%
          );
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* Enhanced Header with Gradient */}
      <header className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl gradient-border backdrop-blur-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 dark:from-purple-400 dark:via-blue-400 dark:to-pink-400 bg-clip-text text-transparent animate-in slide-in-from-left-4 duration-500">
            链接卡片
          </h1>
          <p className="text-sm text-muted-foreground animate-in slide-in-from-left-6 duration-700">
            来自 Clash README 的分组链接，可标记选中状态
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm animate-in slide-in-from-right-4 duration-500">
          <div className="stats-badge px-4 py-2 rounded-full font-semibold shadow-md">
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-300 dark:to-blue-300 bg-clip-text text-transparent">
              已选 {selectedCount} / {totalLinks}
            </span>
          </div>
          {saving && (
            <span className="saving-indicator font-medium bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-300 dark:to-pink-300 bg-clip-text text-transparent">
              保存中…
            </span>
          )}
        </div>
      </header>

      {/* Animated Separator */}
      <div className="relative h-[2px] w-full overflow-hidden rounded-full bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-pink-500/20">
        <div className="shimmer-effect absolute inset-0" />
      </div>

      {/* Search and Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center animate-in fade-in slide-in-from-top-4 duration-500">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="搜索链接名称或URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-11 border-2 border-gray-200 dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-300 rounded-xl bg-white dark:bg-gray-900/50 shadow-sm hover:shadow-md"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="清除搜索"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Button */}
        <Button
          variant={showSelectedOnly ? "default" : "outline"}
          onClick={() => setShowSelectedOnly(!showSelectedOnly)}
          className={clsx(
            "h-11 px-4 rounded-xl border-2 font-semibold transition-all duration-300 whitespace-nowrap",
            showSelectedOnly
              ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white border-transparent shadow-md hover:shadow-lg hover:scale-105"
              : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20",
          )}
        >
          <Filter className="h-4 w-4 mr-2" />
          {showSelectedOnly ? "显示全部" : "仅已选中"}
        </Button>

        {/* Results Counter */}
        {(searchQuery || showSelectedOnly) && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 animate-in fade-in zoom-in-95 duration-300">
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
              找到 {filteredCount} 个结果
            </span>
          </div>
        )}
      </div>

      {/* Enhanced Error Message */}
      {error && (
        <div className="error-banner rounded-xl border-2 border-red-500/30 bg-gradient-to-r from-red-500/10 to-pink-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400 backdrop-blur-sm animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Loading State with Gradient Skeletons */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="loading-skeleton h-32 rounded-xl bg-gradient-to-br from-purple-100 via-blue-100 to-pink-100 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-pink-900/20 animate-pulse"
              style={{ animationDelay: `${idx * 100}ms` }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-16 animate-in fade-in zoom-in-95 duration-500">
              <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 flex items-center justify-center mb-4">
                <Search className="w-12 h-12 text-purple-400 dark:text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">未找到匹配的链接</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "尝试使用不同的搜索关键词" : "没有已选中的链接"}
              </p>
            </div>
          ) : (
            filteredGroups.map((group, groupIdx) => {
              const groupSelected = group.links.filter((link) => link.selected).length;
              const selectionPercentage = (groupSelected / group.links.length) * 100;

              return (
                <Card
                  key={group.name}
                  className="group-card overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${groupIdx * 100}ms` }}
                >
                  <CardHeader className="pb-4 bg-gradient-to-r from-purple-50/50 via-blue-50/50 to-pink-50/50 dark:from-purple-900/10 dark:via-blue-900/10 dark:to-pink-900/10">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-lg font-bold bg-gradient-to-r from-purple-700 via-blue-700 to-pink-700 dark:from-purple-400 dark:via-blue-400 dark:to-pink-400 bg-clip-text text-transparent">
                        {group.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="dynamic-badge px-3 py-1 font-semibold border-2 transition-all duration-300 hover:scale-105"
                          style={{
                            borderColor: `hsl(${280 - selectionPercentage}, 80%, 60%)`,
                            background: `linear-gradient(135deg, hsl(${280 - selectionPercentage}, 100%, 95%), hsl(${200 + selectionPercentage}, 100%, 95%))`,
                          }}
                        >
                          <span className="bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-300 dark:to-blue-300 bg-clip-text text-transparent">
                            已选 {groupSelected}/{group.links.length}
                          </span>
                        </Badge>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                      <div
                        className="progress-bar h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${selectionPercentage}%` }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {group.links.map((link, linkIdx) => (
                        <button
                          key={link.url}
                          onClick={() => toggleLink(link.url)}
                          className={clsx(
                            "link-card w-full rounded-xl border-2 p-4 text-left",
                            "transform transition-all duration-300 ease-out",
                            "hover:scale-105 hover:shadow-lg active:scale-95",
                            "animate-in fade-in zoom-in-95 duration-300",
                            link.selected
                              ? "link-card-selected border-transparent"
                              : "border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 bg-white dark:bg-gray-900/50",
                          )}
                          style={{ animationDelay: `${linkIdx * 50}ms` }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-2">
                              <p className="font-semibold leading-tight text-gray-900 dark:text-white dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                {link.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-300 break-all line-clamp-2">
                                {link.url}
                              </p>
                            </div>
                            <Badge
                              variant={link.selected ? "default" : "secondary"}
                              className={clsx(
                                "shrink-0 transition-all duration-300 font-semibold",
                                link.selected
                                  ? "bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-500 dark:to-blue-500 text-white shadow-md hover:shadow-lg"
                                  : "hover:scale-105",
                              )}
                            >
                              {link.selected ? "✓ 已选" : "未选"}
                            </Badge>
                          </div>
                          {/* Hover Indicator */}
                          <div
                            className={clsx(
                              "mt-3 h-1 w-0 rounded-full transition-all duration-300 group-hover:w-full",
                              link.selected
                                ? "bg-gradient-to-r from-purple-400 to-pink-400 dark:from-purple-300 dark:to-pink-300"
                                : "bg-gradient-to-r from-purple-500 to-blue-500 dark:from-purple-400 dark:to-blue-400",
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
      {/* Floating Export Button */}
      {selectedCount > 0 && (
        <div className="fixed bottom-8 right-8 z-50 animate-in fade-in slide-in-from-bottom-10 duration-500">
          <Button
            onClick={handleExport}
            disabled={saving}
            className={clsx(
              "h-16 px-8 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group",
              "bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 text-white font-bold text-lg border-2 border-white/20",
              "hover:shadow-[0_0_30px_rgba(147,51,234,0.5)]",
            )}
          >
            <div className="flex items-center gap-3">
              <Download
                className={clsx(
                  "h-6 w-6 transition-transform duration-300 group-hover:-translate-y-1",
                  saving && "animate-bounce",
                )}
              />
              <span>导出 ROS 脚本 ({selectedCount})</span>
            </div>
            {/* Pulse Effect Background */}
            <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </Button>
        </div>
      )}
    </div>
  );
}
