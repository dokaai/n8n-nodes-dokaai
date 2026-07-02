# Architecture

## Source Of Truth

`api/index.json` is the source of truth for the n8n node.

It owns:

- API server URL
- authentication schemes
- paths and HTTP methods
- path parameters
- query parameters
- request body schemas
- response schemas

TypeScript code should not contain per-endpoint route builders or per-operation
payload builders for normal REST operations.

## Module Map

```text
api/index.json
credentials/
nodes/Dokaai/Dokaai.node.ts
nodes/Dokaai/GenericFunctions.ts
nodes/Dokaai/OperationDescription.ts
nodes/Dokaai/openapi/
nodes/Dokaai/shared/
scripts/clean-dist.js
```

Compiled files are emitted to `dist/`. n8n loads the compiled files referenced
in `package.json`.

## Runtime Flow

```text
Dokaai.node.ts
  -> registers one n8n node
  -> declares credentials
  -> loads resource/operation field descriptions
  -> registers loadOptions and resourceMapping methods
  -> execute()
       -> read selected operationId
       -> GenericFunctions.executeOpenApiOperation()
       -> shared/values builds params and body
       -> openapi/runtime builds HTTP request
       -> n8n httpRequest calls Dokaai API
```

## File Responsibilities

`nodes/Dokaai/Dokaai.node.ts` is the thin n8n node shell. It wires
description, credentials, load methods, and execution.

`nodes/Dokaai/OperationDescription.ts` owns n8n resources, operation selectors,
field generation, and operation grouping.

`nodes/Dokaai/GenericFunctions.ts` owns execution orchestration and API error
normalization.

`nodes/Dokaai/openapi/runtime.ts` owns URL, method, path-template, auth-header,
query, and request option construction.

`nodes/Dokaai/openapi/schema.ts` owns JSON Schema normalization and n8n field
mapping.

`nodes/Dokaai/openapi/types.ts` owns the local OpenAPI TypeScript types used by
the generator.

`nodes/Dokaai/shared/document.ts` imports `api/index.json`.

`nodes/Dokaai/shared/fields.ts` owns common field-ordering helpers.

`nodes/Dokaai/shared/loadOptions.ts` owns dynamic dropdown loaders and the
customer attribute resource mapper.

`nodes/Dokaai/shared/operationPolicy.ts` owns operation-level policy that is not
safe to infer directly from raw JSON Schema, such as backend-owned field
exclusions and body-root inference.

`nodes/Dokaai/shared/values.ts` owns conversion from n8n node parameters to API
path/query/body values.

## OpenAPI Field Generation

The node uses only OpenAPI params and request bodies for operation fields:

- path params become required n8n fields
- query params become n8n fields
- request body properties become n8n fields
- enums become options
- arrays of objects become repeatable field groups
- arrays of primitives become repeatable value groups
- `anyOf` and `oneOf` use the first non-null schema
- one required object body property is treated as the body root

Backend-owned fields are excluded from generated body fields:

- `organizationId`
- `projectId`
- `createdById`
- `createdDate`
- `modifiedById`
- `modifiedDate`
- `isActive`
- `isDeleted`

Path and query parameter names are also excluded from request body fields.

## Dynamic Behavior

Dynamic dropdowns are explicit UX adapters:

- `projectId` -> `getAllProjectsWithService`
- `customerPoolId` -> `getAllCustomerPoolInProject`
- `targetAudienceListId` -> `getTargetAudienceLists`
- `filterOutTALId` -> `getTargetAudienceLists`
- `notificationHandlerId` -> `getAllNotificationHandlersInProject`

Customer custom attributes are implemented with n8n's `resourceMapper`:

- applies to `addCustomersToPool`
- applies to `updateCustomerInPool`
- loads fields from `getPoolCustomerAttribute`
- depends on `projectId` and `customerPoolId`
- sends mapped values as plain fields in the request body root

## Adding Capabilities

Prefer extending generic OpenAPI inference instead of adding feature-specific
request logic.

Examples:

- Need to expose another operation: add its `operationId` to the correct resource.
- Need a nested body: the schema adapter handles nested object properties.
- Need an array input: the schema adapter handles primitive arrays and object arrays.
- Need to hide backend-managed fields: add a generic exclusion rule in `operationPolicy.ts`.
- Need a dropdown: add a reusable loader keyed by field name and backed by an OpenAPI operation.
- Need dynamic schema fields: add a resource mapper backed by an OpenAPI operation.

## Build Output

`npm run build` cleans `dist` before compiling. This prevents stale compiled
files from deleted modules being published.

The build copies:

- `api/index.json` to `dist/api/index.json`
- `nodes/Dokaai/dokaai.svg` to `dist/nodes/Dokaai/dokaai.icon.svg`

## Testing Strategy

This repo currently has typecheck and build verification. Future tests should
cover generated behavior without external API calls:

- operation grouping by resource
- field generation from OpenAPI schemas
- request method, URL encoding, headers, query, and body shape
- dynamic dropdown request shape and option mapping
- customer attribute resource mapper output
- array and fixed collection body conversion
- error message normalization
