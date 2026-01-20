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
# SiYuan 代码行高亮 插件

在 SiYuan 的代码块中通过直观的右键菜单或注释语法高亮指定代码行，支持多种颜色与可配置颜色设置。

## 使用方法

### 方法一：右键菜单（v3.0.0 新增）

在代码块内对任意一行右击（或选中多行）即可：
- 以你选择的颜色（黄色、红色、绿色、蓝色 + 3种自定义颜色）高亮单行或多行
- 移除已选中行的高亮

多行选择：选中例如第 3–10 行并右键，可一次性高亮全部选中行。

推荐使用此方法，因为它：
- 将高亮存储为区块属性（不会改动代码）
- 适用于任意编程语言
- 提供可视化的用户界面
- 支持多行选择

### 方法二：注释语法（遗留支持）

在代码块的**第一行**添加注释说明：

```javascript
// hl:1,3-5
const foo = "line 1 - highlighted yellow";
const bar = "line 2 - normal";
const baz = "line 3 - highlighted yellow";
const qux = "line 4 - highlighted yellow";
const test = "line 5 - highlighted yellow";
```

#### 多色语法

- `hl:`（默认）— 黄色
- `hlr:` — 红色
- `hlg:` — 绿色
- `hlb:` — 蓝色

用 `;` 组合多种颜色：

```javascript
// hlr:1;hlg:3;hlb:5-7
const error = "line 1 - red";
const normal = "line 2 - normal";
const success = "line 3 - green";
const info = "line 4 - normal";
const note1 = "line 5 - blue";
const note2 = "line 6 - blue";
const note3 = "line 7 - blue";
```

#### 新的数字语法 (v3.0.0+)

您也可以使用数字 `1-7` 代替字母：

- `hl1`...`hl4`: 标准颜色（黄、红、绿、蓝）
- `hl5`...`hl7`: **自定义颜色**（在设置中定义）

示例：
```javascript
// hl5:1-3;hl2:10
```

#### 支持的注释语法

- `// ...`（JavaScript、TypeScript、C++、Java 等）
- `# ...`（Python、Ruby、Bash 等）
- `<!-- ... -->`（HTML、XML）
- `/* ... */`（CSS、C）

## 特性

- ✅ 右键菜单集成 — 通过右键高亮/取消高亮
- ✅ **快速访问** — 设置默认颜色以便一键高亮
- ✅ 多行选择 — 选中并一次性高亮多行（例如第 3–10 行）
- ✅ **7种颜色槽位** — 4种标准 + 3种自定义颜色
- ✅ 可自定义颜色 — 在设置中修改颜色（背景、边框、不透明度）
- ✅ **自定义标签** — 重命名颜色（例如将“红色”改为“错误”）
- ✅ **切换可见性** — 隐藏不使用的颜色
- ✅ 以区块属性存储 — 高亮不会写入代码内容
- ✅ 非侵入性覆盖层（不保存到笔记内容）
- ✅ 多色支持（黄、红、绿、蓝）
- ✅ 响应窗口大小变化与代码编辑
- ✅ 与 SiYuan 的原生日语法高亮兼容
- ✅ 向后兼容注释语法

## 自定义

打开插件设置以自定义高亮颜色：
1. 设置 → 插件 → Code Line Highlighter → Settings
2. 自定义每种颜色（黄、红、绿、蓝、自定义1-3）：
	- **默认**：选择哪个颜色显示在菜单顶部
	- **可见性**：在菜单中显示/隐藏颜色
	- **标签**：重命名颜色（例如“重要”代替“红色”）
	- **外观**：完全控制背景、边框和不透明度
3. 使用单项重置或“全部颜色恢复默认”按钮
4. 修改会立即应用到所有高亮的代码块

## 安装

### 从市场安装（推荐）

1. 打开 SiYuan → 设置 → Marketplace → Plugins
2. 搜索 “Code Line Highlighter”
3. 点击安装

### 手动安装

1. 从 Releases 下载 `package.zip`: https://github.com/langfeld/code-line-highlighter/releases
2. 解压到 `{SiYuan}/data/plugins/code-line-highlighter`
3. 重启 SiYuan

### 从源码构建

```bash
npm install
npm run build
# package.zip 将在项目根目录生成
```

## 更新日志（近期）

- v3.1.0 — 自定义高亮颜色及更多改进
- v3.0.0 — 重大更新：右键菜单、多行选择、颜色自定义、区块属性存储
- v2.1.4 — 防止打开笔记时产生重复覆盖层
- v2.1.3 — 当覆盖层缺失时改进重渲染检测
- v2.1.2 — 为代码编辑检测添加输入监听器

## 许可

MIT
