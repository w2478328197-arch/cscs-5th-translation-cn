
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const katex = require('katex');

const projectRoot = __dirname;
const mdPath = path.join(projectRoot, 'translated', 'CSCS_MASTER_FINAL_CLEAN.md');
const imagesDir = path.join(projectRoot, 'images');

let markdown = fs.readFileSync(mdPath, 'utf8');

// 1. 公式修复
markdown = markdown.replace(/\$\$([\s\S]*?)\$\$/g, (m, f) => {
    try { return `<div class="katex-display">${katex.renderToString(f.trim(), {displayMode:true, throwOnError:false})}</div>`; } catch(e) { return m; }
});
markdown = markdown.replace(/\$([^\$\n]+?)\$/g, (m, f) => {
    try { return katex.renderToString(f.trim(), {displayMode:false, throwOnError:false}); } catch(e) { return m; }
});

// 2. 暴力图片替换 (修复版：严禁任何前导空格或换行导致的缩进)
markdown = markdown.replace(/!\[(.*?)\]\((.*?)\)/g, (match, text, filename) => {
    const cleanName = path.basename(filename);
    const imgPath = path.join(imagesDir, cleanName);
    
    if (fs.existsSync(imgPath)) {
        const base64 = fs.readFileSync(imgPath).toString('base64');
        process.stdout.write(`✅ 嵌入成功: ${cleanName}\n`);
        
        // 智能判断图片大小：如果是 draw.jpeg (通常是截图)，限制最大高度
        const isDrawing = cleanName.includes('_draw');
        const imgStyle = isDrawing ? 'max-height: 400px; width: auto;' : 'max-width: 100%;';
        
        return `<div class="img-box"><img src="data:image/jpeg;base64,${base64}" style="${imgStyle}"><div class="caption">${text}</div></div>`;
    } else {
        process.stdout.write(`❌ 找不到图片: ${cleanName}\n`);
        return `<p style="color:red;">[图片缺失: ${cleanName}]</p>`;
    }
});

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
        body { font-family: 'Noto Serif SC', serif; font-size: 12pt; line-height: 1.8; color: #1a1a1a; background: #f3f4f6; padding: 40px 0; }
        .main-body { padding: 2.54cm 3cm; max-width: 210mm; margin: 0 auto; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.1); text-align: justify; }
        h1, h2, h3 { color: var(--primary-color); font-family: 'Noto Sans SC', sans-serif; }
        h1 { font-size: 2.4em; text-align: center; border-bottom: 3px solid var(--primary-color); page-break-before: always; padding-bottom: 0.3em; margin-bottom: 1em; }
        h2 { font-size: 1.8em; border-left: 8px solid var(--primary-color); padding-left: 15px; background: #f8fafc; margin-top: 1.5em; }
        h3 { font-size: 1.4em; margin-top: 1.2em; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        p { text-indent: 2em; margin-bottom: 1em; }
        .img-box { margin: 2em 0; text-align: center; break-inside: avoid; border: 1px solid #eee; padding: 15px; border-radius: 8px; background: #fafafa; text-indent: 0; }
        img { display: block; margin: 0 auto; border-radius: 4px; }
        .caption { font-size: 0.95em; color: #666; margin-top: 10px; font-weight: bold; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 2em 0; table-layout: fixed; word-wrap: break-word; }
        th { background: var(--primary-color); color: white; padding: 10px; border: 1px solid #ddd; text-align: left; }
        td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .katex-display { margin: 1.2em 0; padding: 15px; background: #f8fafc; border-radius: 6px; }
    </style>
</head>
<body>
    <div id="content" class="main-body">${htmlBody}</div>
    <script>window.rendered = true;</script>
</body>
</html>
`;

fs.writeFileSync(path.join(projectRoot, 'full_book.html'), htmlContent);
console.log('🚀 渲染引擎已根据排版偏好升级！');
