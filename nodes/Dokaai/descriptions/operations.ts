import type { INodeProperties } from 'n8n-workflow';

import { findOperationById, humanize } from '../openapi/runtime';
import { dokaaiOpenApiDocument } from '../shared/document';
import { resourceGroups } from './resources';

const buildOperationOptions = (resource: (typeof resourceGroups)[number]): INodeProperties => ({
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: [resource.value],
		},
	},
	options: resource.operationIds.map((operationId) => {
		const { operation } = findOperationById(dokaaiOpenApiDocument, operationId);

		return {
			name: operation.summary ?? humanize(operationId),
			value: operationId,
			description: operation.description,
			action: humanize(operationId),
		};
	}),
	default: resource.operationIds[0],
});

export const operationOptions: INodeProperties[] = resourceGroups.map(buildOperationOptions);
