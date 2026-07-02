import type {
	FieldType,
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';

import {
	customerAttributeMapperConfig,
	type DynamicLoaderConfig,
	type DynamicLoaderMethod,
	dynamicLoaderConfigs,
} from '../loaders/config';
import { buildRequestOptions, findOperationById } from '../openapi/runtime';
import { dokaaiOpenApiDocument } from './document';

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

const valuesFromLoaderConfig = (
	context: ILoadOptionsFunctions,
	config: DynamicLoaderConfig,
): Record<string, unknown> | undefined => {
	const values: Record<string, unknown> = {
		...(config.staticValues ?? {}),
	};

	for (const parameterName of config.dependsOn ?? []) {
		const value = context.getCurrentNodeParameter(parameterName) as string | undefined;

		if (!value) {
			return undefined;
		}

		values[parameterName] = value;
	}

	return values;
};

const loadConfiguredOptions = async (
	context: ILoadOptionsFunctions,
	method: DynamicLoaderMethod,
): Promise<INodePropertyOptions[]> => {
	const config = dynamicLoaderConfigs[method];
	const values = valuesFromLoaderConfig(context, config);

	if (values === undefined) {
		return [clearSelectionOption, ...errorOption(config.missingSelectionMessage ?? 'Select required fields first')];
	}

	return loadOperationOptions(context, config.operationId, values);
};

async function loadCustomerAttributeFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const values = valuesFromLoaderConfig(this, customerAttributeMapperConfig);

	if (values === undefined) {
		return {
			fields: [],
			emptyFieldsNotice: customerAttributeMapperConfig.missingSelectionMessage,
		};
	}

	const credentials = await this.getCredentials('dokaaiApi');
	const definition = findOperationById(dokaaiOpenApiDocument, customerAttributeMapperConfig.operationId);
	const response = await this.helpers.httpRequest(
		buildRequestOptions(
			dokaaiOpenApiDocument,
			definition,
			values,
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
		return loadConfiguredOptions(this, 'getProjects');
	},

	async getCustomerPools(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return loadConfiguredOptions(this, 'getCustomerPools');
	},

	async getTargetAudienceLists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return loadConfiguredOptions(this, 'getTargetAudienceLists');
	},

	async getNotificationHandlers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return loadConfiguredOptions(this, 'getNotificationHandlers');
	},
};

export const dokaaiResourceMapping = {
	getCustomerAttributeFields: loadCustomerAttributeFields,
};
