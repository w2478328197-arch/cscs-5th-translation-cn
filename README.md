# 学术书籍自动翻译与精排版流水线 (Academic Book Translation Pipeline)

这是一个自动化的学术书籍翻译与精排版流水线模板，原本为特定书籍设计，现已抽象为通用的工作流模板，可以复用于任何学术书籍或大型文档的翻译排版工作。

## 核心功能
- **自动对齐**：通过规则自动将原书插图插入翻译后的 Markdown 对应位置。
- **公式预渲染**：使用 KaTeX 在服务端预渲染数学公式，确保 PDF 打印时不跑版。
- **缺失审计**：通过脚本 (`auditor.py`) 自动比对翻译文本与原始 PDF，检查是否漏页或漏翻。
- **一键排版**：基于 Puppeteer 将 Markdown 直接渲染并打印为高质量的 PDF。

## 目录结构
- `source_full/`: 存放原始 PDF 提取的英文文本（推荐每页一个 txt 文件，如 `page_1.txt`）。
- `translated/`: 存放已完成的高质量中文翻译片段（Markdown 格式，文件名任意，由 manifest 控制）。
- `images/`: 存放统一的高清插图库。图片命名须遵循 `page_XX_img_X.jpeg` 格式（如 `page_102_img_0.jpeg`），以便排版引擎自动识别并对齐。
- `tools/`: 核心审计工具与合并脚本。
- `config/`: 流水线配置文件目录。

## 核心脚本介绍
- `master_process.py`: 流水线的主入口，负责调度合并与渲染。
- `render_master.js`: 核心 HTML 渲染引擎，负责解析 Markdown、注入 CSS、并挂载本地插图。
- `print_pdf.js`: 调用 Chrome/Puppeteer 读取生成的 HTML 并输出最终 PDF 文件。

## 快速部署
1. **环境准备**:
   确保电脑安装了 Node.js 18+ 和 Python 3.9+。
2. **安装依赖**:
   ```bash
   npm install
   ```

## 如何迁移至新项目
1. **配置内容清单**: 
   在 `manifest.json` 中按顺序填入你位于 `translated/` 下的各个 Markdown 章节文件名。
2. **配置输出路径**:
   修改 `config/pipeline.json`，定义你的输入清单文件和输出的 PDF 文件名。
3. **运行测试链路 (Smoke Test)**:
   使用少数几个文件配置 `manifest_smoke.json`，然后运行：
   ```bash
   npm run smoke
   ```
4. **全量生产**:
   确认排版和图片无误后，运行完整流程：
   ```bash
   npm run pipeline
   ```

## 环境变量覆盖
如果你不想修改配置文件，你也可以直接在终端注入环境变量来覆盖默认路径：
- `BOOK_INPUT_MD`: 最终合并好的超大 Markdown 文件的绝对路径。
- `BOOK_OUTPUT_HTML`: 渲染生成的中间 HTML 文件路径。
- `BOOK_OUTPUT_PDF`: 最终导出的 PDF 文件路径。

## 注意事项
- **公式**: 严禁在正文中改动 `$ ... $` 内部内容，保持 LaTeX 语法正确。
- **去噪**: 脚本会自动过滤掉孤立的页码数字，请保持段落连贯。
