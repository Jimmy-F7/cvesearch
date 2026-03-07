# AI Platform Notes

## Vercel AI SDK Evaluation

Recommendation: do not adopt the Vercel AI SDK yet.

Why:
- the current typed AI service already covers the app's immediate needs for provider routing, structured JSON generation, fallback handling, and run logging
- the largest remaining gaps are prompt/version management, reusable tool metadata, and regression coverage, which are provider-agnostic and are now implemented directly in the app
- introducing the SDK now would add another abstraction layer before the app has multiple real tool-executing agent loops in production

When to revisit:
- when agent workflows start chaining multiple tool invocations in a single request
- when streaming partial tool/state updates becomes a product requirement
- when the project needs provider-specific structured outputs or tool-execution helpers beyond the current service layer

## Current Direction

- keep the existing typed AI service as the execution layer
- version prompts explicitly in code so behavior changes are reviewable
- define a small tool registry that future agents can share
- expand regression datasets before introducing a larger agent runtime dependency
