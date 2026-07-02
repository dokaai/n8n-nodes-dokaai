import type { INodeProperties } from 'n8n-workflow';
import type { INodePropertyOptions } from 'n8n-workflow';

import { humanize } from './runtime';
import type { JsonSchema } from './types';

const firstNonNullSchema = (schemas: readonly JsonSchema[] | undefined): JsonSchema | undefined =>
	schemas?.find((schema) => {
		if (typeof schema.type === 'string') {
			return schema.type !== 'null';
		}

		if (Array.isArray(schema.type)) {
			return schema.type.some((type) => type !== 'null');
		}

		return true;
	});

export const normalizeSchema = (schema: JsonSchema | undefined): JsonSchema => {
	if (schema === undefined) {
		return {};
	}

	const unionSchema = firstNonNullSchema(schema.anyOf ?? schema.oneOf);
	if (unionSchema !== undefined) {
		return normalizeSchema(unionSchema);
	}

	if (schema.allOf === undefined) {
		return schema;
	}

	const schemaWithoutAllOf = { ...schema };
	delete schemaWithoutAllOf.allOf;

	return schema.allOf.reduce<JsonSchema>(
		(current, part) => {
			const normalized = normalizeSchema(part);

			return {
				...current,
				...normalized,
				required: [...(current.required ?? []), ...(normalized.required ?? [])],
				properties: {
					...(current.properties ?? {}),
					...(normalized.properties ?? {}),
				},
			};
		},
		schemaWithoutAllOf,
	);
};

export const readSchemaType = (schema: JsonSchema): string | undefined => {
	if (typeof schema.type === 'string') {
		return schema.type;
	}

	return schema.type?.find((type) => type !== 'null');
};

const toOptions = (values: unknown[] | undefined): INodeProperties['options'] =>
	values
		?.filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
		.map((value) => ({ name: humanize(String(value)), value })) ?? [];

const mapType = (schema: JsonSchema): INodeProperties['type'] => {
	const type = readSchemaType(schema);
	const itemSchema = normalizeSchema(schema.items);

	if (schema.enum !== undefined) {
		return 'options';
	}

	if (type === 'array' && itemSchema.enum !== undefined) {
		return 'multiOptions';
	}

	if (type === 'boolean') {
		return 'boolean';
	}

	if (type === 'integer' || type === 'number') {
		return 'number';
	}

	if (schema.format === 'date-time' || schema.format === 'date') {
		return 'dateTime';
	}

	if (type === 'object' || type === 'array' || schema.properties !== undefined) {
		return 'json';
	}

	return 'string';
};

const buildFixedCollectionProperty = (
	name: string,
	schema: JsonSchema,
	options: {
		displayName?: string;
		required?: boolean;
		displayOptions?: INodeProperties['displayOptions'];
	},
): INodeProperties | undefined => {
	const itemSchema = normalizeSchema(schema.items);
	const itemType = readSchemaType(itemSchema);

	if (readSchemaType(schema) !== 'array') {
		return undefined;
	}

	if (itemSchema.properties === undefined) {
		const valueField = buildNodeProperty('value', itemSchema, {
			displayName: options.displayName ?? schema.title ?? humanize(name),
			required: true,
		});

		if (itemType === 'object' || itemType === 'array') {
			return undefined;
		}

		return {
			displayName: options.displayName ?? schema.title ?? humanize(name),
			name,
			type: 'fixedCollection',
			default: {},
			required: options.required ?? false,
			displayOptions: options.displayOptions,
			typeOptions: {
				multipleValues: true,
			},
			options: [
				{
					name,
					displayName: options.displayName ?? schema.title ?? humanize(name),
					values: [valueField],
				},
			],
		};
	}

	const itemRequired = new Set(itemSchema.required ?? []);
	const values = Object.entries(itemSchema.properties).flatMap(([key, propertySchema]) => {
		const property = normalizeSchema(propertySchema);
		const type = readSchemaType(property);

		if (type === 'object' || property.properties !== undefined) {
			return [];
		}

		return [
			buildNodeProperty(key, property, {
				required: itemRequired.has(key),
			}),
		];
	});

	return {
		displayName: options.displayName ?? schema.title ?? humanize(name),
		name,
		type: 'fixedCollection',
		default: {},
		required: options.required ?? false,
		displayOptions: options.displayOptions,
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				name,
				displayName: options.displayName ?? schema.title ?? humanize(name),
				values,
			},
		],
	};
};

export const buildNodeProperty = (
	name: string,
	schema: JsonSchema | undefined,
	options: {
		displayName?: string;
		description?: string;
		required?: boolean;
		displayOptions?: INodeProperties['displayOptions'];
		loadOptionsMethod?: string;
		loadOptionsDependsOn?: string[];
	} = {},
): INodeProperties => {
	const normalized = normalizeSchema(schema);
	const type = mapType(normalized);
	const property: INodeProperties = {
		displayName: options.displayName ?? normalized.title ?? humanize(name),
		name,
		type,
		default: type === 'boolean' ? false : '',
		required: options.required ?? false,
		description: options.description ?? normalized.description,
		displayOptions: options.displayOptions,
	};

	if (type === 'options') {
		property.options = toOptions(normalized.enum);
		property.default = (property.options as INodePropertyOptions[] | undefined)?.[0]?.value ?? '';
	}

	if (type === 'multiOptions') {
		property.options = toOptions(normalizeSchema(normalized.items).enum);
		property.default = [];
	}

	if (options.loadOptionsMethod !== undefined) {
		property.type = 'options';
		property.typeOptions = {
			loadOptionsMethod: options.loadOptionsMethod,
			loadOptionsDependsOn: options.loadOptionsDependsOn,
		};
		property.default = '';
		delete property.options;
	}

	return property;
};

export const buildPropertiesFromObjectSchema = (
	schema: JsonSchema | undefined,
	options: {
		namePrefix?: string;
		displayNamePrefix?: string;
		required?: boolean;
		displayOptions?: INodeProperties['displayOptions'];
		exclude?: Set<string>;
	} = {},
): INodeProperties[] => {
	const normalized = normalizeSchema(schema);
	const required = new Set(normalized.required ?? []);

	return Object.entries(normalized.properties ?? {}).flatMap(([key, propertySchema]) => {
		if (options.exclude?.has(key)) {
			return [];
		}

		const property = normalizeSchema(propertySchema);
		const type = readSchemaType(property);
		const name = `${options.namePrefix ?? ''}${key}`;
		const displayName = `${options.displayNamePrefix ?? ''}${property.title ?? humanize(key)}`;
		const isRequired = options.required === true || required.has(key);
		const fixedCollection = buildFixedCollectionProperty(name, property, {
			displayName,
			required: isRequired,
			displayOptions: options.displayOptions,
		});

		if (fixedCollection !== undefined) {
			return [fixedCollection];
		}

		if ((type === 'object' || property.properties !== undefined) && property.properties !== undefined) {
			return buildPropertiesFromObjectSchema(property, {
				namePrefix: `${name}.`,
				displayNamePrefix: `${displayName} / `,
				required: isRequired,
				displayOptions: options.displayOptions,
				exclude: options.exclude,
			});
		}

		return [
			buildNodeProperty(name, property, {
				displayName,
				required: isRequired,
				displayOptions: options.displayOptions,
			}),
		];
	});
};

export const getJsonRequestSchema = (
	schemaContainer:
		| {
				content?: Record<string, { schema?: JsonSchema }>;
		  }
		| undefined,
): JsonSchema | undefined =>
	schemaContainer?.content?.['application/json']?.schema ??
	Object.values(schemaContainer?.content ?? {})[0]?.schema;
