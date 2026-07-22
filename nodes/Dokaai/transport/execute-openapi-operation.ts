import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { buildRequestOptions, findOperationById } from '../openapi/runtime';
import { getJsonRequestSchema } from '../openapi/schema';
import { dokaaiOpenApiDocument } from '../shared/document';
import { readOperationValues } from '../shared/values';

const readErrorDetails = (error: unknown): string => {
	if (typeof error === 'object' && error !== null) {
		const record = error as IDataObject;
		const response = record.response as IDataObject | undefined;
		const data = response?.data ?? record.data ?? record.error;

		if (typeof data === 'string') {
			return data;
		}

		if (typeof data === 'object' && data !== null) {
			return JSON.stringify(data);
		}

		if (typeof record.message === 'string') {
			return record.message;
		}
	}

	return error instanceof Error ? error.message : 'Request failed';
};

export const executeOpenApiOperation = async (
	context: IExecuteFunctions,
	itemIndex: number,
	operationId: string,
): Promise<INodeExecutionData> => {
	const credentials = await context.getCredentials('dokaaiApi');
	const definition = findOperationById(dokaaiOpenApiDocument, operationId);
	const bodySchema = getJsonRequestSchema(definition.operation.requestBody);
	const values = readOperationValues(context, definition.operation, bodySchema, itemIndex);
	let response: IDataObject;

	try {
		response = await context.helpers.httpRequest(
			buildRequestOptions(dokaaiOpenApiDocument, definition, values, credentials),
		);
	} catch (error) {
		throw new Error(`Dokaai ${operationId} failed: ${readErrorDetails(error)}`);
	}

	return {
		json: response,
		pairedItem: {
			item: itemIndex,
		},
	};
};
