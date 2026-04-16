---
name: analyze-cli
description: 社交媒体数据分析 CLI — 搜索、导入、下载评论/媒体，并运行多步骤策略分析。
type: tool-use
---

# analyze-cli 技能

你是一个操作 `analyze-cli` 命令行工具的代理，用于社交媒体内容分析。

## 执行前检查

在执行任何 analyze-cli 工作流之前，请按顺序执行以下检查：

1. **确保 analyze-cli 已构建**
   - 检查 `dist/cli/index.js` 是否存在。
   - 如果不存在，在项目根目录运行 `npm run build`（或 `pnpm build`）。

2. **确保守护进程正在运行**
   - 运行 `analyze-cli daemon status`。
   - 如果守护进程未运行，使用 `analyze-cli daemon start` 启动它，然后等待几秒钟。
   - 守护进程启动时会执行数据库健康检查。如果它记录健康检查失败并退出，**不要**尝试删除或修改数据库文件。而是确保没有其他进程持有数据库锁，然后重新启动守护进程。

3. **使用 opencli 前先阅读 opencli 技能**
   - 在运行任何 `opencli` 命令（例如 `opencli xiaohongshu search`）之前，先阅读 opencli 技能文档以确认命令语法和可用的适配器。

4. **验证 opencli 可用性**
   - 运行 `opencli --help` 或 `opencli doctor` 确认 opencli 已安装且可正常工作。

## 功能

使用以下工具帮助用户完成数据收集和分析工作流。

### 1. search_posts
通过 OpenCLI 在平台上搜索帖子。
- 命令：`opencli xiaohongshu search {query} --limit {limit} -f json`
- 使用场景：用户想要在导入之前发现帖子。
- 输出字段（JSON）：`rank`、`title`、`author`、`likes`、`published_at`、`url`。
- **重要**：`url` 字段是**完整的小红书笔记 URL**（包含 `xsec_token`）。它应该作为 `{note_id}` 传递给后续的 `opencli xiaohongshu comments` / `download` / `note` 命令。

### 2. add_platform
如果平台不存在，则注册一个平台。
- 命令：`analyze-cli platform add --id {id} --name {name}`
- 使用场景：在导入新平台的帖子之前。

### 3. import_posts
从 JSON/JSONL 文件导入帖子，并可选择将其绑定到任务。
- 命令：`analyze-cli post import --platform {id} --file {path} [--task-id {task_id}]`
- 使用场景：搜索结果已保存到文件之后。
- 重复帖子（相同的 platform_id + platform_post_id）会更新，不会跳过。
- **格式兼容性**：`post.import` 现在会自动处理 `opencli xiaohongshu note` 的输出（当它以 `[{field, value}, ...]` 数组形式返回时）。它会将数组转换为单个帖子对象，并自动映射常见字段（`likes`→`like_count`、`collects`→`collect_count`、`comments`→`comment_count`）。你可以直接将原始的 `note` 输出保存到 `.json` 文件中，无需手动转换即可导入。

### 4. create_task
创建一个分析任务。
- 命令：`analyze-cli task create --name {name} [--cli-templates '{"fetch_comments":"...","fetch_media":"..."}']`
- 使用场景：在添加分析步骤或绑定帖子之前。
- **CLI 模板示例**（opencli 1.7.4+）：
  ```bash
  analyze-cli task create --name "XHS Analysis" \
    --cli-templates '{
      "fetch_note": "opencli xiaohongshu note {note_id} -f json",
      "fetch_comments": "opencli xiaohongshu comments {note_id} --limit 100 --with-replies false -f json",
      "fetch_media": "opencli xiaohongshu download {note_id} --output {download_dir}/xhs -f json"
    }'
  ```
  - **`fetch_note`（必填）**：获取帖子的完整详情（内容、标签、统计数据、作者信息），用于丰富导入的搜索结果数据。搜索结果仅包含摘要字段；缺少此步骤会导致分析阶段 `{{content}}` 等变量为空。此步骤**优先**执行，在获取评论/媒体之前更新数据库中的帖子记录。
  - **`fetch_comments`**（可选）：通过 opencli 获取评论数据。在 `fetch_note` 之后执行。
  - **`fetch_media`**（可选）：通过 opencli 下载媒体文件（图片/视频）。在 `fetch_comments` 之后执行。
  - `{note_id}` 将被替换为帖子 URL（来自 `posts.url` 或 `metadata.note_id`）。
  - `{download_dir}` 将被替换为项目的下载目录（默认为项目根目录下的 `tmp/downloads`）。在 `--output` 路径中始终使用 `{download_dir}` 而非硬编码路径，以便无论工作目录在哪里，下载的文件都存储在可预测的项目本地位置。

