const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
require(path.join(root, 'test/register-typescript.cjs'));

const specPath = path.join(root, 'api/index.json');
const operationsPath = path.join(root, 'nodes/Dokaai/operations.ts');
const testPath = path.join(root, 'test/integration/openapi-generated.test.js');

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const { operationsByResource } = require(operationsPath);

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
const EXCLUDED_BODY_FIELDS = new Set([
	'organizationId',
	'projectId',
	'createdById',
	'createdDate',
	'modifiedById',
	'modifiedDate',
	'isActive',
	'isDeleted',
]);
const CUSTOMER_ATTRIBUTE_OPERATION_IDS = new Set([
	'addCustomersToPool',
	'updateCustomerInPool',
]);

const normalizeSchema = (schema) => {
	if (!schema) {
		return {};
	}

	const unionSchema = [...(schema.anyOf || []), ...(schema.oneOf || [])].find(
		(candidate) => candidate.type !== 'null',
	);

	if (unionSchema) {
		return normalizeSchema(unionSchema);
	}

	if (!schema.allOf) {
		return schema;
	}

	return schema.allOf.reduce(
		(current, part) => {
			const normalized = normalizeSchema(part);
			return {
				...current,
				...normalized,
				required: [...(current.required || []), ...(normalized.required || [])],
				properties: {
					...(current.properties || {}),
					...(normalized.properties || {}),
				},
			};
		},
		Object.fromEntries(Object.entries(schema).filter(([key]) => key !== 'allOf')),
	);
};

const readSchemaType = (schema) => {
	const type = normalizeSchema(schema).type;

	if (typeof type === 'string') {
		return type;
	}

	return type?.find((entry) => entry !== 'null');
};

const jsonSchemaFromContent = (container) =>
	container?.content?.['application/json']?.schema ||
	Object.values(container?.content || {})[0]?.schema;

const findOperation = (operationId) => {
	for (const [operationPath, pathItem] of Object.entries(spec.paths)) {
		for (const method of HTTP_METHODS) {
			const operation = pathItem[method];

			if (operation?.operationId === operationId) {
				return { operationPath, method, operation };
			}
		}
	}

	throw new Error(`operationId not found in OpenAPI spec: ${operationId}`);
};

const inferBodyRoot = (operation) => {
	const requestSchema = normalizeSchema(jsonSchemaFromContent(operation.requestBody));
	const properties = requestSchema.properties || {};
	const requiredObjectProperties = (requestSchema.required || []).filter(
		(propertyName) => {
			const property = normalizeSchema(properties[propertyName]);
			return property.type === 'object' || property.allOf;
		},
	);

	return requiredObjectProperties.length === 1
		? requiredObjectProperties[0]
		: undefined;
};

const operationBodySchema = (operation, bodyRoot) => {
	const requestSchema = normalizeSchema(jsonSchemaFromContent(operation.requestBody));
	return bodyRoot
		? normalizeSchema(requestSchema.properties?.[bodyRoot])
		: requestSchema;
};

const shouldIncludeValue = (value) =>
	value !== undefined && value !== null && value !== '';

const fieldExample = (key, schema) => {
	const normalized = normalizeSchema(schema);
	const type = readSchemaType(normalized);

	if (normalized.enum?.length) {
		return normalized.enum[0];
	}

	if (type === 'array') {
		const itemSchema = normalizeSchema(normalized.items);
		const itemType = readSchemaType(itemSchema);

		if (itemType === 'object' || itemSchema.properties) {
			return [
				Object.fromEntries(
					Object.entries(itemSchema.properties || {}).map(([childKey, childSchema]) => [
						childKey,
						fieldExample(childKey, childSchema),
					]),
				),
			];
		}

		return [`${key}-1`, `${key}-2`];
	}

	if (type === 'boolean') {
		return true;
	}

	if (type === 'integer' || type === 'number') {
		return 1;
	}

	if (type === 'object' || normalized.properties) {
		return {};
	}

	return `${key}-value`;
};

const n8nInputValue = (fieldName, schema) => {
	const normalized = normalizeSchema(schema);
	const type = readSchemaType(normalized);

	if (type !== 'array') {
		return fieldExample(fieldName, normalized);
	}

	const itemSchema = normalizeSchema(normalized.items);
	const itemType = readSchemaType(itemSchema);
	const values = fieldExample(fieldName, normalized);

	if (itemType === 'object' || itemSchema.properties) {
		return { [fieldName]: values };
	}

	return {
		[fieldName]: values.map((value) => ({ value })),
	};
};

const expectedBodyValue = (schema, inputValue, fieldName) => {
	const normalized = normalizeSchema(schema);
	const type = readSchemaType(normalized);

	if (type !== 'array') {
		return inputValue;
	}

	if (
		inputValue &&
		typeof inputValue === 'object' &&
		!Array.isArray(inputValue) &&
		Array.isArray(inputValue[fieldName])
	) {
		return inputValue[fieldName].map((item) => {
			if (
				item &&
				typeof item === 'object' &&
				!Array.isArray(item) &&
				Object.keys(item).length === 1 &&
				Object.prototype.hasOwnProperty.call(item, 'value')
			) {
				return item.value;
			}

			return item;
		});
	}

	return inputValue;
};

