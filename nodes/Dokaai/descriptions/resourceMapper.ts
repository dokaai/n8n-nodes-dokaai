import type { INodeProperties } from 'n8n-workflow';

export const buildCustomerAttributeResourceMapper = (
	displayOptions: INodeProperties['displayOptions'],
): INodeProperties => ({
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
});
