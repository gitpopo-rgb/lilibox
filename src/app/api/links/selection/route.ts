import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

const SELECTION_PATH = path.join('/tmp', 'clash-selected-links.json');

async function writeSelectedLinks(urls: string[]) {
  await fs.writeFile(SELECTION_PATH, JSON.stringify(urls, null, 2), 'utf-8');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const urls = Array.isArray(body?.urls)
      ? body.urls
      : Array.isArray(body?.selectedUrls)
        ? body.selectedUrls
        : Array.isArray(body?.selected)
          ? body.selected
          : null;

    if (!urls) {
      return NextResponse.json(
        { error: '请求体需要包含 urls 数组' },
        { status: 400 }
      );
    }

    const sanitized = urls.filter((item) => typeof item === 'string');
    await writeSelectedLinks(sanitized);

    return NextResponse.json({ ok: true, count: sanitized.length });
  } catch (error) {
    console.error('Error saving selected links:', error);
    return NextResponse.json(
      { error: '保存选中链接失败' },
      { status: 500 }
    );
  }
}
