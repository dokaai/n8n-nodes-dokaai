const assert = require('node:assert/strict');
const test = require('node:test');

const {
	excludedBodyFieldsForOperation,
	inferBodyRoot,
	operationBodySchema,
	supportsCustomerAttributeFields,
} = require('../../nodes/Dokaai/shared/operation-policy');

const operationWithCustomerDataRoot = {
	operationId: 'addCustomersToPool',
	parameters: [
		{ name: 'projectId', in: 'path' },
		{ name: 'customerPoolId', in: 'path' },
		{ name: 'page', in: 'query' },
	],
	requestBody: {
		content: {
			'application/json': {
				schema: {
					type: 'object',
					required: ['customerData'],
					properties: {
						customerData: {
							type: 'object',
							required: ['uniqueCustomerId'],
							properties: {
								uniqueCustomerId: { type: 'string' },
								emailId: { type: 'string' },
							},
						},
						metadata: {
							type: 'object',
							properties: {
								source: { type: 'string' },
							},
						},
					},
				},
			},
		},
	},
};

test('inferBodyRoot only selects the single required object wrapper', () => {
	assert.equal(inferBodyRoot(operationWithCustomerDataRoot), 'customerData');
});

test('operationBodySchema returns the nested body schema when a body root exists', () => {
	const schema = operationBodySchema(operationWithCustomerDataRoot, 'customerData');

	assert.deepEqual(Object.keys(schema.properties), ['uniqueCustomerId', 'emailId']);
	assert.deepEqual(schema.required, ['uniqueCustomerId']);
});

test('excludedBodyFieldsForOperation excludes audit fields and path/query params', () => {
	const excluded = excludedBodyFieldsForOperation(operationWithCustomerDataRoot);

	assert.equal(excluded.has('createdDate'), true);
	assert.equal(excluded.has('modifiedById'), true);
	assert.equal(excluded.has('projectId'), true);
	assert.equal(excluded.has('customerPoolId'), true);
	assert.equal(excluded.has('page'), true);
	assert.equal(excluded.has('uniqueCustomerId'), false);
});

test('supportsCustomerAttributeFields is scoped to customer create/update operations', () => {
	assert.equal(supportsCustomerAttributeFields('addCustomersToPool'), true);
	assert.equal(supportsCustomerAttributeFields('updateCustomerInPool'), true);
	assert.equal(supportsCustomerAttributeFields('createCustomAttributes'), false);
});
