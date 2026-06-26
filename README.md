# child-health-explain-ai

AI child checkup report MVP for turning pediatric checkup data into doctor-reviewed, parent-friendly explanations.

## What This Is

This project combines a deterministic rule core with an AI expression layer:

- The rule core identifies abnormal findings from structured child checkup data.
- The AI expression layer turns those rule-backed findings into clearer report language for parents and doctors.

## MVP Features

- Doctor and parent entry points.
- Manual intake and OCR-confirmed intake flows.
- Three abnormality rule categories for checkup interpretation.
- Parent-facing report and poster generation.
- Doctor review workflow before sharing interpreted results.
- Follow-up reminders for continued care.

## Development

Use Node 18+ for local development. Node 22 is recommended, and this repository's verification environment uses Node 22.

Install dependencies:

```sh
pnpm install
```

Run the API locally:

```sh
pnpm dev:api
```

Run type checks:

```sh
pnpm typecheck
```

Run tests:

```sh
pnpm test
```

## Mini Program

The WeChat mini program source lives in `apps/miniprogram`.

Open `apps/miniprogram` with WeChat Developer Tools to run and inspect the mini program client.
