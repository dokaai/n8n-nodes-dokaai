const assert = require('node:assert/strict');
const test = require('node:test');

const {
	customerAttributeMapperConfig,
	dynamicLoaderConfigs,
	dynamicParameterLoaders,
} = require('../../nodes/Dokaai/loaders/config');
const { findOperationById } = require('../../nodes/Dokaai/openapi/runtime');
const { dokaaiOpenApiDocument } = require('../../nodes/Dokaai/shared/document');

test('dynamic parameter loaders point to declared loader configs', () => {
	for (const [parameterName, loader] of Object.entries(dynamicParameterLoaders)) {
		assert.ok(
			dynamicLoaderConfigs[loader.method],
			`${parameterName} should reference a declared loader config`,
		);
	}
});

test('dynamic loader operationIds exist in OpenAPI', () => {
	for (const [method, config] of Object.entries(dynamicLoaderConfigs)) {
		assert.doesNotThrow(
			() => findOperationById(dokaaiOpenApiDocument, config.operationId),
			`${method} should reference an OpenAPI operation`,
		);
	}

	assert.doesNotThrow(() =>
		findOperationById(dokaaiOpenApiDocument, customerAttributeMapperConfig.operationId),
	);
});

test('dependent dropdowns declare n8n loadOptionsDependsOn values', () => {
	assert.deepEqual(dynamicParameterLoaders.customerPoolId.dependsOn, ['projectId']);
	assert.deepEqual(dynamicParameterLoaders.targetAudienceListId.dependsOn, ['projectId']);
	assert.deepEqual(dynamicParameterLoaders.notificationHandlerId.dependsOn, ['projectId']);
});
