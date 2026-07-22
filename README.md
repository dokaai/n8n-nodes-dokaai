# n8n-nodes-dokaai

This is an n8n community node package for Dokaai. It lets you use selected
Dokaai API operations directly inside n8n workflows.

The package is generated from the Dokaai OpenAPI contract and exposes Dokaai
resources, operations, dynamic dropdowns, and credential handling through one
n8n node named `Dokaai`.

## Installation

Install the package from n8n's Community Nodes screen.

1. Open n8n.
2. Go to **Settings**.
3. Open **Community Nodes**.
4. Select **Install**.
5. Enter this npm package name:

```text
n8n-nodes-dokaai
```

6. Confirm the installation.
7. Restart n8n if your installation type requires it.

After installation, search for `Dokaai` in the n8n node picker.

## Credentials

Create a new `Dokaai API` credential in n8n and provide:

- `Client Key`
- `Client Secret`

These values are sent to the Dokaai API using the authentication headers
defined in the Dokaai OpenAPI contract.

## Basic Usage

1. Add the `Dokaai` node to a workflow.
2. Select or create your `Dokaai API` credential.
3. Choose a resource.
4. Choose an operation.
5. Fill in the required fields.
6. Execute the workflow.

Some fields load options dynamically from Dokaai, such as projects, customer
pools, target audience lists, and notification handlers. Select the parent
field first when a dropdown depends on another value.

## Supported Resources

The current package exposes selected operations for these Dokaai resources.

### Customer Pools

- Add customers to a pool
- Update a customer in a pool
- Remove a customer from a pool
- Get pool customers
- Get a pool customer by ID
- Add a customer custom attribute

### Notification Handlers

- Trigger a notification handler
- Get a notification handler
- Get all notification handlers in a project

### Target Audience Lists

- Associate a customer to a target audience list
- Delete a customer from a target audience list

## Dynamic Fields

The node includes dynamic n8n fields backed by Dokaai API calls:

- `projectId` loads available projects.
- `customerPoolId` loads customer pools for the selected project.
- `targetAudienceListId` loads target audience lists for the selected project.
- `filterOutTALId` loads target audience lists for the selected project.
- `notificationHandlerId` loads notification handlers for the selected project.
- Customer custom attributes load for supported customer pool operations.

Dynamic dropdowns include a `None` option so stale selections can be cleared.

## Package Contents

The npm package publishes the compiled n8n node from `dist`, including the node
icon and the OpenAPI contract needed at runtime.

Repository-only files such as tests, scripts, and raw TypeScript source are not
published as runtime package files.

## Troubleshooting

### The Dokaai node does not appear in n8n

Confirm that the package name was entered exactly:

```text
n8n-nodes-dokaai
```

Then restart n8n and search for `Dokaai` again.

### A dynamic dropdown is empty

Check that:

- the `Dokaai API` credential is valid
- the required parent field is selected first
- the credential has access to the selected project or resource

### An operation fails

Open the failed execution in n8n and inspect the node error. API errors are
returned with the Dokaai operation ID so the failing operation is easier to
identify.

## Maintainers

This repository uses Node.js `22.22.2`. For local development and release
checks:

```bash
nvm use
npm ci
npm run check
```

`npm run check` runs generated tests, validates the OpenAPI configuration,
typechecks, builds the package, and verifies the npm package contents with
`npm pack --dry-run`.

For contributor workflow details, see
[CONTRIBUTING.md](https://github.com/dokaai/n8n-nodes-dokaai/blob/main/CONTRIBUTING.md).

For internal architecture and OpenAPI generation details, see
[ARCHITECTURE.md](https://github.com/dokaai/n8n-nodes-dokaai/blob/main/ARCHITECTURE.md).

For npm publishing details, see
[docs/RELEASE.md](https://github.com/dokaai/n8n-nodes-dokaai/blob/main/docs/RELEASE.md).

For the exact command sequence after changing `api/index.json`, see the
Change And Release Workflow in
[docs/RELEASE.md](https://github.com/dokaai/n8n-nodes-dokaai/blob/main/docs/RELEASE.md#change-and-release-workflow).

## Resources

- [Dokaai documentation](https://docs.dokaai.com/)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](https://github.com/dokaai/n8n-nodes-dokaai/blob/main/LICENSE)
