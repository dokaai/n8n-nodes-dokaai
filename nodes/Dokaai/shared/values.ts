import type { IExecuteFunctions, INode, ResourceMapperValue } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { normalizeSchema, readSchemaType } from '../openapi/schema';
import type { JsonSchema, OpenApiOperation } from '../openapi/types';
import {
	excludedBodyFieldsForOperation,
	inferBodyRoot,
	operationBodySchema,
	rawJsonBodyFieldForOperation,
	supportsCustomerAttributeFields,
} from './operation-policy';

export const parseJsonParameter = (value: unknown, fieldName: string, node: INode): unknown => {
	if (value === undefined || value === null || value === '') {
		return undefined;
	}

	if (typeof value !== 'string') {
		return value;
	}

	try {
		return JSON.parse(value);
	} catch (error) {
		throw new NodeOperationError(node, `${fieldName} must be valid JSON.`);
	}
};

const setNestedValue = (
	target: Record<string, unknown>,
	path: string[],
	value: unknown,
): void => {
	const [head, ...rest] = path;

	if (head === undefined) {
		return;
	}

	if (rest.length === 0) {
		target[head] = value;
		return;
	}

	if (typeof target[head] !== 'object' || target[head] === null || Array.isArray(target[head])) {
		target[head] = {};
	}

	setNestedValue(target[head] as Record<string, unknown>, rest, value);
};

const shouldIncludeValue = (value: unknown): boolean =>
	value !== undefined && value !== null && value !== '';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const collectBodyFields = (
	schema: JsonSchema | undefined,
	excluded: Set<string>,
	prefix = '',
): Array<{ name: string; schema: JsonSchema }> => {
	const normalized = normalizeSchema(schema);

	return Object.entries(normalized.properties ?? {}).flatMap(([key, propertySchema]) => {
		if (excluded.has(key)) {
			return [];
		}

		const property = normalizeSchema(propertySchema);
		const type = readSchemaType(property);
		const name = `${prefix}${key}`;

		if ((type === 'object' || property.properties !== undefined) && property.properties !== undefined) {
			return collectBodyFields(property, excluded, `${name}.`);
		}

		return [{ name, schema: property }];
	});
};

const readResourceMapperValues = (value: unknown): Record<string, unknown> => {
	const mapper = value as Partial<ResourceMapperValue> | undefined;
	const mapperValue = isRecord(mapper?.value)
		? mapper.value
		: isRecord(value)
			? Object.fromEntries(
					Object.entries(value).filter(
						([key]) =>
							![
								'mappingMode',
								'matchingColumns',
								'schema',
								'attemptToConvertTypes',
								'convertFieldsToString',
							].includes(key),
					),
				)
			: undefined;

	if (!isRecord(mapperValue)) {
		return {};
	}

	return Object.fromEntries(
		Object.entries(mapperValue)
			.map(([fieldName, fieldValue]) => {
				if (
					isRecord(fieldValue) &&
					Object.keys(fieldValue).length === 1 &&
					'value' in fieldValue
				) {
					return [fieldName, fieldValue.value] as const;
				}

				return [fieldName, fieldValue] as const;
			})
			.filter(([, fieldValue]) => shouldIncludeValue(fieldValue)),
	);
};

const readFixedCollectionValue = (rawValue: unknown, fieldName: string): unknown => {
	if (!isRecord(rawValue)) {
		return rawValue;
	}

	const repeatedValues = rawValue[fieldName];

	if (Array.isArray(repeatedValues)) {
		return repeatedValues.map((item) => {
			if (
				isRecord(item) &&
				Object.keys(item).length === 1 &&
				Object.prototype.hasOwnProperty.call(item, 'value')
			) {
				return item.value;
			}

			return item;
		});
	}

	return rawValue;
};

export const readOperationValues = (
	context: IExecuteFunctions,
	operation: OpenApiOperation,
	_operationBodySchema: JsonSchema | undefined,
	itemIndex: number,
): Record<string, unknown> => {
	const values: Record<string, unknown> = {};
	const body: Record<string, unknown> = {};
	const operationId = operation.operationId;
	const bodyRoot = inferBodyRoot(operation);
	const bodySchema = operationBodySchema(operation, bodyRoot);
	const excluded = excludedBodyFieldsForOperation(operation);
	const node = context.getNode();
	const rawJsonBodyField = rawJsonBodyFieldForOperation(operationId);

	for (const parameter of operation.parameters ?? []) {
		values[parameter.name] = context.getNodeParameter(parameter.name, itemIndex, undefined);
	}

	if (rawJsonBodyField !== undefined) {
		const rawJsonBody = parseJsonParameter(
			context.getNodeParameter(rawJsonBodyField, itemIndex, undefined),
			rawJsonBodyField,
			node,
		);

		if (shouldIncludeValue(rawJsonBody)) {
			values.body = rawJsonBody;
			return values;
		}
	}

	for (const field of collectBodyFields(bodySchema, excluded)) {
		const rawValue = context.getNodeParameter(field.name, itemIndex, undefined);
		const schemaType = readSchemaType(field.schema);
		const value =
			schemaType === 'array'
				? readFixedCollectionValue(parseJsonParameter(rawValue, field.name, node), field.name)
				: schemaType === 'object'
					? parseJsonParameter(rawValue, field.name, node)
					: rawValue;

		if (shouldIncludeValue(value)) {
			setNestedValue(body, field.name.split('.'), value);
		}
	}

	if (operationId !== undefined && supportsCustomerAttributeFields(operationId)) {
		Object.assign(
			body,
			readResourceMapperValues(context.getNodeParameter('customerAttributes', itemIndex, undefined)),
		);
	}

	if (Object.keys(body).length > 0) {
		values.body = bodyRoot === undefined ? body : { [bodyRoot]: body };
	}

	return values;
};
