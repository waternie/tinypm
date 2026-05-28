# TinyPM Demo

TinyPM is easiest to understand as an AI-native project review loop.

## Demo Goal

Show how a small team can turn structured project data into AI-assisted project review output.

```text
Project + plan + requirements + issues
  -> TinyPM project data MCP
  -> AI assistant workspace
  -> review, risks, weekly summary
```

## Demo Script

### 1. Create project data

Create a project such as:

- Name: `Vehicle OTA Delivery Demo`
- Status: `In Progress`
- Priority: `High`
- Manager: select a member from the member library

Add at least:

- 2 milestones
- 5 plan items
- 2 requirements
- 2 issues
- 1 project announcement

### 2. Import or edit project plan

Use the project plan tab to import an Excel plan, or manually create first-level and second-level tasks.

Recommended demo fields:

- phase
- primary task
- secondary task
- owner
- dependency
- duration
- progress
- planned start/end date

### 3. Run AI project review

Open the AI assistant workspace and bind the current project.

Try prompts:

```text
请基于当前项目数据做一次项目总审，列出进度风险、依赖风险和下一步建议。
```

```text
请把当前项目整理成一份周会摘要，包括本周进展、风险、阻塞和下周计划。
```

```text
请检查当前计划中最可能延期的任务，并说明依据。
```

### 4. What to show in screenshots

- AI assistant workspace
- Project data agent tool usage
- Project review report
- Single plan review
- Project detail view
- Member library and user management

The existing screenshots are stored in `capture/`.

## Demo Positioning

When sharing TinyPM publicly, lead with this message:

> TinyPM lets an AI project assistant work with real project data instead of vague chat context.
