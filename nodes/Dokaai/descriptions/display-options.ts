import type { INodeProperties } from 'n8n-workflow';

export const operationDisplayOptions = (
	resource: string,
	operationId: string,
): INodeProperties['displayOptions'] => ({
	show: {
		resource: [resource],
		operation: [operationId],
	},
});
