export type DokaaiResource =
	| 'customer'
	| 'customAttribute'
	| 'targetAudienceList'
	| 'notificationHandler';

export const operationsByResource: Record<DokaaiResource, readonly string[]> = {
	customer: [
		'addCustomersToPool',
		'updateCustomerInPool',
		'removeCustomerFromPool',
		'getPoolCustomers',
		'getPoolCustomerById',
	],
	customAttribute: ['addCustomerCustomAttribute'],
	notificationHandler: [
		'triggerNotificationHandler',
		'getNotificationHandler',
		'getAllNotificationHandlersInProject',
	],
	targetAudienceList: [
		'associateCustomerToTargetAudienceList',
		'deleteCustomerFromTargetAudienceList',
	],
};