### 5. add_step_to_task
向任务添加基于策略的分析步骤。
- 命令：`analyze-cli task step add --task-id {task_id} --strategy-id {strategy_id} [--name {name}] [--order {n}]`
- 使用场景：用户想要使用特定策略（情感主题、风险检测等）分析数据。

### 6. prepare_task_data
为绑定到任务的所有帖子依次执行三项操作：（1）`fetch_note`（必填）→ （2）`fetch_comments`（可选）→ （3）`fetch_media`（可选）。
- 命令：`analyze-cli task prepare-data --task-id {task_id}`
- 使用场景：帖子已导入并绑定到任务之后。
- 此命令可恢复；中断的运行将从未完成的帖子继续。
- `prepare-data` 在 `cli_templates` 缺少 `fetch_note` 时会报错终止。`fetch_comments` 和 `fetch_media` 为可选项。

### 7. run_task_step
运行单个任务步骤。
- 命令：`analyze-cli task step run --task-id {task_id} --step-id {step_id}`
- 使用场景：用户想要执行一个特定的策略步骤。

### 8. run_all_steps
按顺序运行任务的所有待处理/失败步骤。
- 命令：`analyze-cli task run-all-steps --task-id {task_id}`
- 使用场景：用户想要在数据准备完成后启动完整的分析流程。

### 9. get_task_status
检查任务的当前状态，包括数据准备进度和每个步骤的进度。
- 命令：`analyze-cli task status --task-id {task_id}`
- 使用场景：开始分析后监控进度。
- 阅读 `phase` 字段（`dataPreparation` 或 `analysis`）和 `phases` 对象来报告进度。

### 10. get_task_results
显示已完成任务的分析结果。
- 命令：`analyze-cli task results --task-id {task_id}`
- 使用场景：任务状态显示 `completed` 之后。

### 11. reset_task_step
将失败或运行中的任务步骤重置为待处理，并重试其失败的策略队列作业。
- 命令：`analyze-cli task step reset --task-id {task_id} --step-id {step_id}`
- 使用场景：策略分析步骤失败（例如由于 API 速率限制）且用户想要安全地重试，而不直接操作数据库。

### 12. analyze_run
直接对任务运行策略（替代基于步骤的方式）。
- 命令：`analyze-cli analyze run --task-id <id> --strategy <id>`
- 使用场景：快速执行单个策略分析，无需创建正式的任务步骤。

### 13. platform_mapping_list
列出平台的字段映射（平台字段如何映射到系统字段）。
- 命令：`analyze-cli platform mapping list --platform <id> [--entity post|comment]`
- 使用场景：了解导入帖子/评论时平台特定字段如何规范化。

### 14. list_posts
列出数据库中的帖子。
- 命令：`analyze-cli post list [--platform <id>] [--limit <n>] [--offset <n>]`
- 使用场景：用户想要查看之前导入的帖子。

### 15. search_posts_db
在数据库中按关键词搜索帖子。
- 命令：`analyze-cli post search --platform <id> --query <text> [--limit <n>]`
- 使用场景：按内容/标题关键词搜索已导入的帖子。

### 16. import_comments
从 JSON/JSONL 文件导入评论并关联到帖子。
- 命令：`analyze-cli comment import --platform <id> --post-id <id> --file <path>`
- 使用场景：评论数据已获取并保存到文件后。
- 重复评论（相同 platform_comment_id）会被跳过。

### 17. list_comments
列出帖子的评论。
- 命令：`analyze-cli comment list --post-id <id> [--limit <n>]`
- 使用场景：用户想要查看关联到某帖子的评论。

### 18. add_posts_to_task
将帖子添加到任务中。
- 命令：`analyze-cli task add-posts --task-id <id> --post-ids <ids>`
- 使用场景：`import_posts`（不带 `--task-id`）之后，用户想要将帖子绑定到已有任务。

### 19. add_comments_to_task
将评论添加到任务中。
- 命令：`analyze-cli task add-comments --task-id <id> --comment-ids <ids>`
- 使用场景：用户想要分析评论而非（或除了）帖子。

### 20. start_task
为任务的待处理目标入队分析作业。
- 命令：`analyze-cli task start --task-id <id>`
- 使用场景：步骤添加完毕后用户想要开始分析。与 `run_all_steps` 不同，此命令仅为待处理目标入队，不运行策略步骤。

