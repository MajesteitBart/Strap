---
id: WS-B
name: WS-B Product Surfaces
owner: product-stream
status: done
created: 2026-07-24T19:59:40Z
updated: 2026-07-24T20:14:16Z
operating_mode: multi-stream
---

# Workstream: WS-B Product Surfaces

## Objective

Rename signed-in Personal and Company product surfaces while preserving editing, collaboration, permissions, and current visual behavior.

## Owned Files/Areas

- `components/creed/` and `app/(creed-app)/` until staged moves in T-009.

## Dependencies

- WS-A owns shared UI and global CSS; WS-B consumes its final names after handoff.

## Risks

- Large orchestration files, Personal/Company persistence differences, proposal races, and hidden-section or permission regressions.

## Handoff Criteria

- T-004 passes focused product checks and supplies a staged path-move map.
