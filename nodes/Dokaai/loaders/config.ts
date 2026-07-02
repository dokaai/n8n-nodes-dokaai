export const DOKAAI_SERVICE_ID = 'f72c921b-0ad0-4387-8ac8-9ff8467d77cc';

export type DynamicLoaderMethod =
	| 'getProjects'
	| 'getCustomerPools'
	| 'getTargetAudienceLists'
	| 'getNotificationHandlers';

export type DynamicLoaderConfig = {
	operationId: string;
	dependsOn?: string[];
	staticValues?: Record<string, string>;
	missingSelectionMessage?: string;
};

export const dynamicParameterLoaders: Record<
	string,
	{ method: DynamicLoaderMethod; dependsOn?: string[] }
> = {
	projectId: { method: 'getProjects' },
	customerPoolId: { method: 'getCustomerPools', dependsOn: ['projectId'] },
	targetAudienceListId: { method: 'getTargetAudienceLists', dependsOn: ['projectId'] },
	filterOutTALId: { method: 'getTargetAudienceLists', dependsOn: ['projectId'] },
	notificationHandlerId: { method: 'getNotificationHandlers', dependsOn: ['projectId'] },
};

export const dynamicLoaderConfigs: Record<DynamicLoaderMethod, DynamicLoaderConfig> = {
	getProjects: {
		operationId: 'getAllProjectsWithService',
		staticValues: {
			serviceId: DOKAAI_SERVICE_ID,
			page: '1',
			size: '100',
		},
	},
	getCustomerPools: {
		operationId: 'getAllCustomerPoolInProject',
		dependsOn: ['projectId'],
		missingSelectionMessage: 'Select a project first',
	},
	getTargetAudienceLists: {
		operationId: 'getTargetAudienceLists',
		dependsOn: ['projectId'],
		staticValues: {
			page: '1',
			size: '100',
		},
		missingSelectionMessage: 'Select a project first',
	},
	getNotificationHandlers: {
		operationId: 'getAllNotificationHandlersInProject',
		dependsOn: ['projectId'],
		staticValues: {
			page: '1',
			size: '100',
		},
		missingSelectionMessage: 'Select a project first',
	},
};

export const customerAttributeMapperConfig: DynamicLoaderConfig = {
	operationId: 'getPoolCustomerAttribute',
	dependsOn: ['projectId', 'customerPoolId'],
	staticValues: {
		attributeTypes: 'custom',
		page: '1',
		size: '100',
	},
	missingSelectionMessage: 'Select a project and customer pool first.',
};
