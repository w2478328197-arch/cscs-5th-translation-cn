
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const katex = require('katex');

const projectRoot = __dirname;
const mdPath = path.join(projectRoot, 'translated', 'CSCS_MASTER_FINAL_CLEAN.md');
const imagesDir = path.join(projectRoot, 'images');

let markdown = fs.readFileSync(mdPath, 'utf8');

// --- 1. 基础转换 (公式与图片) ---
// 这些转换在 Markdown 解析前进行，确保位置精准且不被转义

// 公式
markdown = markdown.replace(/\$\$([\s\S]*?)\$\$/g, (m, f) => {
    try { return `<div class="katex-display">${katex.renderToString(f.trim(), {displayMode:true, throwOnError:false})}</div>`; } catch(e) { return m; }
});
markdown = markdown.replace(/\$([^\$\n]+?)\$/g, (m, f) => {
    try { return katex.renderToString(f.trim(), {displayMode:false, throwOnError:false}); } catch(e) { return m; }
});

// 图片嵌入 (直接转为 HTML，防止后续解析丢图)
markdown = markdown.replace(/!\[(.*?)\]\((.*?)\)/g, (match, text, filename) => {
    const cleanName = path.basename(filename);
    const imgPath = path.join(imagesDir, cleanName);
    if (fs.existsSync(imgPath)) {
        const base64 = fs.readFileSync(imgPath).toString('base64');
        return `\n\n<div class="img-box"><img src="data:image/jpeg;base64,${base64}"><div class="caption">${text}</div></div>\n\n`;
    }
    return `\n\n<p style="color:red;">[图片缺失: ${cleanName}]</p>\n\n`;
});

// --- 2. 渲染正文 HTML ---
let htmlBody = marked.parse(markdown);

// --- 3. 后处理：为标题注入 ID 并提取目录 (TOC) ---
// 这种方式最稳健：直接处理生成的 HTML，确保 ID 与链接 100% 对应
const headings = [];
let hCount = 0;

htmlBody = htmlBody.replace(/<h([12])>(.*?)<\/h\1>/g, (match, level, text) => {
    const id = `nav-section-${++hCount}`;
    const cleanText = text.replace(/<[^>]*>/g, '').trim(); // 移除内部可能有的 HTML 标签
    headings.push({ level: parseInt(level), text: cleanText, id: id });
    return `<h${level} id="${id}">${text}</h${level}>`;
});

// --- 4. 构建封面与目录 HTML ---
const coverHtml = `
<div class="cover-page">
    <div class="cover-content">
        <h1 class="book-title">抗阻训练与体能开发要点</h1>
        <h2 class="book-edition">第五版 (Fifth Edition)</h2>
        <div class="book-status">中文翻译修复版</div>
        <div class="book-author">National Strength and Conditioning Association</div>
        <div class="cover-footer">2026年 完结版</div>
    </div>
</div>
<div style="page-break-after: always;"></div>
`;

const tocHtml = `
<div class="toc-page">
    <h1 class="toc-header">目录 (Table of Contents)</h1>
    <div class="toc-list">
        ${headings.map(h => `
            <div class="toc-item depth-${h.level}">
                <a href="#${h.id}">
                    <span class="toc-text">${h.text}</span>
                </a>
            </div>
        `).join('')}
    </div>
</div>
<div style="page-break-after: always;"></div>
`;

// --- 5. 最终 HTML 合成 ---
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&family=Noto+Sans+SC:wght@400;700&display=swap');
        :root { --primary-color: #1e3a8a; --accent-color: #d97706; }
        
        body { font-family: 'Noto Serif SC', serif; font-size: 12pt; line-height: 1.8; color: #1a1a1a; background: #f8fafc; margin: 0; padding: 0; }
        .main-body { padding: 2.54cm 3cm; max-width: 210mm; margin: 0 auto; background: white; box-shadow: 0 0 40px rgba(0,0,0,0.1); text-align: justify; }
        
        /* 封面样式 */
        .cover-page { height: 900px; display: flex; align-items: center; justify-content: center; text-align: center; }
        .cover-content { border: 12px double var(--primary-color); padding: 60px 40px; background: white; width: 80%; }
        .book-title { font-size: 4em; color: var(--primary-color); margin: 0; border: none !important; }
        .book-edition { font-size: 2em; color: #64748b; margin-top: 20px; border: none !important; background: none !important; }
        .book-status { margin-top: 100px; font-size: 1.8em; font-weight: bold; color: var(--accent-color); }
        .book-author { margin-top: 40px; color: #94a3b8; font-size: 1.2em; font-family: 'Noto Sans SC', sans-serif; }
        .cover-footer { margin-top: 150px; color: #cbd5e1; font-size: 1em; }

        /* 目录样式 */
        .toc-header { border-bottom: 3px solid var(--primary-color); padding-bottom: 10px; margin-bottom: 30px; font-family: 'Noto Sans SC', sans-serif; }
        .toc-list { display: flex; flex-direction: column; gap: 10px; }
        .toc-item a { text-decoration: none; color: #334155; display: block; border-bottom: 1px dotted #e2e8f0; padding-bottom: 4px; }
        .toc-item a:hover { color: var(--primary-color); }
        .toc-item.depth-1 { font-weight: bold; font-size: 1.2em; margin-top: 15px; color: var(--primary-color); }
        .toc-item.depth-2 { margin-left: 2em; font-size: 1em; }

        /* 正文样式 */
        h1, h2, h3 { color: var(--primary-color); font-family: 'Noto Sans SC', sans-serif; font-weight: 700; }
        h1 { font-size: 2.4em; text-align: center; border-bottom: 2px solid #eee; page-break-before: always; padding-bottom: 0.5em; margin-top: 1.5em; }
        h2 { font-size: 1.8em; border-left: 10px solid var(--primary-color); padding-left: 15px; background: #f8fafc; margin-top: 1.8em; padding-top: 8px; padding-bottom: 8px; }
        p { text-indent: 2em; margin-bottom: 1.2em; }
        
        .img-box { margin: 2.5em 0; text-align: center; break-inside: avoid; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; background: #fafafa; text-indent: 0; }
        img { max-width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 4px; }
        .caption { font-size: 0.95em; color: #64748b; margin-top: 15px; font-weight: bold; text-align: center; }
        
        table { width: 100%; border-collapse: collapse; margin: 2em 0; }
        th { background: var(--primary-color); color: white; padding: 12px; border: 1px solid #cbd5e1; }
        td { border: 1px solid #e2e8f0; padding: 10px; }
        tr:nth-child(even) { background-color: #f8fafc; }
        .katex-display { margin: 1.5em 0; padding: 15px; background: #f8fafc; border-radius: 8px; }
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
console.log('🚀 封面、稳定跳转目录、全书插图已全部修复！');
