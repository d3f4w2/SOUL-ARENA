# Tech Stack

## Runtime
- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS v4

## Existing Integrations
- SecondMe OAuth and profile APIs
- Zhihu open APIs

## Arena MVP Additions
- Browser `MediaRecorder` for WebM export
- Canvas-based battle stage for deterministic replay capture
- In-process arena generation utilities for build analysis and battle packages

## Why This Stack
- Same stack as current repo, no migration tax
- Canvas gives a stable recordable surface
- Browser recording avoids server video infrastructure
- Structured contracts keep frontend/backed parallelizable
