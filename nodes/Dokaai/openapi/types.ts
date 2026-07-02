export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head';

export type JsonSchema = {
	type?: string | string[];
	format?: string;
	title?: string;
	description?: string;
	default?: unknown;
	enum?: unknown[];
	items?: JsonSchema;
	properties?: Record<string, JsonSchema>;
	required?: string[];
	anyOf?: JsonSchema[];
	oneOf?: JsonSchema[];
	allOf?: JsonSchema[];
	additionalProperties?: boolean | JsonSchema;
};

export type OpenApiParameter = {
	name: string;
	in: 'path' | 'query' | 'header' | 'cookie';
	required?: boolean;
	description?: string;
	schema?: JsonSchema;
};

export type OpenApiOperation = {
	operationId?: string;
	summary?: string;
	description?: string;
	parameters?: OpenApiParameter[];
	requestBody?: {
		content?: Record<string, { schema?: JsonSchema }>;
	};
};

export type OpenApiDocument = {
	servers?: Array<{ url?: string }>;
	paths: Record<string, Partial<Record<HttpMethod, OpenApiOperation>>>;
	components?: {
		securitySchemes?: Record<string, { type?: string; in?: string; name?: string; scheme?: string }>;
	};
	security?: Array<Record<string, string[]>>;
};

export type OpenApiOperationDefinition = {
	method: HttpMethod;
	path: string;
	operation: OpenApiOperation;
};
