import type {
	FieldType,
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';

import { buildRequestOptions, findOperationById } from '../openapi/runtime';
import { dokaaiOpenApiDocument } from './document';

const DOKAAI_SERVICE_ID = 'f72c921b-0ad0-4387-8ac8-9ff8467d77cc';

const clearSelectionOption: INodePropertyOptions = {
	name: 'None',
	value: '',
};

const isRecord = (value: unknown): value is IDataObject =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const readDataArray = (response: unknown): IDataObject[] => {
	if (!isRecord(response) || !Array.isArray(response.data)) {
		return [];
	}

	return response.data.filter(isRecord);
};

const mapIdNameOptions = (items: IDataObject[]): INodePropertyOptions[] =>
	items.flatMap((item) => {
		if (typeof item.id !== 'string' || typeof item.name !== 'string') {
			return [];
		}

		return [
			{
				name: item.name,
				value: item.id,
			},
		];
	});

const errorOption = (message: string): INodePropertyOptions[] => [
	{
		name: message,
		value: `__error__${message}`,
	},
	];

const mapCustomerAttributeFieldType = (fieldType: unknown): FieldType => {
	if (fieldType === 'number') {
		return 'number';
	}

	if (fieldType === 'boolean') {
		return 'boolean';
	}

	if (fieldType === 'date' || fieldType === 'dateTime') {
		return 'dateTime';
	}

	if (fieldType === 'array') {
		return 'array';
	}

	if (fieldType === 'json') {
		return 'object';
	}

	return 'string';
};

const mapCustomerAttributeFields = (items: IDataObject[]): ResourceMapperField[] =>
	items.flatMap((attribute) => {
		if (typeof attribute.fieldName !== 'string') {
			return [];
		}

		return [
			{
				id: attribute.fieldName,
				displayName:
					typeof attribute.fieldDisplayName === 'string'
						? attribute.fieldDisplayName
						: attribute.fieldName,
				defaultMatch: false,
				canBeUsedToMatch: false,
				required: attribute.isMandatory === true,
				display: true,
				type: mapCustomerAttributeFieldType(attribute.fieldType),
			},
		];
	});

const loadOperationOptions = async (
	context: ILoadOptionsFunctions,
	operationId: string,
	values: Record<string, unknown>,
): Promise<INodePropertyOptions[]> => {
	const credentials = await context.getCredentials('dokaaiApi');
	const definition = findOperationById(dokaaiOpenApiDocument, operationId);

	try {
		const response = await context.helpers.httpRequest(
			buildRequestOptions(dokaaiOpenApiDocument, definition, values, credentials),
		);
		const options = mapIdNameOptions(readDataArray(response));

		return options.length > 0 ? [clearSelectionOption, ...options] : errorOption('No options found');
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to load options';
		return errorOption(`Error: ${message}`);
	}
};

async function loadCustomerAttributeFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const projectId = this.getCurrentNodeParameter('projectId') as string | undefined;
	const customerPoolId = this.getCurrentNodeParameter('customerPoolId') as string | undefined;

	if (!projectId || !customerPoolId) {
		return {
			fields: [],
			emptyFieldsNotice: 'Select a project and customer pool first.',
		};
	}

	const credentials = await this.getCredentials('dokaaiApi');
	const definition = findOperationById(dokaaiOpenApiDocument, 'getPoolCustomerAttribute');
	const response = await this.helpers.httpRequest(
		buildRequestOptions(
			dokaaiOpenApiDocument,
			definition,
			{
				projectId,
				customerPoolId,
				attributeTypes: 'custom',
				page: '1',
				size: '100',
			},
			credentials,
		),
	);
	const fields = mapCustomerAttributeFields(readDataArray(response));

	return {
		fields,
		...(fields.length === 0
			? { emptyFieldsNotice: 'No custom attributes found for this customer pool.' }
			: {}),
	};
}

export const dokaaiLoadOptions = {
	async getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return loadOperationOptions(this, 'getAllProjectsWithService', {
			serviceId: DOKAAI_SERVICE_ID,
			page: '1',
			size: '100',
		});
	},

	async getCustomerPools(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const projectId = this.getCurrentNodeParameter('projectId') as string | undefined;

		if (!projectId) {
			return [clearSelectionOption, ...errorOption('Select a project first')];
		}

		return loadOperationOptions(this, 'getAllCustomerPoolInProject', { projectId });
	},

	async getTargetAudienceLists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const projectId = this.getCurrentNodeParameter('projectId') as string | undefined;

		if (!projectId) {
			return [clearSelectionOption, ...errorOption('Select a project first')];
		}

		return loadOperationOptions(this, 'getTargetAudienceLists', {
			projectId,
			page: '1',
			size: '100',
		});
	},

	async getNotificationHandlers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const projectId = this.getCurrentNodeParameter('projectId') as string | undefined;

		if (!projectId) {
			return [clearSelectionOption, ...errorOption('Select a project first')];
		}

		return loadOperationOptions(this, 'getAllNotificationHandlersInProject', {
			projectId,
			page: '1',
			size: '100',
		});
	},
};

export const dokaaiResourceMapping = {
	getCustomerAttributeFields: loadCustomerAttributeFields,
};
