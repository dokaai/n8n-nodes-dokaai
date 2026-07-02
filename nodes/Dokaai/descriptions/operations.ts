import type { INodeProperties } from 'n8n-workflow';

import { findOperationById, humanize } from '../openapi/runtime';
import { operationsByResource, type DokaaiResource } from '../operations';
import { dokaaiOpenApiDocument } from '../shared/document';

const buildOperationOptions = (resource: DokaaiResource): INodeProperties => ({
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: [resource],
		},
	},
	options: operationsByResource[resource].map((operationId) => {
		const { operation } = findOperationById(dokaaiOpenApiDocument, operationId);

		return {
			name: operation.summary ?? humanize(operationId),
			value: operationId,
			description: operation.description,
			action: humanize(operationId),
		};
	}),
	default: operationsByResource[resource][0],
});

export const operationOptions: INodeProperties[] = [
	buildOperationOptions('customer'),
	buildOperationOptions('customAttribute'),
	buildOperationOptions('notificationHandler'),
	buildOperationOptions('targetAudienceList'),
];
