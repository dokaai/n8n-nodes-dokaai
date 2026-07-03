# Contributing

## Branch And Commit Expectations

Use focused branches and small commits. Do not commit local `.env` files,
logs, n8n runtime data, or unrelated formatting churn.

`dist/` is generated for n8n loading and npm packaging. If your workflow needs
compiled output locally, regenerate it with `npm run build`.

## Required Checks

Run before opening or updating a PR:

```bash
npm run typecheck
npm run build
npm run validate:openapi-config
npm test
```

## Naming Conventions

- OpenAPI `operationId`s stay camelCase and come from `api/index.json`.
- n8n resource labels come from the first OpenAPI tag on each selected operation.
- Local module and folder filenames use kebab-case.
- TypeScript classes and exported types use PascalCase or camelCase as appropriate.
- Dynamic loaders should be named after the field or resource they load.
- n8n description builders belong under `nodes/Dokaai/descriptions/`.
- Dynamic loader implementations belong under `nodes/Dokaai/methods/`.
- API execution belongs under `nodes/Dokaai/transport/`.
- Shared OpenAPI behavior belongs under `nodes/Dokaai/openapi/`.
- Integration policy belongs under `nodes/Dokaai/shared/operation-policy.ts`.
- Dynamic loader metadata belongs under `nodes/Dokaai/loaders/config.ts`.

## Adding An Operation

1. Add or update the endpoint in `api/index.json`.
2. Add the `operationId` to `nodes/Dokaai/operation-selection.ts`.
3. Confirm the operation's first OpenAPI tag is the desired n8n resource label.
4. Run `npm run generate:tests`.
5. Run `npm test`.
6. Add or update unit tests when the generic OpenAPI inference behavior changes.
7. Restart n8n and verify the operation in the node UI.

Do not add hand-written request modules for normal REST endpoints. The OpenAPI
adapter should generate method, URL, input fields, query params, body shape,
auth headers, and response handling.

## Adding Dynamic Behavior

- Prefer a reusable loader under `nodes/Dokaai/methods/load-options.ts`.
- Put loader operation IDs, dependencies, and static query values in `nodes/Dokaai/loaders/config.ts`.
- Reuse an OpenAPI `operationId` for the loader when possible.
- Keep dynamic field values aligned with backend IDs.
- Keep dynamic labels aligned with backend display names.
- Add `loadOptionsDependsOn` when a dropdown depends on another field.
- For schema-like dynamic fields, use n8n `resourceMapper`.
- For customer pool custom attributes, use the plain backend `fieldName`.
- Do not add custom prefixes like `customAttribute__`.
- Do not wrap dynamic customer attributes unless the OpenAPI request body contains that wrapper.

## Contract Rules

- Preserve HTTP methods, paths, query parameters, and request body shapes from `api/index.json`.
- Do not duplicate Dokaai routes in feature code.
- Do not hard-code request body wrappers that are not present in OpenAPI.
- If an operation has a single required object body property, the adapter may use it as the request body root.
- If OpenAPI defines an enum, expose it as a dropdown.
- If OpenAPI defines an array of objects, expose it as a repeatable field group.
- If OpenAPI defines an array of primitives, expose it as a repeatable value group.

## Prohibited Patterns

- Duplicating the Dokaai API base URL.
- Hard-coding endpoint paths outside the OpenAPI runtime helpers.
- Returning, logging, or serializing auth secrets.
- Adding hand-written operation executors when OpenAPI inference can handle the operation.
- Adding marketplace-specific metadata to the backend-owned OpenAPI contract.
- Adding `customAttribute__` prefixes to customer custom attribute input keys.
- Wrapping payloads in `customerData`, `customAttribute`, or other objects unless the OpenAPI request body requires it.
- Putting business logic in `nodes/Dokaai/dokaai.node.ts`.
- Using broad `any` to bypass TypeScript.
- Publishing stale `dist` output.

## Release Safety

Do not alter credential field names, production endpoints, package name, or
public operation behavior without an explicit migration plan.

Before publishing:

```bash
npm run typecheck
npm run build
npm test
npm pack
```

Inspect the packed files before publishing to npm.
