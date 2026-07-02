import type { IDataObject, IHttpRequestOptions } from 'n8n-workflow';

import type { HttpMethod, OpenApiDocument, OpenApiOperationDefinition } from './types';

export const HTTP_METHODS: readonly HttpMethod[] = [
	'get',
	'post',
	'put',
	'patch',
	'delete',
	'options',
	'head',
];

export const toSnakeCase = (value: string): string =>
	value
		.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
		.replace(/[\s-]+/g, '_')
		.replace(/_+/g, '_')
		.toLowerCase();

export const humanize = (value: string): string =>
	value
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\b\w/g, (character) => character.toUpperCase());

export const getOpenApiBaseUrl = (document: OpenApiDocument): string => {
	const serverUrl = document.servers?.[0]?.url;

	if (!serverUrl?.trim()) {
		throw new Error('OpenAPI spec must define at least one server URL.');
	}

	return serverUrl.replace(/\/+$/, '');
};

export const findOperationById = (
	document: OpenApiDocument,
	operationId: string,
): OpenApiOperationDefinition => {
	for (const [path, pathItem] of Object.entries(document.paths)) {
		for (const method of HTTP_METHODS) {
			const operation = pathItem[method];

			if (operation?.operationId === operationId) {
				return { method, path, operation };
			}
		}
	}

	throw new Error(`OpenAPI operationId "${operationId}" was not found.`);
};

export const pathFromTemplate = (template: string, values: Record<string, unknown>): string =>
	template.replace(/\{([^}]+)\}/g, (_match, rawName: string) => {
		const value = values[rawName];

		if (typeof value !== 'string' && typeof value !== 'number') {
			throw new Error(`${rawName} is required.`);
		}

		return encodeURIComponent(String(value));
	});

export const shouldIncludeValue = (value: unknown): boolean =>
	value !== undefined && value !== null && value !== '';

export const buildAuthHeaders = (
	document: OpenApiDocument,
	credentials: IDataObject,
): Record<string, string> => {
	const securityRequirement = document.security?.[0];
	const schemes = document.components?.securitySchemes ?? {};
	const headers: Record<string, string> = {};

	for (const schemeKey of Object.keys(securityRequirement ?? {})) {
		const scheme = schemes[schemeKey];

		if (scheme?.type !== 'apiKey' || scheme.in !== 'header') {
			continue;
		}

		const headerName = scheme.name ?? schemeKey;
		const credentialKey = headerName === 'x-client-key' ? 'clientKey' : headerName === 'x-client-secret' ? 'clientSecret' : headerName;
		const value = credentials[credentialKey];

		if (typeof value !== 'string' || value.length === 0) {
			throw new Error(`${credentialKey} is required.`);
		}

		headers[headerName] = value;
	}

	return headers;
};

export const buildRequestOptions = (
	document: OpenApiDocument,
	definition: OpenApiOperationDefinition,
	values: Record<string, unknown>,
	credentials: IDataObject,
): IHttpRequestOptions => {
	const url = `${getOpenApiBaseUrl(document)}${pathFromTemplate(definition.path, values)}`;
	const qs: IDataObject = {};

	for (const parameter of definition.operation.parameters ?? []) {
		if (parameter.in !== 'query') {
			continue;
		}

		const value = values[parameter.name];
		if (shouldIncludeValue(value)) {
			qs[parameter.name] = value as IDataObject[string];
		} else if (parameter.required === true && shouldIncludeValue(parameter.schema?.default)) {
			qs[parameter.name] = parameter.schema?.default as IDataObject[string];
		}
	}

	const options: IHttpRequestOptions = {
		method: definition.method.toUpperCase() as IHttpRequestOptions['method'],
		url,
		headers: {
			Accept: 'application/json',
			...buildAuthHeaders(document, credentials),
		},
		qs,
		json: true,
	};

	const body = values.body;
	if (shouldIncludeValue(body)) {
		options.body = body as IDataObject;
		options.headers = {
			...options.headers,
			'Content-Type': 'application/json',
		};
	}

	return options;
};
