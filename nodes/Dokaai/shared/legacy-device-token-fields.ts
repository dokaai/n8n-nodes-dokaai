import type { JsonSchema } from '../openapi/types';

export const LEGACY_DEVICE_TOKEN_OPERATION_IDS = new Set([
	'addCustomersToPool',
	'updateCustomerInPool',
]);

export const legacyDeviceTokenSchema: JsonSchema = {
	type: 'object',
	properties: {
		iosDeviceTokens: {
			type: 'array',
			items: {
				type: 'string',
			},
		},
		androidDeviceTokens: {
			type: 'array',
			items: {
				type: 'string',
			},
		},
	},
};

export const supportsLegacyDeviceTokenFields = (operationId: string): boolean =>
	LEGACY_DEVICE_TOKEN_OPERATION_IDS.has(operationId);

