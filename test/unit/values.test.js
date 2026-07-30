const assert = require('node:assert/strict');
const test = require('node:test');

const { parseJsonParameter, readOperationValues } = require('../../nodes/Dokaai/shared/values');

const fakeNode = {
	name: 'Dokaai',
	type: 'n8n-nodes-dokaai.dokaai',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const contextFor = (parameters) => ({
	getNode() {
		return fakeNode;
	},
	getNodeParameter(name, _itemIndex, defaultValue) {
		return Object.prototype.hasOwnProperty.call(parameters, name)
			? parameters[name]
			: defaultValue;
	},
});

test('parseJsonParameter parses JSON strings and rejects invalid JSON', () => {
	assert.deepEqual(parseJsonParameter('{"enabled":true}', 'metadata', fakeNode), { enabled: true });
	assert.equal(parseJsonParameter('', 'metadata', fakeNode), undefined);
	assert.throws(() => parseJsonParameter('{bad}', 'metadata', fakeNode), /metadata must be valid JSON/);
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

test('readOperationValues sends trigger notification handler body JSON as request body', () => {
	const operation = {
		operationId: 'triggerNotificationHandler',
		parameters: [
			{ name: 'projectId', in: 'path' },
			{ name: 'notificationHandlerId', in: 'path' },
		],
		requestBody: {
			content: {
				'application/json': {
					schema: {
						anyOf: [
							{
								type: 'object',
								required: ['mode'],
								properties: {
									mode: { type: 'string', enum: ['live', 'test'] },
								},
							},
						],
					},
				},
			},
		},
	};
	const body = {
		mode: 'test',
		enabledOnlyChannels: ['in_app'],
		templateData: {},
		recipients: [
			{
				uniqueCustomerId: 'TRIAL-USER-1003',
				emailId: 'ayush@gmail.com',
				phoneNumber: '+919369450531',
				androidDeviceTokens: ['werwerwer'],
				iosDeviceTokens: ['ewrrwewer'],
				name: 'Ayush Srivastava',
			},
		],
	};

	const values = readOperationValues(
		contextFor({
			projectId: 'project-1',
			notificationHandlerId: 'handler-1',
			mode: 'live',
			bodyJson: JSON.stringify(body),
		}),
		operation,
		undefined,
		0,
	);

	assert.deepEqual(values, {
		projectId: 'project-1',
		notificationHandlerId: 'handler-1',
		body,
	});
});

test('readOperationValues falls back to trigger notification handler generated fields without body JSON', () => {
	const operation = {
		operationId: 'triggerNotificationHandler',
		parameters: [
			{ name: 'projectId', in: 'path' },
			{ name: 'notificationHandlerId', in: 'path' },
		],
		requestBody: {
			content: {
				'application/json': {
					schema: {
						anyOf: [
							{
								type: 'object',
								required: ['mode'],
								properties: {
									mode: { type: 'string', enum: ['live', 'test'] },
									idempotencyKey: { type: 'string' },
								},
							},
						],
					},
				},
			},
		},
	};

	const values = readOperationValues(
		contextFor({
			projectId: 'project-1',
			notificationHandlerId: 'handler-1',
			mode: 'test',
			idempotencyKey: 'trigger-1',
			bodyJson: '',
		}),
		operation,
		undefined,
		0,
	);

	assert.deepEqual(values, {
		projectId: 'project-1',
		notificationHandlerId: 'handler-1',
		body: {
			mode: 'test',
			idempotencyKey: 'trigger-1',
		},
	});
});