const setPathValue = (target, valuePath, value) => {
	const segments = valuePath.split('.');
	let current = target;

	for (const segment of segments.slice(0, -1)) {
		current[segment] = current[segment] || {};
		current = current[segment];
	}

	current[segments.at(-1)] = value;
};

const collectBodyFields = (schema, excluded, prefix = '') => {
	const normalized = normalizeSchema(schema);

	return Object.entries(normalized.properties || {}).flatMap(([key, propertySchema]) => {
		if (excluded.has(key)) {
			return [];
		}

		const property = normalizeSchema(propertySchema);
		const type = readSchemaType(property);
		const name = `${prefix}${key}`;

		if ((type === 'object' || property.properties) && property.properties) {
			return collectBodyFields(property, excluded, `${name}.`);
		}

		return [{ name, key, schema: property }];
	});
};

const buildExpectedBody = (bodyFields, inputData, bodyRoot) => {
	const body = {};

	for (const field of bodyFields) {
		const value = expectedBodyValue(field.schema, inputData[field.name], field.name);

		if (shouldIncludeValue(value)) {
			setPathValue(body, field.name, value);
		}
	}

	if (!Object.keys(body).length) {
		return undefined;
	}

	return bodyRoot ? { [bodyRoot]: body } : body;
};

const expectedUrl = (operationPath, inputData) => {
	const baseUrl = spec.servers[0].url.replace(/\/+$/, '');
	const pathWithValues = operationPath.replace(/\{([^}]+)\}/g, (_match, name) =>
		encodeURIComponent(String(inputData[name])),
	);

	return `${baseUrl}${pathWithValues}`;
};

const authHeaders = () => {
	const requirement = spec.security?.[0] || {};
	const schemes = spec.components?.securitySchemes || {};
	const headers = {};

	for (const schemeKey of Object.keys(requirement)) {
		const scheme = schemes[schemeKey];

		if (scheme?.type === 'apiKey' && scheme.in === 'header') {
			headers[scheme.name || schemeKey] = `${scheme.name || schemeKey}-value`;
		}
	}

	return headers;
};

const buildFixture = (operationId, resource) => {
	const { operationPath, method, operation } = findOperation(operationId);
	const parameters = operation.parameters || [];
	const bodyRoot = inferBodyRoot(operation);
	const bodySchema = operationBodySchema(operation, bodyRoot);
	const excluded = new Set([
		...EXCLUDED_BODY_FIELDS,
		...parameters
			.filter((parameter) => parameter.in === 'path' || parameter.in === 'query')
			.map((parameter) => parameter.name),
	]);
	const bodyFields = collectBodyFields(bodySchema, excluded);
	const inputData = {};

	for (const parameter of parameters.filter((entry) => entry.in === 'path')) {
		inputData[parameter.name] = `${parameter.name} value`;
	}

	for (const parameter of parameters.filter((entry) => entry.in === 'query')) {
		inputData[parameter.name] = fieldExample(parameter.name, parameter.schema);
	}

	for (const field of bodyFields) {
		inputData[field.name] = n8nInputValue(field.name, field.schema);
	}

	let expectedBody = buildExpectedBody(bodyFields, inputData, bodyRoot);

	if (CUSTOMER_ATTRIBUTE_OPERATION_IDS.has(operationId)) {
		inputData.customerAttributes = {
			mappingMode: 'defineBelow',
			value: {
				test_custom_attribute: 'custom-value',
			},
			matchingColumns: [],
			schema: [],
			attemptToConvertTypes: false,
			convertFieldsToString: false,
		};

		if (!expectedBody) {
			expectedBody = bodyRoot
				? { [bodyRoot]: {} }
				: {};
		}

		const bodyTarget = bodyRoot ? expectedBody[bodyRoot] : expectedBody;
		bodyTarget.test_custom_attribute = 'custom-value';
	}

	const expectedQs = Object.fromEntries(
		parameters
			.filter((parameter) => parameter.in === 'query')
			.map((parameter) => [parameter.name, inputData[parameter.name]])
			.filter(([, value]) => shouldIncludeValue(value)),
	);

	return {
		operationId,
		resource,
		method: method.toUpperCase(),
		parameters: parameters.map((parameter) => parameter.name),
		bodyFieldNames: bodyFields.map((field) => field.name),
		hasCustomerAttributeMapper: CUSTOMER_ATTRIBUTE_OPERATION_IDS.has(operationId),
		inputData,
		expectedUrl: expectedUrl(operationPath, inputData),
		expectedQs,
		expectedBody,
		expectedAuthHeaders: authHeaders(),
	};
};

const fixtures = Object.entries(operationsByResource).flatMap(([resource, operationIds]) =>
	operationIds.map((operationId) => buildFixture(operationId, resource)),
);