### 21. pause_task / resume_task / cancel_task
控制任务执行。
- 命令：`analyze-cli task pause|resume|cancel --task-id <id>`
- 使用场景：用户想要暂停、恢复或取消正在运行的任务。

### 22. list_tasks
列出所有任务，可按状态过滤。
- 命令：`analyze-cli task list [--status <status>]`
- 使用场景：用户想要查看现有任务及其状态。

### 23. list_task_steps
列出任务的所有分析步骤。
- 命令：`analyze-cli task step list --task-id <id>`
- 使用场景：运行或重置步骤前，确认其状态。

### 24. start_daemon / stop_daemon
管理守护进程。
- 命令：`analyze-cli daemon start [--fg]` / `analyze-cli daemon stop`
- 使用场景：工作流前启动守护进程，或工作流后关闭。

### 25. list_strategies
列出所有已导入的策略。
- 命令：`analyze-cli strategy list`
- 使用场景：在 `add_step_to_task` 之前确认可用的策略 ID。

### 26. show_strategy
显示特定策略的详情。
- 命令：`analyze-cli strategy show --id <id>`
- 使用场景：导入或添加步骤前查看策略参数。

### 27. strategy_result_list / stats / export
查询策略分析结果。
- 命令：
  - `analyze-cli strategy result list --task-id <id> --strategy <id> [--limit <n>]`
  - `analyze-cli strategy result stats --task-id <id> --strategy <id>`
  - `analyze-cli strategy result export --task-id <id> --strategy <id> [--format csv|json] [--output <path>]`
- 使用场景：分析完成后，检查或导出每个帖子/评论的结果。

### 28. retry_failed_queue_jobs
重试所有失败的队列作业（可选择限制到特定任务）。
- 命令：`analyze-cli queue retry [--task-id {task_id}]`
- 使用场景：分析作业失败后，用户只想重新运行失败的作业。

### 29. reset_queue_jobs
将所有非待处理的队列作业重置为待处理（可选择限制到特定任务）。
- 命令：`analyze-cli queue reset [--task-id {task_id}]`
- 使用场景：需要强制重启一批卡在 `processing`、`failed` 或 `completed` 状态的作业。
- **警告**：这是一个粗放工具；正常恢复优先使用 `queue retry`。

### 30. create_strategy
通过自然语言对话创建新的分析策略。
- 使用场景：用户要求创建/生成/构建新策略（套路/分析维度/分析模板）。
- 工作流：
  1. **澄清需求** — 最多问 2 个后续问题：
     - 目标类型：帖子还是评论？（如果是评论，警告当前仅支持帖子。）
     - 输出维度：分析应返回哪些字段？（分数、标签、建议等）
     - 媒体依赖：策略是否应自动读取帖子图片/视频？
     - 命名偏好：是否有首选的 ID 或名称？
  2. **使用以下严格规则生成策略 JSON**。JSON 必须通过 `validateStrategyJson` 验证。
  3. **在 markdown 代码块中展示 JSON** 并请用户批准或请求修改。
  4. **如有修改请求**，应用修改并重新生成 JSON，然后再次展示。
  5. **批准后**，调用 `analyze-cli strategy import --json '<generated_json>'`。
  6. **如果导入失败**（验证错误、无效 JSON 等），读取错误消息，修复 JSON，最多重试 2 次。
  7. **成功后**，运行 `analyze-cli strategy show --id <id>` 并为用户总结。

#### JSON 生成规则
生成的策略必须满足项目的 `validateStrategyJson` 和数据库模式。

**必填字段：**
- `id`：小写，仅包含 `a-z0-9_-`，例如 `monetization-v1`
- `name`：人类可读的名称
- `version`：默认为 `"1.0.0"`
- `target`：`"post"`（当前仅支持帖子）
- `needs_media`：包含 `enabled: true/false` 的对象。如果为 `true`，需包含 `media_types`、`max_media`、`mode`。
- `prompt`：必须包含 `{{content}}`。如果 `needs_media.enabled` 为 `true`，还需包含 `{{media_urls}}`。不要使用 Handlebars 条件语句或循环。

**支持的提示变量（白名单）：**
- `{{content}}` — 帖子内容（必填）
- `{{title}}` — 帖子标题
- `{{author_name}}` — 作者名称
- `{{platform}}` — 平台名称
- `{{published_at}}` — 发布时间
- `{{tags}}` — 标签 JSON 字符串
- `{{media_urls}}` — 媒体文件路径（当 `needs_media.enabled=true` 时必填）

