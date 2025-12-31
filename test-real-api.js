// 测试从GitHub获取真实数据
async function testRealAPI() {
  const url = 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/README.md';
  
  try {
    const response = await fetch(url);
    const markdown = await response.text();
    
    // 取前2000个字符查看内容结构
    console.log('=== Markdown前2000个字符 ===');
    console.log(markdown.substring(0, 2000));
    console.log('\n=== 解析结果 ===');
    
    const groups = parseMarkdownTables(markdown);
    console.log(JSON.stringify(groups.slice(0, 2), null, 2)); // 只显示前2个分组
    console.log(`\n总共解析出 ${groups.length} 个分组`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

function parseMarkdownTables(markdown) {
  const groups = [];
  
  const lines = markdown.split('\n');
  
  let currentGroup = null;
  let inTable = false;
  let headerProcessed = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line
        .split('|')
        .slice(1, -1)
        .map(cell => cell.trim());
      
      if (cells.every(cell => /^[-:\s]+$/.test(cell))) {
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
            links: []
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
                url: url.trim()
              });
            }
          }
        }
      }
    } else if (inTable && line === '') {
      inTable = false;
      headerProcessed = false;
    }
  }
  
  if (currentGroup && currentGroup.links.length > 0) {
    groups.push(currentGroup);
  }
  
  return groups;
}

testRealAPI();
