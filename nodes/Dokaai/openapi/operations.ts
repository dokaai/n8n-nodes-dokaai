import { findOperationById, humanize, toSnakeCase } from './runtime';
import type { OpenApiDocument } from './types';

export type ResourceOperationGroup = {
	name: string;
	value: string;
	operationIds: readonly string[];
};

const resourceValueFromTag = (tag: string): string => toSnakeCase(tag).replace(/_/g, '');

const operationResourceTag = (document: OpenApiDocument, operationId: string): string => {
	const { operation } = findOperationById(document, operationId);
	const [tag] = operation.tags ?? [];

	if (tag === undefined || tag.trim() === '') {
		return 'Other';
	}

	return tag;
};

export const groupOperationIdsByFirstTag = (
	document: OpenApiDocument,
	operationIds: readonly string[],
): ResourceOperationGroup[] => {
	const groups = new Map<string, ResourceOperationGroup>();

	for (const operationId of operationIds) {
		const tag = operationResourceTag(document, operationId);
		const value = resourceValueFromTag(tag);
		const existing = groups.get(value);

		if (existing === undefined) {
			groups.set(value, {
				name: humanize(tag),
				value,
				operationIds: [operationId],
			});
			continue;
		}

		groups.set(value, {
			...existing,
			operationIds: [...existing.operationIds, operationId],
		});
	}

	return [...groups.values()];
};
