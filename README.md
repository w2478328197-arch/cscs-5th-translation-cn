
# CSCS 第五版 中文翻译工程

这是一个自动化的学术书籍翻译与精排版流水线。

## 目录结构
- `source_full/`: 原始 PDF 提取的 1876 页英文文本。
- `translated/`: 已完成的高质量中文翻译片段。
- `images/`: 统一的高清插图库（包含位图与矢量渲染图）。
- `tools/`: 审计工具 (`auditor.py`) 和 合并脚本。
- `render_master.js`: 核心 HTML 渲染引擎（含公式预处理和插图自动对齐）。
- `print_pdf.js`: 基于 Puppeteer 的 PDF 打印引擎。

## 回家后的部署步骤
1. **安装 Node.js**: 确保电脑安装了 Node.js 18+。
2. **安装依赖**:
   ```bash
   npm install
   ```
3. **统一流水线（推荐）**:
   - 全流程（合并 + 审计 + 渲染 + 打印）:
     ```bash
     npm run pipeline
     ```
   - 仅快速冒烟（小样本）:
     ```bash
     npm run smoke
     ```
4. **继续翻译新章节**:
   - 从 `source_full/` 拷贝对应页码的 txt。
   - 翻译并存入 `translated/`。
   - 在 `manifest.json` 中维护章节顺序。
   - 再次运行 `npm run pipeline`。

## 新配置入口
- 统一配置文件: `config/pipeline.json`
- 通用模板配置: `config/pipeline.template.json`
- 可配置项:
  - 输入 manifest
  - 合稿输出路径
  - PDF 输出路径
  - smoke 样本 manifest

## 复用到新项目（技术模板）
1. 拷贝本仓库骨架到新目录。
2. 复制 `config/pipeline.template.json` 为新项目的 `config/pipeline.json`。
3. 准备 `translated/`、`images/`、`manifest.json`、`manifest_smoke.json`。
4. 先运行 `npm run smoke` 验链路，再运行 `npm run pipeline`。

## 注意事项
- **公式**: 采用服务器端 KaTeX 预渲染，严禁在正文中改动 `$ ... $` 内部内容。
- **插图**: 图片名必须遵循 `page_XX_img_X.jpeg` 格式以便自动对齐。
- **去噪**: 脚本会自动过滤掉孤立的页码数字，请保持段落连贯。
