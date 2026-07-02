import type { INodeProperties } from 'n8n-workflow';

import { findOperationById, humanize } from './openapi/runtime';
import { buildNodeProperty, buildPropertiesFromObjectSchema } from './openapi/schema';
import { dokaaiOpenApiDocument } from './shared/document';
import { sortPriorityFieldsFirst } from './shared/fields';
import {
	excludedBodyFieldsForOperation,
	inferBodyRoot,
	operationBodySchema,
	supportsCustomerAttributeFields,
} from './shared/operationPolicy';

type DokaaiResource = 'customer' | 'customAttribute' | 'targetAudienceList' | 'notificationHandler';

const operationsByResource: Record<DokaaiResource, readonly string[]> = {
	customer: [
		'addCustomersToPool',
		'updateCustomerInPool',
		'removeCustomerFromPool',
		'getPoolCustomers',
		'getPoolCustomerById',
	],
	customAttribute: ['addCustomerCustomAttribute'],
	targetAudienceList: [
		'associateCustomerToTargetAudienceList',
		'deleteCustomerFromTargetAudienceList',
	],
	notificationHandler: [
		'triggerNotificationHandler',
		'getNotificationHandler',
		'getAllNotificationHandlersInProject'
	],
};

const dynamicLoadersByParameter: Record<string, { method: string; dependsOn?: string[] }> = {
	projectId: { method: 'getProjects' },
	customerPoolId: { method: 'getCustomerPools', dependsOn: ['projectId'] },
	targetAudienceListId: { method: 'getTargetAudienceLists', dependsOn: ['projectId'] },
	filterOutTALId: { method: 'getTargetAudienceLists', dependsOn: ['projectId'] },
	notificationHandlerId: { method: 'getNotificationHandlers', dependsOn: ['projectId'] },
};

const operationDisplayOptions = (resource: DokaaiResource, operationId: string): INodeProperties['displayOptions'] => ({
	show: {
		resource: [resource],
		operation: [operationId],
	},
});

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

const buildOperationFields = (resource: DokaaiResource): INodeProperties[] =>
	operationsByResource[resource].flatMap((operationId) => {
		const { operation } = findOperationById(dokaaiOpenApiDocument, operationId);
		const displayOptions = operationDisplayOptions(resource, operationId);
		const parameters = sortPriorityFieldsFirst(
			(operation.parameters ?? []).map((parameter) =>
				buildNodeProperty(parameter.name, parameter.schema, {
					displayName: parameter.name === 'filterOutTALId' ? 'Filter Out Target Audience List' : undefined,
					description: parameter.description,
					required: parameter.required,
					displayOptions,
					loadOptionsMethod: dynamicLoadersByParameter[parameter.name]?.method,
					loadOptionsDependsOn: dynamicLoadersByParameter[parameter.name]?.dependsOn,
				}),
			),
		);
		const bodyRoot = inferBodyRoot(operation);
		const bodyFields = buildPropertiesFromObjectSchema(operationBodySchema(operation, bodyRoot), {
			displayOptions,
			exclude: excludedBodyFieldsForOperation(operation),
		});
		const customerAttributeFields: INodeProperties[] = supportsCustomerAttributeFields(operationId)
			? [
					{
						displayName: 'Customer Attributes',
						name: 'customerAttributes',
						type: 'resourceMapper',
						default: {
							mappingMode: 'defineBelow',
							value: null,
							matchingColumns: [],
							schema: [],
						},
						displayOptions,
						typeOptions: {
							loadOptionsDependsOn: ['projectId', 'customerPoolId'],
							resourceMapper: {
								resourceMapperMethod: 'getCustomerAttributeFields',
								mode: 'add',
								valuesLabel: 'Customer Attributes',
								fieldWords: {
									singular: 'attribute',
									plural: 'attributes',
								},
								addAllFields: true,
								noFieldsError: 'No custom attributes found for this customer pool.',
							},
						},
					},
				]
			: [];

		return [...parameters, ...bodyFields, ...customerAttributeFields];
	});

export const resourceOptions: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: [
		{
			name: 'Customer',
			value: 'customer',
		},
		{
			name: 'Custom Attribute',
			value: 'customAttribute',
		},
		{
			name: 'Notification Handler',
			value: 'notificationHandler',
		},
		{
			name: 'Target Audience List',
			value: 'targetAudienceList',
		},
	],
	default: 'customer',
};

export const operationOptions: INodeProperties[] = [
	buildOperationOptions('customer'),
	buildOperationOptions('customAttribute'),
	buildOperationOptions('notificationHandler'),
	buildOperationOptions('targetAudienceList'),
];

export const operationFields: INodeProperties[] = [
	...buildOperationFields('customer'),
	...buildOperationFields('customAttribute'),
	...buildOperationFields('notificationHandler'),
	...buildOperationFields('targetAudienceList'),
];
