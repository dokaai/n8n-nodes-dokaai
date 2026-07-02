# Dokaai n8n Node

n8n community node package for Dokaai.

The node uses `api/index.json` as the OpenAPI source and exposes the selected
operations through n8n-style resources and operations.

## Structure

- `credentials/` defines the Dokaai account credentials.
- `api/index.json` is the OpenAPI contract bundled into the npm package.
- `nodes/Dokaai/Dokaai.node.ts` is the thin n8n node entry point.
- `nodes/Dokaai/OperationDescription.ts` defines n8n resources, operations, and fields.
- `nodes/Dokaai/GenericFunctions.ts` executes the selected OpenAPI operation.
- `nodes/Dokaai/openapi/` contains OpenAPI parsing, schema, and request helpers.
- `nodes/Dokaai/shared/` contains dropdown loaders and shared field/value helpers.

## Local Development

Build the package:

```bash
npm install
npm run build
```

When using Docker Desktop for n8n, mount this repository into:

```text
/home/node/.n8n/custom/node_modules/n8n-nodes-dokaai
```

Then restart the n8n container and search for `Dokaai` in the node picker.

## Adding an Operation

1. Update `api/index.json`.
2. Add the OpenAPI `operationId` to the correct resource in `nodes/Dokaai/OperationDescription.ts`.
3. Run:

```bash
npm run typecheck
npm run build
```

Restart n8n after building so it reloads the compiled `dist` files.
