import type { INodeProperties } from 'n8n-workflow';

import { groupOperationIdsByFirstTag } from '../openapi/operations';
import { selectedOperationIds } from '../operation-selection';
import { dokaaiOpenApiDocument } from '../shared/document';

export const resourceGroups = groupOperationIdsByFirstTag(dokaaiOpenApiDocument, selectedOperationIds);

export const resourceOptions: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: resourceGroups.map((resource) => ({
		name: resource.name,
		value: resource.value,
	})),
	default: resourceGroups[0]?.value ?? '',
};
