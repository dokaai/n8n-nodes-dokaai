import type { IDataObject, IExecuteFunctions, IN8nHttpFullResponse, INodeExecutionData, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { buildRequestOptions, findOperationById } from '../openapi/runtime';
import { getJsonRequestSchema } from '../openapi/schema';
import { dokaaiOpenApiDocument } from '../shared/document';
import { readOperationValues } from '../shared/values';

const isHttpResponse = (response: IDataObject | IN8nHttpFullResponse): response is IN8nHttpFullResponse =>
	'statusCode' in response && 'body' in response;

export const executeOpenApiOperation = async (
	context: IExecuteFunctions,
	itemIndex: number,
	operationId: string,
): Promise<INodeExecutionData> => {
	const definition = findOperationById(dokaaiOpenApiDocument, operationId);
	const bodySchema = getJsonRequestSchema(definition.operation.requestBody);
	const values = readOperationValues(context, definition.operation, bodySchema, itemIndex);
	let rawResponse: IDataObject | IN8nHttpFullResponse;
	try {
		rawResponse = await context.helpers.httpRequestWithAuthentication.call(
			context,
			'dokaaiApi',
			{
				...buildRequestOptions(dokaaiOpenApiDocument, definition, values),
				ignoreHttpStatusErrors: true,
				returnFullResponse: true,
			},
		);
	} catch (error) {
		throw new NodeApiError(
			context.getNode(),
			error as JsonObject,
			{
				message: `Dokaai ${operationId} failed`,
				itemIndex,
			},
		);
	}

	if (isHttpResponse(rawResponse)) {
		if (rawResponse.statusCode >= 400) {
			throw new NodeApiError(context.getNode(), {
				response: { data: rawResponse.body },
				httpCode: String(rawResponse.statusCode),
			} as unknown as JsonObject, {
				message: `Dokaai ${operationId} failed`,
				itemIndex,
			});
		}

		rawResponse = rawResponse.body as IDataObject;
	}

	return {
		json: rawResponse,
		pairedItem: {
			item: itemIndex,
		},
	};
};
