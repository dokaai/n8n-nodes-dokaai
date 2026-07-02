const path = require('node:path');

const root = path.resolve(__dirname, '..');
require(path.join(root, 'test/register-typescript.cjs'));

const { dokaaiOpenApiDocument } = require(path.join(root, 'nodes/Dokaai/shared/document'));
const { HTTP_METHODS, findOperationById } = require(path.join(root, 'nodes/Dokaai/openapi/runtime'));
const { operationsByResource } = require(path.join(root, 'nodes/Dokaai/operations'));
const {
	customerAttributeMapperConfig,
	dynamicLoaderConfigs,
	dynamicParameterLoaders,
} = require(path.join(root, 'nodes/Dokaai/loaders/config'));

const errors = [];

const operationIdsInSpec = new Set();
for (const pathItem of Object.values(dokaaiOpenApiDocument.paths)) {
	for (const method of HTTP_METHODS) {
		const operationId = pathItem[method]?.operationId;
		if (operationId !== undefined) {
			operationIdsInSpec.add(operationId);
		}
	}
}

const selectedOperationIds = Object.values(operationsByResource).flat();
const seenSelectedOperationIds = new Set();

for (const [resource, operationIds] of Object.entries(operationsByResource)) {
	if (operationIds.length === 0) {
		errors.push(`Resource "${resource}" does not select any operations.`);
	}

	for (const operationId of operationIds) {
		if (seenSelectedOperationIds.has(operationId)) {
			errors.push(`Operation "${operationId}" is selected more than once.`);
		}

		seenSelectedOperationIds.add(operationId);

		if (!operationIdsInSpec.has(operationId)) {
			errors.push(`Selected operation "${operationId}" was not found in api/index.json.`);
		}
	}
}

for (const [parameterName, loader] of Object.entries(dynamicParameterLoaders)) {
	if (dynamicLoaderConfigs[loader.method] === undefined) {
		errors.push(`Parameter "${parameterName}" references unknown loader "${loader.method}".`);
	}
}

const validateLoaderConfig = (label, config) => {
	if (!operationIdsInSpec.has(config.operationId)) {
		errors.push(`${label} references missing operation "${config.operationId}".`);
		return;
	}

	const { operation } = findOperationById(dokaaiOpenApiDocument, config.operationId);
	const suppliedValues = new Set([
		...Object.keys(config.staticValues ?? {}),
		...(config.dependsOn ?? []),
	]);

	for (const parameter of operation.parameters ?? []) {
		if (parameter.required === true && !suppliedValues.has(parameter.name)) {
			errors.push(
				`${label} does not provide required ${parameter.in} parameter "${parameter.name}" for "${config.operationId}".`,
			);
		}
	}
};

for (const [method, config] of Object.entries(dynamicLoaderConfigs)) {
	validateLoaderConfig(`Loader "${method}"`, config);
}

validateLoaderConfig('Customer attribute resource mapper', customerAttributeMapperConfig);

if (errors.length > 0) {
	console.error('OpenAPI configuration validation failed:');
	for (const error of errors) {
		console.error(`- ${error}`);
	}
	process.exit(1);
}

console.log(
	`Validated ${selectedOperationIds.length} selected operation(s) and ${Object.keys(dynamicLoaderConfigs).length + 1} loader config(s).`,
);
