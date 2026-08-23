# Domain Docs

## Before exploring, read these

- `CONTEXT.md` at the repository root
- `docs/adr/` entries relevant to the area being changed

If these files don't exist, proceed silently. Domain-modeling skills create them lazily when domain terms or architectural decisions are resolved.

## File structure

This repository uses a single-context layout:

```
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

## Use the glossary's vocabulary

When naming a domain concept in issues, proposals, tests, or code, use the terminology defined in `CONTEXT.md`. Avoid synonyms the glossary explicitly rejects.

If a required concept is absent, reconsider whether it belongs to the domain or record the gap for domain modeling.

## Flag ADR conflicts

If proposed work contradicts an existing ADR, surface the conflict explicitly instead of silently overriding the decision.
