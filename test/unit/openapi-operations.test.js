const assert = require('node:assert/strict');
const test = require('node:test');

const { groupOperationIdsByFirstTag } = require('../../nodes/Dokaai/openapi/operations');

test('groupOperationIdsByFirstTag derives resource names and values from OpenAPI tags', () => {
	const document = {
		paths: {
			'/customers': {
				get: {
					operationId: 'listCustomers',
					tags: ['Customer Pools'],
				},
			},
			'/customers/{id}': {
				get: {
					operationId: 'getCustomer',
					tags: ['Customer Pools'],
				},
			},
			'/handlers': {
				get: {
					operationId: 'listHandlers',
					tags: ['Notification Handlers'],
				},
			},
		},
	};

	assert.deepEqual(
		groupOperationIdsByFirstTag(document, ['listCustomers', 'getCustomer', 'listHandlers']),
		[
			{
				name: 'Customer Pools',
				value: 'customerpools',
				operationIds: ['listCustomers', 'getCustomer'],
			},
			{
				name: 'Notification Handlers',
				value: 'notificationhandlers',
				operationIds: ['listHandlers'],
			},
		],
	);
});
