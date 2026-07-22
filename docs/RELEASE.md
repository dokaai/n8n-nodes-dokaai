# Release

This package is published as a public npm package for n8n community nodes.

## Package Shape

The npm package follows n8n community node conventions:

- package name starts with `n8n-nodes-`
- `keywords` includes `n8n-community-node-package`
- `package.json > n8n.nodes` points to the compiled node file
- `package.json > n8n.credentials` points to the compiled credential file
- `dist` is generated before publish
- npm package contents are limited by `package.json > files`

Only runtime package files are published. Development files such as `test/`,
`scripts/`, raw TypeScript source, and the root `api/` folder stay in the
repository.

## Local Readiness Check

Use Node.js from `.nvmrc`:

```bash
nvm use
```

Install dependencies:

```bash
npm ci
```

Run the release readiness check:

```bash
npm run check
```

This runs generated tests, validates OpenAPI config, typechecks, builds, and
checks npm package contents with `npm pack --dry-run`.

## Change And Release Workflow

Use this flow when changing the node, updating `api/index.json`, or exposing
new Dokaai API operations.

Start from the latest `main`:

```bash
git checkout main
git pull
nvm use
npm ci
```

Make the source changes:

```bash
# edit api/index.json
# edit nodes/Dokaai/operation-selection.ts if you need to expose new operation IDs
# edit loaders, descriptions, or shared helpers only when the generated behavior needs support
```

Regenerate generated tests and validate the OpenAPI config:

```bash
npm run generate:tests
npm run validate:openapi-config
```

Run the full local check:

```bash
npm run check
```

Commit the code change:

```bash
git status
git add -A
git commit -m "Update Dokaai OpenAPI contract"
git push
```

Release a new npm version:

```bash
npm version patch
git push
git push --tags
```

Use `npm version minor` for larger backwards-compatible feature releases. Use
`npm version major` only for breaking changes.

The pushed version tag triggers `.github/workflows/publish.yml`, which publishes
the package to npm through GitHub Actions Trusted Publishing.

## First Manual Publish

If the package does not exist on npm yet and Trusted Publishing cannot be
configured before first publish, publish the first version locally without
provenance:

```bash
npm run check
npm run release:local
```

Do not use `npm run release` from a local terminal. Provenance publishing only
works from a supported CI provider such as GitHub Actions.

## GitHub Actions Publishing

n8n community nodes are public npm packages. n8n Creator Portal verification
expects publishing from GitHub Actions with npm provenance.

One-time npm setup:

1. Publish the package once so it exists on npm.
2. In npm package settings, add a Trusted Publisher:
   - Publisher: GitHub Actions
   - Repository owner: `dokaai`
   - Repository name: `n8n-nodes-dokaai`
   - Workflow filename: `publish.yml`
   - Allowed action: `npm publish`

Release flow:

```bash
npm version patch
git push
git push --tags
```

Pushing a version tag like `0.1.1` triggers `.github/workflows/publish.yml`,
which runs tests, builds, and publishes with provenance.

After npm publish succeeds, submit the package in the n8n Creator Portal for
verification.
