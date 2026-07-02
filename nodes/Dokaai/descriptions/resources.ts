import type { INodeProperties } from 'n8n-workflow';

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
