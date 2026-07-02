const assert = require('node:assert/strict');
const test = require('node:test');

const {
	buildRequestOptions,
	findOperationById,
	getOpenApiBaseUrl,
	pathFromTemplate,
} = require('../../nodes/Dokaai/openapi/runtime');

const document = {
	openapi: '3.0.0',
	servers: [{ url: 'https://api.example.com/api/v1/' }],
	security: [{ clientKey: [], clientSecret: [] }],
	components: {
		securitySchemes: {
			clientKey: { type: 'apiKey', in: 'header', name: 'x-client-key' },
			clientSecret: { type: 'apiKey', in: 'header', name: 'x-client-secret' },
		},
	},
	paths: {
		'/projects/{projectId}/items': {
			post: {
				operationId: 'createItem',
				parameters: [
					{ name: 'projectId', in: 'path', required: true },
					{ name: 'page', in: 'query', schema: { type: 'string', default: '1' } },
					{ name: 'size', in: 'query', required: true, schema: { type: 'string', default: '100' } },
					{ name: 'filter', in: 'query', schema: { type: 'string' } },
				],
			},
		},
	},
};

test('getOpenApiBaseUrl trims trailing slashes', () => {
	assert.equal(getOpenApiBaseUrl(document), 'https://api.example.com/api/v1');
});

test('findOperationById locates operations by operationId', () => {
	const definition = findOperationById(document, 'createItem');

	assert.equal(definition.method, 'post');
	assert.equal(definition.path, '/projects/{projectId}/items');
});

test('pathFromTemplate encodes path values and requires missing params', () => {
	assert.equal(
		pathFromTemplate('/projects/{projectId}', { projectId: 'project 1' }),
		'/projects/project%201',
	);
	assert.throws(() => pathFromTemplate('/projects/{projectId}', {}), /projectId is required/);
});

test('buildRequestOptions builds URL, auth headers, query params, and body', () => {
	const definition = findOperationById(document, 'createItem');
	const options = buildRequestOptions(
		document,
		definition,
		{
			projectId: 'project 1',
			body: { name: 'Test' },
		},
		{
			clientKey: 'key',
			clientSecret: 'secret',
		},
	);

	assert.equal(options.method, 'POST');
	assert.equal(options.url, 'https://api.example.com/api/v1/projects/project%201/items');
	assert.deepEqual(options.qs, { size: '100' });
	assert.deepEqual(options.body, { name: 'Test' });
	assert.deepEqual(options.headers, {
		Accept: 'application/json',
		'x-client-key': 'key',
		'x-client-secret': 'secret',
		'Content-Type': 'application/json',
	});
});
