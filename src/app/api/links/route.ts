import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

const README_URL = 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/README.md';
const CACHE_PATH = path.join('/tmp', 'clash-readme-cache.md');
const SELECTION_PATH = path.join('/tmp', 'clash-selected-links.json');

interface Link {
  name: string;
  url: string;
  selected?: boolean;
}

interface Group {
  name: string;
  links: Link[];
}


/**
 * 根据 name+url 去重，保留第一次出现的项
 */
function dedupeLinks(links: Link[]): Link[] {
  const seen = new Set<string>();
  const result: Link[] = [];
  for (const item of links) {
    const key = `${item.name}||${item.url}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}


// Markdown表格解析函数
function parseMarkdownTables(markdown: string): Group[] {
  const groups: Group[] = [];
  
  // 按行分割Markdown内容
  const lines = markdown.split('\n');
  
  let currentGroup: Group | null = null;
  let inTable = false;
  let headerProcessed = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 检测表格行（以 | 开始和结束）
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line
        .split('|')
        .slice(1, -1) // 去掉首尾空元素
        .map(cell => cell.trim());
      
      // 检查是否是分隔行（例如: |---|---|）
      if (cells.every(cell => /^[-:\s]+$/.test(cell))) {
        inTable = true;
        headerProcessed = true;
        continue;
      }
      
      if (!inTable) {
        // 这是表格的第一行（标题行）
        if (cells.length > 0 && cells[0]) {
          // 保存之前的组
          if (currentGroup && currentGroup.links.length > 0) {
            groups.push(currentGroup);
          }
          
          // 创建新组，使用第一个单元格作为组名
          currentGroup = {
            name: cells[0],
            links: []
          };
        }
        inTable = false;
        headerProcessed = false;
      } else if (headerProcessed && currentGroup) {
        // 处理数据行
        // 从每个单元格中提取链接
        for (const cell of cells) {
          // 匹配Markdown链接格式: [名称](URL)
          const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
          let match;
          
          while ((match = linkRegex.exec(cell)) !== null) {
            const [, name, url] = match;
            if (name && url) {
              currentGroup.links.push({
                name: name.trim(),
                url: url.trim()
              });
            }
          }
        }
      }
    } else if (inTable && line === '') {
      // 空行表示表格结束
      inTable = false;
      headerProcessed = false;
    }
  }
  
  // 保存最后一个组
  if (currentGroup && currentGroup.links.length > 0) {
    groups.push(currentGroup);
  }
  
  return groups;
}

async function readCachedMarkdown() {
  try {
    return await fs.readFile(CACHE_PATH, 'utf-8');
  } catch (error) {
    return null;
  }
}

async function writeCachedMarkdown(markdown: string) {
  try {
    await fs.writeFile(CACHE_PATH, markdown, 'utf-8');
  } catch (error) {
    console.error('Failed to write cache file', error);
  }
}

async function readSelectedLinks(): Promise<Set<string>> {
  try {
    const raw = await fs.readFile(SELECTION_PATH, 'utf-8');
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((item) => typeof item === 'string'));
    }

    if (Array.isArray(parsed?.selected)) {
      return new Set(parsed.selected.filter((item: unknown) => typeof item === 'string'));
    }
  } catch (error) {
    // ignore
  }

  return new Set();
}

export async function GET() {
  let markdown: string | null = null;
  const selected = await readSelectedLinks();

  try {
    const response = await fetch(README_URL, {
      next: { revalidate: 3600 } // 缓存1小时
    });
    
    if (!response.ok) {
      console.error('Failed to fetch markdown, status:', response.status);
    } else {
      markdown = await response.text();
      await writeCachedMarkdown(markdown);
    }
    
  } catch (error) {
    console.error('Error fetching markdown:', error);
  }

  if (!markdown) {
    markdown = await readCachedMarkdown();
  }

  if (!markdown) {
    return NextResponse.json(
      { error: '无法获取Markdown文件且本地缓存不可用' },
      { status: 500 }
    );
  }

  // 解析Markdown表格
  const groups = parseMarkdownTables(markdown).map((group) => ({
    ...group,
    links: dedupeLinks(group.links).map((link) => ({
      ...link,
      selected: selected.has(link.url),
    })),
  }));

  return NextResponse.json(groups);
}
