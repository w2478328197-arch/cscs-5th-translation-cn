
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const katex = require('katex');
const cheerio = require('cheerio');

const projectRoot = __dirname;
const mdPath = path.join(projectRoot, 'translated', 'CSCS_MASTER_FINAL_CLEAN.md');
const imagesDir = path.join(projectRoot, 'images');

let markdown = fs.readFileSync(mdPath, 'utf8');

// 1. 基础预处理 (轻量正则)
markdown = markdown.replace(/\$\$([\s\S]*?)\$\$/g, (m, f) => {
    try { return `<div class="katex-display">${katex.renderToString(f.trim(), {displayMode:true, throwOnError:false})}</div>`; } catch(e) { return m; }
});
markdown = markdown.replace(/\$([^\$\n]+?)\$/g, (m, f) => {
    try { return katex.renderToString(f.trim(), {displayMode:false, throwOnError:false}); } catch(e) { return m; }
});

// 图片处理：先占位，解析完 HTML 后再由 Cheerio 处理（节省内存）
const imageQueue = [];
markdown = markdown.replace(/!\[(.*?)\]\((.*?)\)/g, (match, text, filename) => {
    const cleanName = path.basename(filename);
    const placeholder = `__IMG_PLACEHOLDER_${imageQueue.length}__`;
    imageQueue.push({ placeholder, cleanName, text });
    return `\n\n${placeholder}\n\n`;
});

// 2. 渲染核心正文 (初步转为 HTML)
console.log('Rendering Markdown to HTML...');
let rawBodyHtml = marked.parse(markdown);

// 3. 使用 Cheerio 分块注入 (节省内存的关键)
console.log('Processing DOM with Cheerio...');
const $ = cheerio.load(rawBodyHtml);
const toc = [];
const headerIds = new Set();

// 注入 ID 并收集 TOC
$('h1, h2').each((i, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    let id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '');
    if (!id || headerIds.has(id)) id = `nav-section-${i+1}`;
    headerIds.add(id);
    $el.attr('id', id);
    toc.push({ level: el.name === 'h1' ? 1 : 2, text, id });
});

// 恢复图片 (Base64 注入)
console.log('Embedding Base64 images...');
imageQueue.forEach(img => {
    const imgPath = path.join(imagesDir, img.cleanName);
    if (fs.existsSync(imgPath)) {
        const base64 = fs.readFileSync(imgPath).toString('base64');
        const imgHtml = `<div class="img-box"><img src="data:image/jpeg;base64,${base64}"><div class="caption">${img.text}</div></div>`;
        // 简单替换占位符文本，避开 Cheerio 处理巨型 Base64
    }
});

// 导出正文 HTML
let bodyHtml = $.html();

// 再次通过字符串替换恢复图片，避免 Cheerio 解析巨型字符串
imageQueue.forEach(img => {
    const imgPath = path.join(imagesDir, img.cleanName);
    if (fs.existsSync(imgPath)) {
        const base64 = fs.readFileSync(imgPath).toString('base64');
        const imgHtml = `<div class="img-box"><img src="data:image/jpeg;base64,${base64}"><div class="caption">${img.text}</div></div>`;
        bodyHtml = bodyHtml.replace(img.placeholder, imgHtml);
    } else {
        bodyHtml = bodyHtml.replace(img.placeholder, `<p style="color:red;">[图片缺失: ${img.cleanName}]</p>`);
    }
});

// 4. 构建封面与目录
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
        ${toc.map(h => `
            <div class="toc-item depth-${h.level}">
                <a href="#${h.id}">${h.text}</a>
            </div>
        `).join('')}
    </div>
</div>
<div style="page-break-after: always;"></div>
`;

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
        .cover-page { height: 950px; display: flex; align-items: center; justify-content: center; text-align: center; }
        .cover-content { border: 12px double var(--primary-color); padding: 60px 40px; background: white; width: 85%; }
        .book-title { font-size: 4em; color: var(--primary-color); margin: 0; border: none; }
        .book-edition { font-size: 2em; color: #64748b; margin-top: 20px; border: none; background: none; }
        .book-status { margin-top: 100px; font-size: 1.8em; font-weight: bold; color: var(--accent-color); }
        .toc-header { border-bottom: 3px solid var(--primary-color); padding-bottom: 10px; margin-bottom: 30px; }
        .toc-list { display: flex; flex-direction: column; gap: 8px; }
        .toc-item a { text-decoration: none; color: #334155; display: block; border-bottom: 1px dotted #e2e8f0; }
        .toc-item.depth-1 { font-weight: bold; font-size: 1.2em; margin-top: 12px; color: var(--primary-color); }
        .toc-item.depth-2 { margin-left: 2em; font-size: 1em; }
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
    </style>
</head>
<body>
    <div id="content" class="main-body">
        ${coverHtml}
        ${tocHtml}
        ${bodyHtml}
    </div>
    <script>window.rendered = true;</script>
</body>
</html>
`;

fs.writeFileSync(path.join(projectRoot, 'full_book.html'), htmlContent);
console.log('🚀 优化版渲染完成：内存压力已释放，目录与图片同步就绪！');
