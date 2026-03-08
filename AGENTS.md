---
description: General coding standards for readability and consistency
alwaysApply: true
---

# Coding Standards

- Keep files to roughly **500 lines**. Extract into separate modules when they grow beyond that.
- Use **early returns** to avoid deep nesting inside `if` blocks.
- `if` statements must use **block bodies** — no single-line forms like `if (x) return y;`.
- Prefer `switch`/`case` over chaining `if`/`else if` on the same variable.
- Use **descriptive names** — no abbreviations or single-letter identifiers (`p`, `elem`, `calc`). Spell them out (`product`, `rootElement`, `calculateTotal`).
- Add a **blank line before `return`**, unless it's the only statement in the block.
- **Group related code** with blank lines to separate logically distinct sections.

## Examples

```typescript
// Bad: nested logic, single-line if, no whitespace grouping
function process(input: string | null) {
    if (input) {
        const t = input.trim();
        if (t.length > 0) return t.toUpperCase();
    }
    return "";
}

// Good: early returns, descriptive names, grouped sections, blank line before return
function process(input: string | null) {
    if (!input) {
        return "";
    }

    const trimmed = input.trim();
    if (trimmed.length === 0) {
        return "";
    }

    return trimmed.toUpperCase();
}
```

```typescript
// Bad: chained if/else if
if (status === "idle") {
    handleIdle();
} else if (status === "loading") {
    handleLoading();
} else if (status === "error") {
    handleError();
}

// Good: switch/case
switch (status) {
    case "idle":
        handleIdle();
        break;
    case "loading":
        handleLoading();
        break;
    case "error":
        handleError();
        break;
}
```
