
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const katex = require('katex');

const projectRoot = __dirname;
const mdPath = path.join(projectRoot, 'translated', 'CSCS_MASTER_FINAL_CLEAN.md');
const imagesDir = path.join(projectRoot, 'images');

let markdown = fs.readFileSync(mdPath, 'utf8');

// --- 1. 封面配置 ---
const coverHtml = `
<div class="cover-page" style="page-break-after: always; text-align: center; padding: 150px 0; border: 20px solid #1e3a8a; margin: 20px; background: white;">
    <h1 style="font-size: 4.5em; color: #1e3a8a; margin: 0; border: none; line-height: 1.2;">抗阻训练与<br>体能开发要点</h1>
    <h2 style="font-size: 2.2em; color: #666; margin-top: 30px; border: none; background: none;">第五版 (Fifth Edition)</h2>
    <div style="margin-top: 120px; font-size: 1.8em; font-weight: bold; color: #d97706;">中文翻译修复版</div>
    <div style="margin-top: 80px; color: #94a3b8; font-size: 1.1em;">National Strength and Conditioning Association (NSCA)</div>
    <div style="margin-top: 200px; color: #ccc;">2026年 完结版</div>
</div>
`;

// --- 2. 手动处理：标题 ID 与 目录生成 (彻底解决跳转失败) ---
const headings = [];
const headerMap = {};

function slugify(text) {
    let id = text.toString().toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
        .replace(/^-+|-+$/g, '');
    if (!id) id = 'section';
    if (headerMap[id] !== undefined) {
        headerMap[id]++;
        return `${id}-${headerMap[id]}`;
    }
    headerMap[id] = 0;
    return id;
}

// 采用正则直接替换正文标题，确保 ID 绝对统一
markdown = markdown.replace(/^(#{1,2})\s+(.+)$/gm, (match, hashes, text) => {
    const level = hashes.length;
    const cleanText = text.replace(/<[^>]*>/g, '').trim(); // 移除可能存在的 HTML
    const id = slugify(cleanText);
    headings.push({ level, text: cleanText, id });
    return `<h${level} id="${id}">${text}</h${level}>`;
});

const tocHtml = `
<div class="toc-page" style="page-break-after: always;">
    <h1 style="border-bottom: 3px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 30px;">目录 (Contents)</h1>
    <div class="toc-list">
        ${headings.map(h => `
            <div class="toc-item depth-${h.level}">
                <a href="#${h.id}">${h.text}</a>
            </div>
        `).join('')}
    </div>
</div>
`;

// --- 3. 手动处理：公式 (KaTeX) ---
markdown = markdown.replace(/\$\$([\s\S]*?)\$\$/g, (m, f) => {
    try { return `<div class="katex-display">${katex.renderToString(f.trim(), {displayMode:true, throwOnError:false})}</div>`; } catch(e) { return m; }
});
markdown = markdown.replace(/\$([^\$\n]+?)\$/g, (m, f) => {
    try { return katex.renderToString(f.trim(), {displayMode:false, throwOnError:false}); } catch(e) { return m; }
});

// --- 4. 手动处理：图片嵌入 (彻底解决图片丢失) ---
markdown = markdown.replace(/!\[(.*?)\]\((.*?)\)/g, (match, text, filename) => {
    const cleanName = path.basename(filename);
    const imgPath = path.join(imagesDir, cleanName);
    
    if (fs.existsSync(imgPath)) {
        const base64 = fs.readFileSync(imgPath).toString('base64');
        process.stdout.write(`✅ 成功嵌入图片: ${cleanName}\n`);
        return `<div class="img-box"><img src="data:image/jpeg;base64,${base64}"><div class="caption">${text}</div></div>`;
    } else {
        process.stdout.write(`❌ 图片文件不存在: ${cleanName}\n`);
        return `<p style="color:red;">[图片缺失: ${cleanName}]</p>`;
    }
});

// --- 5. 最终渲染 ---
// 此时正文中的 H1, H2, 图片, 公式 已经是 HTML 了，marked 会处理剩余的 P, UL, TABLE
const htmlBody = marked.parse(markdown);

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
        
        /* 目录样式 */
        .toc-list { display: flex; flex-direction: column; gap: 8px; }
        .toc-item a { text-decoration: none; color: #334155; transition: color 0.2s; }
        .toc-item a:hover { color: var(--primary-color); text-decoration: underline; }
        .toc-item.depth-1 { font-weight: 700; font-size: 1.2em; margin-top: 12px; color: var(--primary-color); border-bottom: 1px solid #e2e8f0; }
        .toc-item.depth-2 { margin-left: 2em; font-size: 0.95em; color: #475569; }

        h1, h2, h3 { color: var(--primary-color); font-family: 'Noto Sans SC', sans-serif; font-weight: 700; }
        h1 { font-size: 2.4em; text-align: center; border-bottom: 3px solid var(--primary-color); page-break-before: always; padding-bottom: 0.5em; margin-bottom: 1em; }
        h2 { font-size: 1.8em; border-left: 10px solid var(--primary-color); padding-left: 15px; background: #f8fafc; margin-top: 1.5em; padding-top: 5px; padding-bottom: 5px; }
        p { text-indent: 2em; margin-bottom: 1em; }
        .img-box { margin: 2.5em 0; text-align: center; break-inside: avoid; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; background: #fafafa; text-indent: 0; }
        img { max-width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 4px; }
        .caption { font-size: 0.9em; color: #64748b; margin-top: 10px; font-weight: bold; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 2em 0; }
        th { background: var(--primary-color); color: white; padding: 10px; border: 1px solid #ddd; }
        td { border: 1px solid #ddd; padding: 8px; }
        tr:nth-child(even) { background-color: #f9fafb; }
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
console.log('🚀 封面、目录跳转、全书插图已通过“直接注入”模式完美修复！');
