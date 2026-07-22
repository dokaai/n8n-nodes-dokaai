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
nodes/Dokaai/descriptions/
nodes/Dokaai/methods/
nodes/Dokaai/transport/
nodes/Dokaai/operation-selection.ts
nodes/Dokaai/loaders/
nodes/Dokaai/openapi/
nodes/Dokaai/shared/
scripts/clean-dist.js
scripts/generate-openapi-tests.js
test/register-typescript.cjs
test/unit/
test/integration/openapi-generated.test.js
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
       -> transport/execute-openapi-operation.executeOpenApiOperation()
       -> shared/values builds params and body
       -> openapi/runtime builds HTTP request
       -> n8n httpRequest calls Dokaai API
```

## File Responsibilities

This follows n8n's recommended modular structure for larger nodes: a required node file, a required credential file, operation descriptions split into modules, optional `methods` for dynamic parameters, and `transport` for API communication.

`nodes/Dokaai/Dokaai.node.ts` is the thin n8n node shell. It wires
description, credentials, load methods, and execution.

`credentials/DokaaiApi.credentials.ts` owns the n8n credential definition. The file basename follows n8n's credential naming convention.

`nodes/Dokaai/operation-selection.ts` owns the selected OpenAPI operation IDs. This is
the n8n operation allow-list.

`nodes/Dokaai/openapi/operations.ts` groups selected operation IDs by each
operation's first OpenAPI `tags` value. These generated groups become n8n
resources.

`nodes/Dokaai/descriptions/index.ts` is the thin composition export for node
description pieces.

`nodes/Dokaai/descriptions/resources.ts` owns the resource selector generated
from OpenAPI tag groups.

`nodes/Dokaai/descriptions/operations.ts` owns operation selector generation.

`nodes/Dokaai/descriptions/fields.ts` owns OpenAPI-driven field generation.

`nodes/Dokaai/descriptions/resource-mapper.ts` owns n8n resource mapper field
definitions.

`nodes/Dokaai/loaders/config.ts` owns dynamic dropdown and resource mapper
metadata, including loader operation IDs, dependencies, and static query values.

`nodes/Dokaai/descriptions/display-options.ts` owns operation visibility helpers.

`nodes/Dokaai/transport/execute-openapi-operation.ts` owns execution orchestration and API error
normalization.

`nodes/Dokaai/openapi/runtime.ts` owns URL, method, path-template, auth-header,
query, and request option construction.

`nodes/Dokaai/openapi/schema.ts` owns JSON Schema normalization and n8n field
mapping.

`nodes/Dokaai/openapi/types.ts` owns the local OpenAPI TypeScript types used by
the generator.

`nodes/Dokaai/shared/document.ts` imports `api/index.json`.

`nodes/Dokaai/shared/fields.ts` owns common field-ordering helpers.

`nodes/Dokaai/methods/load-options.ts` owns dynamic dropdown loaders and the
customer attribute resource mapper runtime behavior.

`nodes/Dokaai/shared/operation-policy.ts` owns operation-level policy that is not
safe to infer directly from raw JSON Schema, such as backend-owned field
exclusions and body-root inference.

`nodes/Dokaai/shared/values.ts` owns conversion from n8n node parameters to API
path/query/body values.

## OpenAPI Field Generation

The node uses selected operation IDs plus OpenAPI metadata for n8n UI generation:

- first operation tag becomes the n8n resource
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

The mapping from field names to loader methods, and from loader methods to
OpenAPI operation IDs, lives in `nodes/Dokaai/loaders/config.ts`.

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

- Need to expose another operation: add its `operationId` to `operation-selection.ts`.
- Need to change the resource group: change the operation's first OpenAPI tag.
- Need a nested body: the schema adapter handles nested object properties.
- Need an array input: the schema adapter handles primitive arrays and object arrays.
- Need to hide backend-managed fields: add a generic exclusion rule in `operation-policy.ts`.
- Need a dropdown: add a reusable loader keyed by field name and backed by an OpenAPI operation.
- Need dynamic schema fields: add a resource mapper backed by an OpenAPI operation.

## Build Output

`npm run build` cleans `dist` before compiling. This prevents stale compiled
files from deleted modules being published.

The build copies:

- `api/index.json` to `dist/api/index.json`
- `nodes/Dokaai/dokaai.svg` to `dist/nodes/Dokaai/dokaai.icon.svg`

## Testing Strategy

Tests verify generated behavior without external API calls.

`scripts/validate-openapi-config.js` verifies:

- selected operation IDs exist in `api/index.json`
- selected operation IDs are not duplicated
- dynamic loader methods are declared
- dynamic loader operation IDs exist in `api/index.json`
- required loader path/query params are supplied by dependencies or static values

Unit tests under `test/unit/` cover focused reusable behavior:

- JSON Schema normalization and n8n field mapping
- body-root and backend-owned field policy
- dynamic loader configuration
- n8n parameter to API value conversion
- URL, auth header, query, and request option construction

`scripts/generate-openapi-tests.js` derives test fixtures from:

- `api/index.json`
- `nodes/Dokaai/operation-selection.ts`
- OpenAPI operation tags

The generated integration test covers:

- operation grouping by generated resource
- field generation from OpenAPI schemas
- request method, URL encoding, headers, query, and body shape
- customer attribute resource mapper wiring
- array and fixed collection body conversion

Run:

```bash
npm test
```
