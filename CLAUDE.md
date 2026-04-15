AGENTS.md

## 文档生成规则

当使用 superpowers 技能（如 `superpowers:writing-plans`、`superpowers:brainstorming`）生成计划或设计文档时，必须覆盖其默认保存路径，按以下项目规则存放：

| 文档类型 | 正确存放目录 | 说明 |
|---------|-------------|------|
| 执行计划 | `docs/exec-plans/active/` | 实施计划、测试计划、迁移计划 |
| 设计文档 | `docs/design-docs/` | 架构设计、模块设计、技术方案 |

### 生成后必须执行的操作

1. **移动文件**：将 `docs/superpowers/plans/` 下的新文件移到 `docs/exec-plans/active/`
2. **移动设计稿**：将 `docs/superpowers/specs/` 下的新文件移到 `docs/design-docs/`
3. **更新索引**：
   - 执行计划更新 `docs/PLANS.md`
   - 设计文档更新 `docs/design-docs/index.md`
4. **清理空目录**：删除 `docs/superpowers/` 下因此变空的子目录
5. **提交变更**：将移动和索引更新一起提交

### 命名规范

文件命名统一使用 `YYYY-MM-DD-<简短描述>.md` 格式。

### 状态流转

- 计划完成后，从 `docs/exec-plans/active/` 移至 `docs/exec-plans/completed/`
- 同步更新 `docs/PLANS.md` 中的状态索引
