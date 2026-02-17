---
name: interview
description: Interview the user about the spec and write the spec to the file
argument-hint: [file]
---

Read the given spec and interview me in detail about literally anything: technical implementation, UI & UX, concerns, tradeoffs, etc. but make sure the questions are not obvious.

Be very in-depth and continue interviewing me continually until it's complete, then write the spec into a separate markdown file.

Explore the codebase first, understand the spec, and start asking questions.

- If you are cursor agent, use `AskQuestion` tool to ask the user questions. You are allowed to ask more than 3 questions at a time.
- If you are claude code agent, use `AskUserQuestion` tool to ask the user questions. You are allowed to ask more than 3 questions at a time.

Create the final plan in `.agent/plans` folder.

Spec: $1

---

Reference only - Agents should not access this link

Source from https://x.com/trq212/status/2005315275026260309
