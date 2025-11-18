# SiYuan 代码行高亮插件

使用简洁的注释语法在 SiYuan 代码块中高亮特定的代码行，支持多种颜色。

## 使用方法

在代码块的**第一行**添加注释：

```javascript
// hl:1,3-5
const foo = "第1行 - 黄色高亮";
const bar = "第2行 - 正常";
const baz = "第3行 - 黄色高亮";
const qux = "第4行 - 黄色高亮";
const test = "第5行 - 黄色高亮";
```

### 多色高亮语法

- `hl:` (默认) — 黄色
- `hlr:` — 红色
- `hlg:` — 绿色
- `hlb:` — 蓝色

使用 `;` 组合多种颜色：

```javascript
// hlr:1;hlg:3;hlb:5-7
const error = "第1行 - 红色";
const normal = "第2行 - 正常";
const success = "第3行 - 绿色";
const info = "第4行 - 正常";
const note1 = "第5行 - 蓝色";
const note2 = "第6行 - 蓝色";
const note3 = "第7行 - 蓝色";
```

### 支持的注释语法

- `// ...` (JavaScript, TypeScript, C++, Java 等)
- `# ...` (Python, Ruby, Bash 等)
- `<!-- ... -->` (HTML, XML)
- `/* ... */` (CSS, C 等)

## 功能特性

- ✅ 非侵入式覆盖层（不会保存到笔记内容）
- ✅ 多色支持（黄色、红色、绿色、蓝色）
- ✅ 响应式（窗口大小改变和代码编辑时自动更新）
- ✅ 与 SiYuan 原生语法高亮兼容

## 安装方式

### 从市场安装（推荐）

1. 打开 SiYuan → 设置 → 市场 → 插件
2. 搜索"代码行高亮"
3. 点击安装

### 手动安装

1. 从 [Releases](https://github.com/langfeld/code-line-highlighter/releases) 下载 `package.zip`
2. 解压到 `{SiYuan}/data/plugins/code-line-highlighter`
3. 重启 SiYuan

### 从源代码构建

```bash
npm install
npm run build
# package.zip 将在项目根目录下生成
```

## 更新日志（最近版本）

- v2.1.4 — 防止打开笔记时出现重复的覆盖层
- v2.1.3 — 改进覆盖层缺失时的重新渲染检测
- v2.1.2 — 为代码编辑检测添加输入监听器

## 许可证

MIT