const testSource = `// Auto-generated by npm run generate:tests.
// Do not edit directly; update api/index.json or nodes/Dokaai/operations.ts.

const assert = require('node:assert/strict');
const test = require('node:test');

const { Dokaai } = require('../../index');
const { dokaaiOpenApiDocument } = require('../../nodes/Dokaai/shared/document');
const { findOperationById, buildRequestOptions } = require('../../nodes/Dokaai/openapi/runtime');
const { readOperationValues } = require('../../nodes/Dokaai/shared/values');

const operationsByResource = ${JSON.stringify(operationsByResource, null, 2)};
const operationFixtures = ${JSON.stringify(fixtures, null, 2)};

const getNodeParameterContext = (inputData) => ({
	getNodeParameter: (name, _itemIndex, defaultValue) =>
		Object.prototype.hasOwnProperty.call(inputData, name)
			? inputData[name]
			: defaultValue,
});

test('Dokaai node exposes selected OpenAPI operations by n8n resource', () => {
	const node = new Dokaai();
	const resourceProperty = node.description.properties.find((property) => property.name === 'resource');

	assert.ok(resourceProperty);
	assert.deepEqual(
		resourceProperty.options.map((option) => option.value),
		Object.keys(operationsByResource),
	);

	for (const [resource, operationIds] of Object.entries(operationsByResource)) {
		const operationProperty = node.description.properties.find(
			(property) =>
				property.name === 'operation' &&
				property.displayOptions?.show?.resource?.includes(resource),
		);

		assert.ok(operationProperty, \`Missing operation selector for resource \${resource}\`);
		assert.deepEqual(
			operationProperty.options.map((option) => option.value),
			operationIds,
		);
	}
});

test('Dokaai node generates expected fields from OpenAPI params and request bodies', () => {
	const node = new Dokaai();

	for (const fixture of operationFixtures) {
		const fields = node.description.properties.filter((property) =>
			property.displayOptions?.show?.operation?.includes(fixture.operationId),
		);
		const fieldNames = fields.map((field) => field.name);

		for (const parameter of fixture.parameters) {
			assert.ok(
				fieldNames.includes(parameter),
				\`\${fixture.operationId} should include parameter field \${parameter}\`,
			);
		}

		for (const bodyFieldName of fixture.bodyFieldNames) {
			assert.ok(
				fieldNames.includes(bodyFieldName),
				\`\${fixture.operationId} should include body field \${bodyFieldName}\`,
			);
		}

		if (fixture.hasCustomerAttributeMapper) {
			const mapperField = fields.find((field) => field.name === 'customerAttributes');
			assert.equal(mapperField?.type, 'resourceMapper');
			assert.deepEqual(mapperField.typeOptions?.loadOptionsDependsOn, [
				'projectId',
				'customerPoolId',
			]);
		}
	}
});

test('Dokaai generated enum dropdown fields are clearable', () => {
	const node = new Dokaai();

	for (const fixture of operationFixtures) {
		const fields = node.description.properties.filter((property) =>
			property.displayOptions?.show?.operation?.includes(fixture.operationId),
		);

		for (const field of fields.filter((property) => property.type === 'options' && Array.isArray(property.options))) {
			assert.deepEqual(
				field.options[0],
				{ name: 'None', value: '' },
				\`\${fixture.operationId}.\${field.name} should include a clear selection option\`,
			);
		}
	}

	const listPoolCustomerSearchField = node.description.properties.find((property) =>
		property.name === 'searchField' &&
		property.displayOptions?.show?.operation?.includes('getPoolCustomers'),
	);
	assert.deepEqual(listPoolCustomerSearchField?.options?.[0], { name: 'None', value: '' });
});

test('Dokaai request builder matches OpenAPI method, URL, auth, query, and body shape', () => {
	for (const fixture of operationFixtures) {
		const definition = findOperationById(dokaaiOpenApiDocument, fixture.operationId);
		const values = readOperationValues(
			getNodeParameterContext(fixture.inputData),
			definition.operation,
			undefined,
			0,
		);
		const request = buildRequestOptions(dokaaiOpenApiDocument, definition, values, {
			clientKey: 'x-client-key-value',
			clientSecret: 'x-client-secret-value',
		});

		assert.equal(request.method, fixture.method);
		assert.equal(request.url, fixture.expectedUrl);
		assert.deepEqual(request.qs, fixture.expectedQs);
		assert.deepEqual(
			{
				'x-client-key': request.headers['x-client-key'],
				'x-client-secret': request.headers['x-client-secret'],
			},
			fixture.expectedAuthHeaders,
		);

		if (fixture.expectedBody === undefined) {
			assert.equal(request.body, undefined);
		} else {
			assert.deepEqual(request.body, fixture.expectedBody);
		}
	}
});
`;

fs.mkdirSync(path.dirname(testPath), { recursive: true });
fs.writeFileSync(testPath, testSource);

console.log(
	`Generated ${path.relative(root, testPath)} for ${fixtures.length} operation(s).`,
);
