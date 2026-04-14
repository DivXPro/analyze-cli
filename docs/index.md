# docs index

## 说明

这是 `docs/` 的总导航页，统一索引当前项目的设计、计划、产品、生成文档和参考资料。

## 推荐阅读顺序

1. `../AGENTS.md`
2. `../ARCHITECTURE.md`
3. `DESIGN.md`
4. `PLANS.md`
5. `product-specs/index.md`
6. `generated/db-schema.md`

## 顶层入口

- 设计入口：`DESIGN.md`
- 计划入口：`PLANS.md`
- 产品视角：`PRODUCT_SENSE.md`
- 质量视角：`QUALITY_SCORE.md`
- 可靠性：`RELIABILITY.md`
- 安全：`SECURITY.md`

## 分层目录

### `design-docs/`

- 设计文档索引：`design-docs/index.md`
- 核心原则：`design-docs/core-beliefs.md`
- 历史设计稿：`design-docs/2026-04-13-social-media-analysis-design.md`

### `exec-plans/`

- 活动计划：`exec-plans/active/`
- 已完成计划：`exec-plans/completed/`
- 技术债：`exec-plans/tech-debt-tracker.md`

### `generated/`

- 数据库结构摘要：`generated/db-schema.md`

### `product-specs/`

- 规格索引：`product-specs/index.md`
- CLI 产品规格：`product-specs/social-media-analysis-cli.md`

### `references/`

- 参考资料说明：`references/README.md`

## 使用约定

- 新文档先判断所属层级，再决定放到顶层还是子目录
- 设计稿、计划和产品规格不要混放
- 高价值文档更新前先核对真实实现

## Skill/Agent 生成文档规范

superpowers、skills 或 agent 自动生成的新文档，必须按以下规则存放：

| 文档类型 | 存放目录 | 说明 |
|---------|---------|------|
| 设计类文档 | `docs/design-docs/` | 架构设计、模块设计、技术方案 |
| 执行计划 | `docs/exec-plans/active/` | 实施计划、测试计划、迁移计划 |
| 产品规格 | `docs/product-specs/` | CLI 命令规格、功能规格 |
| 生成/参考类 | `docs/generated/` 或 `docs/references/` | 自动生成的 schema、参考文档 |

### 命名与生命周期

1. 文件命名：优先使用 `YYYY-MM-DD-<简短描述>.md` 格式
2. 生成文档完成后，应更新对应子目录的 `index.md`（如存在）
3. 执行计划完成后，从 `active/` 移至 `completed/`
4. 不要将新文档直接放在项目根目录或 `docs/` 顶层
