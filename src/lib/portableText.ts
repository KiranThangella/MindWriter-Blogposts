export const portableTextToHtml = (blocks: any[]): string => {
  if (!Array.isArray(blocks)) return typeof blocks === 'string' ? blocks : "";
  return blocks.map(block => {
    if (!block || typeof block !== 'object') {
       if (typeof block === 'string') return `<p>${block}</p>`;
       return "";
    }
    
    if (block._type === 'table') {
      return `<table><tbody>${(block.rows || []).map((row: any, rIndex: number) => {
        if (!row || typeof row !== 'object') return "";
        const cells = Array.isArray(row.cells) ? row.cells : [];
        return `<tr>${cells.map((cell: any) => {
           if (cell === null || cell === undefined) return "<td><p></p></td>";
           const cellContent = typeof cell === 'object' ? (cell.text || JSON.stringify(cell)) : cell;
           // Use th for first row
           const Tag = rIndex === 0 ? 'th' : 'td';
           return `<${Tag}><p>${cellContent}</p></${Tag}>`;
        }).join('')}</tr>`;
      }).join('')}</tbody></table>`;
    }
    
    if (block._type === 'image') {
      const url = block.url || block.asset?.url || '';
      if (!url) return "";
      // Only use real, per-image values here — never a generic placeholder
      // like "Article Image", since that would show as the same caption
      // under every photo on the frontend. If Sanity Studio doesn't have a
      // per-image alt/caption set, leave them out entirely so the reading
      // page's caption logic can fall back gracefully instead of showing
      // something misleading.
      const altAttr = block.alt ? ` alt="${String(block.alt).replace(/"/g, '&quot;')}"` : '';
      const captionAttr = block.caption ? ` data-caption="${String(block.caption).replace(/"/g, '&quot;')}"` : '';
      return `<img src="${url}"${altAttr}${captionAttr} />`;
    }
    
    if (block._type !== 'block' || !Array.isArray(block.children)) {
       // Fallback for non-standard blocks - try to find text anyway or return stringified
       if (typeof block.text === 'string') return `<p>${block.text}</p>`;
       if (typeof block === 'string') return `<p>${block}</p>`;
       return "";
    }

    const text = block.children.map((child: any) => {
      if (!child || typeof child !== 'object') {
         return typeof child === 'string' ? child : "";
      }
      let content = child.text || "";
      if (child.marks && Array.isArray(child.marks)) {
        if (child.marks.includes('strong')) content = `<strong>${content}</strong>`;
        if (child.marks.includes('em')) content = `<em>${content}</em>`;
        if (child.marks.includes('underline')) content = `<u>${content}</u>`;
        if (child.marks.includes('code')) content = `<code>${content}</code>`;
      }
      return content;
    }).join("");

    const isTable = text.trim().toLowerCase().includes('<table');

    if (isTable) {
       return text;
    }

    const style = (block.style || 'normal').toLowerCase();
    
    // Convert ATX Markdown headings typed in normal blocks
    if (style === 'normal') {
      const mdHeadingMatch = text.match(/^\s*(#{1,6})\s+(.+)$/);
      if (mdHeadingMatch) {
        const level = mdHeadingMatch[1].length;
        const headingText = mdHeadingMatch[2].trim();
        return `<h${level}>${headingText}</h${level}>`;
      }
    }

    if (style.startsWith('h') && style.length <= 3) {
      const level = style.replace('h', '');
      if (/^[1-6]$/.test(level)) {
        return `<h${level}>${text}</h${level}>`;
      }
    }
    if (style === 'title' || style === 'heading1') return `<h1>${text}</h1>`;
    if (style === 'subheader' || style === 'heading2') return `<h2>${text}</h2>`;
    if (style === 'blockquote') return `<blockquote>${text}</blockquote>`;
    return `<p>${text}</p>`;
  }).join("");
};
