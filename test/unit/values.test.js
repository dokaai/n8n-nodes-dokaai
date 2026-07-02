const assert = require('node:assert/strict');
const test = require('node:test');

const { parseJsonParameter, readOperationValues } = require('../../nodes/Dokaai/shared/values');

const contextFor = (parameters) => ({
	getNodeParameter(name, _itemIndex, defaultValue) {
		return Object.prototype.hasOwnProperty.call(parameters, name)
			? parameters[name]
			: defaultValue;
	},
});

test('parseJsonParameter parses JSON strings and rejects invalid JSON', () => {
	assert.deepEqual(parseJsonParameter('{"enabled":true}', 'metadata'), { enabled: true });
	assert.equal(parseJsonParameter('', 'metadata'), undefined);
	assert.throws(() => parseJsonParameter('{bad}', 'metadata'), /metadata must be valid JSON/);
});

test('readOperationValues converts primitive fixed collections to arrays', () => {
	const operation = {
		operationId: 'associateCustomerToTargetAudienceList',
		parameters: [
			{ name: 'projectId', in: 'path' },
			{ name: 'targetAudienceListId', in: 'path' },
		],
		requestBody: {
			content: {
				'application/json': {
					schema: {
						type: 'object',
						required: ['customerIds'],
						properties: {
							customerIds: {
								type: 'array',
								items: { type: 'string' },
							},
						},
					},
				},
			},
		},
	};

	const values = readOperationValues(
		contextFor({
			projectId: 'project-1',
			targetAudienceListId: 'tal-1',
			customerIds: {
				customerIds: [{ value: 'customer-1' }, { value: 'customer-2' }],
			},
		}),
		operation,
		undefined,
		0,
	);

	assert.deepEqual(values, {
		projectId: 'project-1',
		targetAudienceListId: 'tal-1',
		body: {
			customerIds: ['customer-1', 'customer-2'],
		},
	});
});

test('readOperationValues wraps inferred body roots and excludes params/audit fields', () => {
	const operation = {
		operationId: 'addCustomersToPool',
		parameters: [
			{ name: 'projectId', in: 'path' },
			{ name: 'customerPoolId', in: 'path' },
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
									projectId: { type: 'string' },
									uniqueCustomerId: { type: 'string' },
									emailId: { type: 'string' },
									createdDate: { type: 'string' },
								},
							},
						},
					},
				},
			},
		},
	};

	const values = readOperationValues(
		contextFor({
			projectId: 'project-1',
			customerPoolId: 'pool-1',
			uniqueCustomerId: 'customer-1',
			emailId: 'customer@example.com',
			createdDate: '2026-07-02T00:00:00.000Z',
			customerAttributes: {
				mappingMode: 'defineBelow',
				value: {
					is_vip: true,
					first_zap: { value: 'yes' },
				},
			},
		}),
		operation,
		undefined,
		0,
	);

	assert.deepEqual(values, {
		projectId: 'project-1',
		customerPoolId: 'pool-1',
		body: {
			customerData: {
				uniqueCustomerId: 'customer-1',
				emailId: 'customer@example.com',
				is_vip: true,
				first_zap: 'yes',
			},
		},
	});
});