> **不要**使用其他变量，如 `{{likes}}`、`{{collects}}`、`{{comments}}`、`{{shares}}` 等。它们在运行时不会被替换。
- `output_schema`：标准 JSON Schema，包含 `type: "object"` 和 `properties` 对象。每个属性必须有 `type`：`number`、`string`、`boolean`、`array`（尽可能带 `items.type`）或 `object`。

**提示质量**：在提示后追加输出格式提示，以便模型返回纯 JSON。例如：
```
=== 输出要求 ===
请严格按以下 JSON 格式返回结果，只输出纯 JSON，不要添加 markdown 代码块标记或额外解释：
{ ... }
```

**有效策略示例：**
```json
{
  "id": "monetization-v1",
  "name": "带货潜力分析",
  "description": "分析小红书帖子的带货潜力和模仿价值",
  "version": "1.0.0",
  "target": "post",
  "needs_media": {
    "enabled": true,
    "media_types": ["image", "video"],
    "max_media": 5,
    "mode": "all"
  },
  "prompt": "你是一个内容分析专家，请分析以下帖子的带货潜力。\n\n帖子内容：\n{{content}}\n\n作者：{{author_name}}\n平台：{{platform}}\n发布于：{{published_at}}\n\n{{media_urls}}\n\n=== 输出要求 ===\n请严格按以下 JSON 格式返回结果，只输出纯 JSON，不要添加 markdown 代码块标记或额外解释：\n{ \"monetization_score\": number, \"product_type\": string, \"recommendation\": string }",
  "output_schema": {
    "type": "object",
    "properties": {
      "monetization_score": { "type": "number" },
      "product_type": { "type": "string" },
      "recommendation": { "type": "string" }
    }
  }
}
```

#### 错误恢复
- 导入验证失败 → 读取确切错误，修复问题字段，重试导入。
- 相同版本已存在 → 询问是增加版本号还是更改 ID。
- 超过最大 2 次重试 → 展示 JSON 和错误，请用户指导修复。
- 分析作业因 429 / 速率限制失败 → 工作进程自动将它们重新加入队列并使用指数退避（最多 `max_attempts` 次）。除非所有尝试都已耗尽，否则不需要手动重试。
- 步骤或队列作业永久失败 → 使用 `task step reset`、`queue retry` 或 `queue reset` 恢复。**永远不要运行临时 `node -e` 脚本或任何其他直接数据库访问来修改队列或任务状态。**

## 工作流指导

1. 如果用户要求"分析"平台内容，从 `opencli xiaohongshu search` → `analyze-cli platform list` → `analyze-cli platform add`（如不存在）→ `analyze-cli task create` → `analyze-cli post import`（带 `--task-id`）开始。
   - **始终先使用 `analyze-cli platform list` 检查平台是否已注册**。如果平台已存在，跳过 `platform add`，避免工作流中途报"已存在"错误。
   - **注意**：`opencli xiaohongshu search` 返回摘要数据（标题、点赞数、URL）。如果策略需要完整的帖子内容（`{{content}}`），可能需要先用 `opencli xiaohongshu note {url} -f json` 丰富数据，然后再执行 `post import`。
2. 然后对每个需要的策略执行 `analyze-cli task step add`。
3. 运行 `analyze-cli task prepare-data` 通过 `task create` 中定义的 opencli 模板获取评论和媒体。
4. 运行 `analyze-cli task run-all-steps` 启动分析流程。
5. 定期轮询 `analyze-cli task status` 并报告进度：
   - phase = `dataPreparation`：报告 `commentsFetched / totalPosts` 和 `mediaFetched / totalPosts`。
   - phase = `analysis`：对每个运行中的步骤，从其 `stats` 报告 `done / total`。
   - status = `completed`：继续执行 `analyze-cli task results`。
6. 如果某个步骤或数据准备失败，报告错误并询问用户是否要重试。
   - 如果失败是由于 API 速率限制（429），工作进程会使用指数退避自动重试。只有当步骤状态在所有重试耗尽后变为 `failed` 时，你才需要介入。
   - 要安全地恢复失败的步骤，先使用 `analyze-cli task step reset --task-id <id> --step-id <id>`，然后使用 `analyze-cli task step run` 或 `analyze-cli task run-all-steps`。
   - **永远不要使用直接数据库访问**（例如运行打开 DuckDB 的 `node -e` 脚本）来修复队列或任务状态。始终使用上面列出的 CLI 命令。
