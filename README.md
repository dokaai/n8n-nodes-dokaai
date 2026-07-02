# Dokaai n8n Community Node

n8n community node package for Dokaai, generated from the Dokaai OpenAPI
contract.

The API source of truth is `api/index.json`. The node exposes selected OpenAPI
operations as n8n resources and operations. Normal REST operations should not
have hand-written request modules.

## Setup

```bash
npm install
npm run typecheck
npm run build
npm run validate:openapi-config
npm test
```

## Development Commands

```bash
npm run typecheck
npm run build
npm test
```

`npm run typecheck` validates the TypeScript source.

`npm run build` removes stale `dist`, compiles TypeScript, copies
`api/index.json`, and copies the node icon into `dist`.

`npm run generate:tests` rewrites generated operation tests from
`nodes/Dokaai/operations.ts` and `api/index.json`.

`npm run validate:openapi-config` verifies selected operation IDs and dynamic
loader operation IDs against `api/index.json`.

`npm test` is the single full test command. It runs `generate:tests`,
`validate:openapi-config`, `tsc --noEmit`, then runs Node's built-in test runner
against the TypeScript source for unit tests and generated integration tests.

`npm run test:unit` is available when you only want the focused unit tests for
schema mapping, operation policy, request value conversion, and request
construction.

n8n loads the compiled files from `dist`, not the TypeScript files directly.
After changing source files, run `npm run build` and restart n8n.

## Local Docker Setup

When using Docker Desktop for n8n, mount this repository into:

```text
/home/node/.n8n/custom/node_modules/n8n-nodes-dokaai
```

Set the custom extensions path if your container needs it:

```text
N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom
```

Then restart the n8n container and search for `Dokaai` in the node picker.

## How Operations Are Created

`nodes/Dokaai/Dokaai.node.ts` registers one n8n node. The node loads:

- credentials from `credentials/DokaaiApi.credentials.ts`
- selected operations from `nodes/Dokaai/operations.ts`
- resources, operation selectors, and generated fields from `nodes/Dokaai/OperationDescription.ts`
- dynamic dropdowns and resource mappers from `nodes/Dokaai/shared/loadOptions.ts`
- request execution from `nodes/Dokaai/GenericFunctions.ts`

OpenAPI drives:

- URL and method from the OpenAPI path item
- auth headers from `securitySchemes`
- n8n fields from path/query params and JSON request body schema
- request body wrappers by detecting a single required object body property
- enums as dropdowns
- arrays of objects as repeatable field groups
- arrays of primitives as repeatable value groups

## Current Resources

Customer:

- `addCustomersToPool`
- `updateCustomerInPool`
- `removeCustomerFromPool`
- `getPoolCustomers`
- `getPoolCustomerById`

Custom Attribute:

- `addCustomerCustomAttribute`

Notification Handler:

- `triggerNotificationHandler`
- `getNotificationHandler`
- `getAllNotificationHandlersInProject`

Target Audience List:

- `associateCustomerToTargetAudienceList`
- `deleteCustomerFromTargetAudienceList`

## Dynamic Fields

Dynamic fields are n8n UX adapters on top of the OpenAPI contract:

- `projectId` loads from `getAllProjectsWithService`.
- `customerPoolId` loads from `getAllCustomerPoolInProject` and depends on `projectId`.
- `targetAudienceListId` and `filterOutTALId` load from `getTargetAudienceLists` and depend on `projectId`.
- `notificationHandlerId` loads from `getAllNotificationHandlersInProject` and depends on `projectId`.
- Customer pool custom attributes load from `getPoolCustomerAttribute` for `addCustomersToPool` and `updateCustomerInPool`.

Dynamic dropdowns include a `None` option so users can clear stale selections.
Dropdown loader metadata lives in `nodes/Dokaai/loaders/config.ts`.

Customer custom attributes use their plain backend `fieldName`, for example
`is_vip`. They are submitted as plain request body fields because the selected
customer operations do not define a `customAttribute` wrapper in OpenAPI.

## Adding An Operation

1. Add or update the endpoint in `api/index.json`.
2. Add the OpenAPI `operationId` to the correct resource in `nodes/Dokaai/operations.ts`.
3. Run:

```bash
npm run typecheck
npm run build
```

Run the generated test suite:

```bash
npm test
```

4. Restart n8n so it reloads the compiled `dist` files.

Do not add hand-written API request code for normal REST operations. If an
endpoint needs behavior the generator cannot infer, add generic inference
support or a small reusable loader/resource-mapper adapter first.

## Publishing Shape

This package follows n8n community node conventions:

- package name starts with `n8n-nodes-`
- `keywords` includes `n8n-community-node-package`
- `package.json > n8n.nodes` points to the compiled node file
- `package.json > n8n.credentials` points to the compiled credential file
- `dist` is generated before publish

For verification in the n8n Creator Portal, publish through npm with the
required npm/GitHub provenance flow described by n8n.
