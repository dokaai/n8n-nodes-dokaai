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

## First Manual Publish

If the package does not exist on npm yet, publish the first version locally
without provenance:

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

1. Create the public package name on npm by publishing the first release through
   GitHub Actions.
2. In npm package settings, add a trusted publisher:
   - Publisher: GitHub Actions
   - Repository owner: your GitHub org/user
   - Repository name: `n8n-nodes-dokaai`
   - Workflow filename: `publish.yml`
3. If trusted publishing is not available, add an npm granular access token as
   the GitHub Actions secret `NPM_TOKEN`.

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
