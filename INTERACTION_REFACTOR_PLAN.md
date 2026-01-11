# System Stability and Refactoring Plan

This document outlines the strategy for enhancing the Ouroboro game engine to improve troubleshooting, prevent bugs, and ensure operational stability.

## 1. Core Engine Stability & Type Safety

### A. Strict Typing in Command Registry
- **Problem:** `CommandContext` uses `any` for `engine` and `systems`, leading to potential runtime errors and poor IDE support.
- **Solution:** Define a `SystemRegistry` interface and a proper `IEngine` interface.
- **Benefit:** Faster development and compile-time error catching.

### B. Error Boundaries
- **Problem:** A single error in a system's `update` loop or a command's `execute` method can crash the entire server.
- **Solution:** Wrap system updates and command executions in `try-catch` blocks. Implement a "safe execution" wrapper.
- **Benefit:** The server remains operational even if a specific interaction fails.

### C. Centralized Logging Service
- **Problem:** `console.log` is scattered everywhere, making it hard to filter or redirect logs.
- **Solution:** Implement a `Logger` service with levels (`DEBUG`, `INFO`, `WARN`, `ERROR`) and context tagging.
- **Benefit:** Easier troubleshooting in production and better visibility into system behavior.

## 2. ECS Performance & Scalability

### A. Optimized Entity Queries
- **Problem:** Systems currently iterate over the entire set of entities every tick.
- **Solution:** Add `engine.getEntitiesWithComponent(ComponentClass)` to the `Engine` to allow systems to only process relevant entities.
- **Benefit:** Significant performance improvement as the world grows.

### B. Universal WorldQuery Usage
- **Problem:** `NPCSystem` and `MovementSystem` still contain local helper methods for finding rooms or entities.
- **Solution:** Refactor all systems to use the centralized `WorldQuery` utility.
- **Benefit:** Single source of truth for spatial queries and reduced code duplication.

## 3. Interaction System Decoupling (Phase 2)

### A. InventoryHandler (`src/handlers/InventoryHandler.ts`)
- **Task:** Move `handleGet`, `handleDrop`, `handleStow`, `handleSwap` logic here.
- **Benefit:** Isolates complex inventory state transitions.

### B. PuzzleManager (`src/services/PuzzleManager.ts`)
- **Task:** Move `handleTurn` and specific puzzle completion logic (e.g., Alchemist's Study) here.
- **Benefit:** Keeps `InteractionSystem` generic and makes it easier to add new puzzles.

### C. CommerceSystem (`src/services/CommerceSystem.ts`)
- **Task:** Move `handleTerminalBuy` and shop catalog logic here.
- **Benefit:** Encapsulates economic transactions and inventory generation.

## 4. Persistence & State Management

### A. Robust Deserialization
- **Problem:** Redis data is saved as raw JSON, but components need to be instances of their respective classes to maintain functionality (e.g., methods, getters).
- **Solution:** Implement a `ComponentRegistry` and a deserialization factory that reconstructs `Entity` objects correctly.
- **Benefit:** Reliable state recovery after server restarts.

### B. Schema Versioning
- **Problem:** Changes to component structures can cause crashes when loading old data.
- **Solution:** Add a `version` field to persisted entities and implement migration scripts or "defaulting" logic.
- **Benefit:** Prevents data corruption and crashes during updates.

## 5. Client-Server Communication

### A. Structured Message Protocol
- **Problem:** The server sends raw strings with XML-like tags (e.g., `<system>`).
- **Solution:** Move to a structured JSON format: `{ type: 'message', text: '...', tags: ['system', 'important'] }`.
- **Benefit:** Cleaner client-side rendering and better support for rich UI elements.

### B. Input Validation
- **Problem:** Client commands are parsed with simple regex/split, which is fragile.
- **Solution:** Use a validation layer (e.g., `Zod`) to validate all incoming socket events and command arguments.
- **Benefit:** Prevents malformed data from reaching the core logic.

## 6. Implementation Roadmap

1.  **Phase 1 (Stability):** Implement `Logger`, `Error Boundaries`, and fix `CommandContext` typing.
2.  **Phase 2 (Performance):** Implement `Engine` entity queries and refactor `NPCSystem`/`MovementSystem` to use `WorldQuery`.
3.  **Phase 3 (Decoupling):** Extract `InventoryHandler`, `PuzzleManager`, and `CommerceSystem`.
4.  **Phase 4 (Persistence):** Implement robust deserialization and schema versioning.
5.  **Phase 5 (Protocol):** Migrate to structured JSON messages and add input validation.
