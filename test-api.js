// 简单的测试脚本，用于测试Markdown解析功能
const testMarkdown = `
# Test

| 分组A |
|-------|
| [链接1](http://example1.com) |
| [链接2](http://example2.com) |

| 分组B |
|-------|
| [链接3](http://example3.com) |
`;

function parseMarkdownTables(markdown) {
  const groups = [];

  const lines = markdown.split("\n");

  let currentGroup = null;
  let inTable = false;
  let headerProcessed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim());

      if (cells.every((cell) => /^[-:\s]+$/.test(cell))) {
        inTable = true;
        headerProcessed = true;
        continue;
      }

      if (!inTable) {
        if (cells.length > 0 && cells[0]) {
          if (currentGroup && currentGroup.links.length > 0) {
            groups.push(currentGroup);
          }

          currentGroup = {
            name: cells[0],
            links: [],
          };
        }
        inTable = false;
        headerProcessed = false;
      } else if (headerProcessed && currentGroup) {
        for (const cell of cells) {
          const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
          let match;

          while ((match = linkRegex.exec(cell)) !== null) {
            const [, name, url] = match;
            if (name && url) {
              currentGroup.links.push({
                name: name.trim(),
                url: url.trim(),
              });
            }
          }
        }
      }
    } else if (inTable && line === "") {
      inTable = false;
      headerProcessed = false;
    }
  }

  if (currentGroup && currentGroup.links.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

const result = parseMarkdownTables(testMarkdown);
console.log(JSON.stringify(result, null, 2));
