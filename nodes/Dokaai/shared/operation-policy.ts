import { getJsonRequestSchema, normalizeSchema } from '../openapi/schema';
import type { JsonSchema, OpenApiOperation } from '../openapi/types';

export const DEFAULT_EXCLUDED_BODY_FIELDS = new Set([
	'organizationId',
	'projectId',
	'createdById',
	'createdDate',
	'modifiedById',
	'modifiedDate',
	'isActive',
	'isDeleted',
]);

export const inferBodyRoot = (operation: OpenApiOperation): string | undefined => {
	const requestSchema = normalizeSchema(getJsonRequestSchema(operation.requestBody));

	if (requestSchema.properties === undefined) {
		return undefined;
	}

	const requiredObjectProperties = (requestSchema.required ?? []).filter((propertyName) => {
		const property = normalizeSchema(requestSchema.properties?.[propertyName]);
		return property.type === 'object' || property.allOf !== undefined;
	});

	return requiredObjectProperties.length === 1 ? requiredObjectProperties[0] : undefined;
};

export const operationBodySchema = (
	operation: OpenApiOperation,
	bodyRoot: string | undefined,
): JsonSchema | undefined => {
	const requestSchema = normalizeSchema(getJsonRequestSchema(operation.requestBody));

	if (bodyRoot === undefined) {
		return requestSchema;
	}

	return normalizeSchema(requestSchema.properties?.[bodyRoot]);
};

export const excludedBodyFieldsForOperation = (operation: OpenApiOperation): Set<string> =>
	new Set([
		...DEFAULT_EXCLUDED_BODY_FIELDS,
		...(operation.parameters ?? [])
			.filter((parameter) => parameter.in === 'path' || parameter.in === 'query')
			.map((parameter) => parameter.name),
	]);

export const supportsCustomerAttributeFields = (operationId: string): boolean =>
	operationId === 'addCustomersToPool' || operationId === 'updateCustomerInPool';
