import type { INodeProperties } from 'n8n-workflow';

import { dynamicParameterLoaders } from '../loaders/config';
import { findOperationById } from '../openapi/runtime';
import { buildNodeProperty, buildPropertiesFromObjectSchema } from '../openapi/schema';
import { dokaaiOpenApiDocument } from '../shared/document';
import { sortPriorityFieldsFirst } from '../shared/fields';
import {
	excludedBodyFieldsForOperation,
	inferBodyRoot,
	operationBodySchema,
	supportsCustomerAttributeFields,
} from '../shared/operation-policy';
import { operationDisplayOptions } from './display-options';
import { buildCustomerAttributeResourceMapper } from './resource-mapper';
import { resourceGroups } from './resources';

const parameterDisplayName = (parameterName: string): string | undefined =>
	parameterName === 'filterOutTALId' ? 'Filter Out Target Audience List' : undefined;

const buildOperationFields = (resource: (typeof resourceGroups)[number]): INodeProperties[] =>
	resource.operationIds.flatMap((operationId) => {
		const { operation } = findOperationById(dokaaiOpenApiDocument, operationId);
		const displayOptions = operationDisplayOptions(resource.value, operationId);
		const parameters = sortPriorityFieldsFirst(
			(operation.parameters ?? []).map((parameter) =>
				buildNodeProperty(parameter.name, parameter.schema, {
					displayName: parameterDisplayName(parameter.name),
					description: parameter.description,
					required: parameter.required,
					displayOptions,
					loadOptionsMethod: dynamicParameterLoaders[parameter.name]?.method,
					loadOptionsDependsOn: dynamicParameterLoaders[parameter.name]?.dependsOn,
				}),
			),
		);
		const bodyRoot = inferBodyRoot(operation);
		const bodyFields = buildPropertiesFromObjectSchema(operationBodySchema(operation, bodyRoot), {
			displayOptions,
			exclude: excludedBodyFieldsForOperation(operation),
		});
		const customerAttributeFields = supportsCustomerAttributeFields(operationId)
			? [buildCustomerAttributeResourceMapper(displayOptions)]
			: [];

		return [...parameters, ...bodyFields, ...customerAttributeFields];
	});

export const operationFields: INodeProperties[] = resourceGroups.flatMap(buildOperationFields);
