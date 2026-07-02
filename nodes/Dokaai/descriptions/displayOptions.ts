import type { INodeProperties } from 'n8n-workflow';

import type { DokaaiResource } from '../operations';

export const operationDisplayOptions = (
	resource: DokaaiResource,
	operationId: string,
): INodeProperties['displayOptions'] => ({
	show: {
		resource: [resource],
		operation: [operationId],
	},
});
