
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const katex = require('katex');

const projectRoot = __dirname;
const mdPath = path.join(projectRoot, 'translated', 'CSCS_MASTER_FINAL_CLEAN.md');
const imagesDir = path.join(projectRoot, 'images');

let markdown = fs.readFileSync(mdPath, 'utf8');

const headerMap = {};
function getSafeId(text) {
    if (!text) return 'id-' + Math.random().toString(36).substr(2, 5);
    let id = text.toString().toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
        .replace(/^-+|-+$/g, '');
    if (headerMap[id]) {
        headerMap[id]++;
        return `${id}-${headerMap[id]}`;
    }
    headerMap[id] = 1;
    return id || 'section';
}

const lines = markdown.split('\n');
const headings = [];
lines.forEach(line => {
    const match = line.match(/^(#{1,2})\s+(.+)$/);
    if (match) {
        const depth = match[1].length;
        const text = match[2].trim();
        const id = getSafeId(text);
        headings.push({ depth, text, id });
    }
});

Object.keys(headerMap).forEach(key => headerMap[key] = 0);

const renderer = new marked.Renderer();
renderer.heading = function(token) {
    const text = token.text || "";
    const depth = token.depth;
    const id = getSafeId(text);
    return `<h${depth} id="${id}">${text}</h${depth}>`;
};

renderer.image = function(token) {
    const href = token.href;
    const text = token.text || "";
    if (!href) return '';
    
    const cleanName = path.basename(href);
    const imgPath = path.join(imagesDir, cleanName);
    if (fs.existsSync(imgPath)) {
        const base64 = fs.readFileSync(imgPath).toString('base64');
        return `<div class="img-box"><img src="data:image/jpeg;base64,${base64}"><div class="caption">${text}</div></div>`;
    }
    return `<p style="color:red;">[图片缺失: ${cleanName}]</p>`;
};

marked.use({ renderer });

markdown = markdown.replace(/\$\$([\s\S]*?)\$\$/g, (m, f) => {
    try { return `<div class="katex-display">${katex.renderToString(f.trim(), {displayMode:true, throwOnError:false})}</div>`; } catch(e) { return m; }
});
markdown = markdown.replace(/\$([^\$\n]+?)\$/g, (m, f) => {
    try { return katex.renderToString(f.trim(), {displayMode:false, throwOnError:false}); } catch(e) { return m; }
});

const htmlBody = marked.parse(markdown);

const coverHtml = `
<div class="cover-page" style="page-break-after: always; text-align: center; padding: 150px 0;">
    <div style="border: 15px solid #1e3a8a; padding: 60px; display: inline-block; background: white;">
        <h1 style="font-size: 4.5em; color: #1e3a8a; margin: 0; border: none; line-height: 1.2;">抗阻训练与<br>体能开发要点</h1>
        <h2 style="font-size: 2.2em; color: #666; margin-top: 30px; border: none; background: none;">第五版 (Fifth Edition)</h2>
        <div style="margin-top: 120px; font-size: 1.8em; font-weight: bold; color: #d97706;">中文翻译修复版</div>
        <div style="margin-top: 60px; color: #94a3b8; font-size: 1.1em;">National Strength and Conditioning Association (NSCA)</div>
    </div>
</div>
`;

const tocHtml = `
<div class="toc-page" style="page-break-after: always;">
    <h1 style="border-bottom: 3px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 40px;">目录 (Contents)</h1>
    <div class="toc-list">
        ${headings.map(h => `<div class="toc-item depth-${h.depth}"><a href="#${h.id}">${h.text}</a></div>`).join('')}
    </div>
</div>
`;

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&family=Noto+Sans+SC:wght@400;700&display=swap');
        :root { --primary-color: #1e3a8a; }
        body { font-family: 'Noto Serif SC', serif; font-size: 12pt; line-height: 1.8; color: #1a1a1a; background: #f1f5f9; margin: 0; padding: 0; }
        .main-body { padding: 2.54cm 3cm; max-width: 210mm; margin: 0 auto; background: white; box-shadow: 0 0 30px rgba(0,0,0,0.15); text-align: justify; }
        .toc-list { display: flex; flex-direction: column; gap: 12px; }
        .toc-item a { text-decoration: none; color: #334155; font-size: 1.1em; transition: color 0.2s; }
        .toc-item a:hover { color: var(--primary-color); text-decoration: underline; }
        .toc-item.depth-1 { font-weight: 700; font-size: 1.25em; margin-top: 15px; color: var(--primary-color); border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
        .toc-item.depth-2 { margin-left: 2.5em; font-size: 1em; color: #475569; position: relative; }
        .toc-item.depth-2::before { content: "•"; position: absolute; left: -1.2em; color: #cbd5e1; }
        h1, h2, h3 { color: var(--primary-color); font-family: 'Noto Sans SC', sans-serif; }
        h1 { font-size: 2.4em; text-align: center; border-bottom: 3px solid var(--primary-color); page-break-before: always; padding-bottom: 0.5em; margin-bottom: 1.2em; }
        h2 { font-size: 1.8em; border-left: 10px solid var(--primary-color); padding-left: 15px; background: #f8fafc; margin-top: 1.8em; }
        p { text-indent: 2em; margin-bottom: 1.2em; }
        .img-box { margin: 2.5em 0; text-align: center; break-inside: avoid; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; background: #f8fafc; text-indent: 0; }
        img { max-width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 4px; }
        .caption { font-size: 0.95em; color: #64748b; margin-top: 15px; font-weight: bold; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 2.5em 0; table-layout: fixed; }
        th { background: var(--primary-color); color: white; padding: 12px; border: 1px solid #cbd5e1; }
        td { border: 1px solid #e2e8f0; padding: 10px; }
        tr:nth-child(even) { background-color: #f8fafc; }
    </style>
</head>
<body>
    <div id="content" class="main-body">
        ${coverHtml}
        ${tocHtml}
        ${htmlBody}
    </div>
    <script>window.rendered = true;</script>
</body>
</html>
`;

fs.writeFileSync(path.join(projectRoot, 'full_book.html'), htmlContent);
console.log('🚀 封面、精排目录与锚点跳转已全部修复并集成！');
