
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { PDFDocument, PDFName, PDFDict, PDFArray, PDFNumber, PDFString, PDFHexString } = require('pdf-lib');

(async () => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(300000); 
    
    const inputHtmlPath = process.env.CSCS_OUTPUT_HTML
        ? path.resolve(process.env.CSCS_OUTPUT_HTML)
        : path.join(__dirname, 'full_book.html');
    const htmlPath = 'file://' + inputHtmlPath;
    console.log('Loading full book HTML...');
    
    await page.goto(htmlPath, { waitUntil: 'load' });
    await page.waitForFunction(() => window.rendered === true, { timeout: 300000 });
    
    const tocData = await page.evaluate(() => window.tocData);
    
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    const finalPdfPath = process.env.CSCS_OUTPUT_PDF
        ? path.resolve(process.env.CSCS_OUTPUT_PDF)
        : path.join(outputDir, 'CSCS_V23_FIXED.pdf');

    console.log('Step 1: Printing high-fidelity PDF with all images...');
    // 我们直接打印到最终路径，确保图片先出来
    await page.pdf({
        path: finalPdfPath,
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div style="font-size: 8px; width: 100%; text-align: center; color: #ccc;">CSCS 第五版 - 中文重译修复版</div>',
        footerTemplate: '<div style="font-size: 8px; width: 100%; text-align: center; color: #ccc;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
        margin: { top: '60px', bottom: '60px', left: '40px', right: '40px' },
        timeout: 0
    });

    console.log('Step 2: Attempting Sidebar Outline injection...');
    try {
        const pdfBytes = fs.readFileSync(finalPdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const context = pdfDoc.context;

        const outlinesDict = context.obj({
            Type: PDFName.of('Outlines'),
            Count: PDFNumber.of(tocData.length),
        });
        const outlinesDictRef = context.register(outlinesDict);
        pdfDoc.catalog.set(PDFName.of('Outlines'), outlinesDictRef);

        const entryRefs = [];
        for (let i = 0; i < tocData.length; i++) {
            const item = tocData[i];
            const entryDict = context.obj({
                Title: PDFHexString.fromText(item.text),
                Parent: outlinesDictRef,
                Dest: PDFName.of(item.id),
            });
            entryRefs.push(context.register(entryDict));
        }

        for (let i = 0; i < entryRefs.length; i++) {
            const entry = context.lookup(entryRefs[i]);
            if (i > 0) entry.set(PDFName.of('Prev'), entryRefs[i - 1]);
            if (i < entryRefs.length - 1) entry.set(PDFName.of('Next'), entryRefs[i + 1]);
        }

        if (entryRefs.length > 0) {
            outlinesDict.set(PDFName.of('First'), entryRefs[0]);
            outlinesDict.set(PDFName.of('Last'), entryRefs[entryRefs.length - 1]);
        }

        const finalPdfBytes = await pdfDoc.save();
        fs.writeFileSync(finalPdfPath, finalPdfBytes);
        console.log('✅ 侧边栏目录注入成功！');
    } catch (e) {
        console.error('⚠️ 侧边栏注入失败，但正文 PDF 已生成:', e.message);
    }

    await browser.close();
    console.log('✅ 最终 PDF 已就绪！');
})();
