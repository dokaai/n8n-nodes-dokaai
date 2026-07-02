const assert = require('node:assert/strict');
const test = require('node:test');

const {
	buildNodeProperty,
	buildPropertiesFromObjectSchema,
	normalizeSchema,
} = require('../../nodes/Dokaai/openapi/schema');

test('normalizeSchema picks the first non-null anyOf/oneOf branch', () => {
	const normalized = normalizeSchema({
		anyOf: [
			{ type: 'null' },
			{
				type: 'object',
				required: ['mode'],
				properties: {
					mode: { type: 'string' },
				},
			},
			{
				type: 'object',
				properties: {
					metadata: { type: 'object' },
				},
			},
		],
	});

	assert.deepEqual(Object.keys(normalized.properties), ['mode']);
	assert.deepEqual(normalized.required, ['mode']);
});

test('normalizeSchema merges allOf required fields and properties', () => {
	const normalized = normalizeSchema({
		allOf: [
			{
				type: 'object',
				required: ['fieldName'],
				properties: {
					fieldName: { type: 'string' },
				},
			},
			{
				required: ['fieldType'],
				properties: {
					fieldType: { type: 'string', enum: ['text', 'number'] },
				},
			},
		],
	});

	assert.deepEqual(normalized.required, ['fieldName', 'fieldType']);
	assert.deepEqual(Object.keys(normalized.properties), ['fieldName', 'fieldType']);
});

test('buildNodeProperty converts optional enums to clearable n8n options', () => {
	const property = buildNodeProperty('fieldType', {
		type: 'string',
		enum: ['text', 'number'],
	});

	assert.equal(property.type, 'options');
	assert.equal(property.default, '');
	assert.deepEqual(property.options, [
		{ name: 'None', value: '' },
		{ name: 'Text', value: 'text' },
		{ name: 'Number', value: 'number' },
	]);
});

test('buildNodeProperty keeps required enums clearable', () => {
	const property = buildNodeProperty(
		'mode',
		{
			type: 'string',
			enum: ['email', 'sms'],
		},
		{ required: true },
	);

	assert.equal(property.type, 'options');
	assert.equal(property.default, '');
	assert.deepEqual(property.options, [
		{ name: 'None', value: '' },
		{ name: 'Email', value: 'email' },
		{ name: 'Sms', value: 'sms' },
	]);
});

test('buildPropertiesFromObjectSchema converts object arrays to repeatable fixed collections', () => {
	const properties = buildPropertiesFromObjectSchema({
		type: 'object',
		required: ['customAttributes'],
		properties: {
			customAttributes: {
				type: 'array',
				items: {
					type: 'object',
					required: ['fieldName', 'fieldType'],
					properties: {
						fieldName: { type: 'string' },
						fieldType: { type: 'string', enum: ['text', 'number'] },
					},
				},
			},
		},
	});

	assert.equal(properties.length, 1);
	assert.equal(properties[0].name, 'customAttributes');
	assert.equal(properties[0].type, 'fixedCollection');
	assert.equal(properties[0].required, true);
	assert.equal(properties[0].typeOptions.multipleValues, true);
	assert.deepEqual(
		properties[0].options[0].values.map((field) => [field.name, field.type]),
		[
			['fieldName', 'string'],
			['fieldType', 'options'],
		],
	);
});

test('buildPropertiesFromObjectSchema converts primitive arrays to repeatable value rows', () => {
	const properties = buildPropertiesFromObjectSchema({
		type: 'object',
		properties: {
			customerIds: {
				type: 'array',
				items: { type: 'string' },
			},
		},
	});

	assert.equal(properties.length, 1);
	assert.equal(properties[0].name, 'customerIds');
	assert.equal(properties[0].type, 'fixedCollection');
	assert.equal(properties[0].typeOptions.multipleValues, true);
	assert.equal(properties[0].options[0].values[0].name, 'value');
});
