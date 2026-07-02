import type { INodeProperties } from 'n8n-workflow';

type FieldWithName = {
	name?: string;
};

const priorityByFieldName: Record<string, number> = {
	projectId: 0,
	customerPoolId: 1,
};

export const sortPriorityFieldsFirst = <Field>(fields: readonly Field[]): Field[] =>
	[...fields].sort((left, right) => {
		const leftName = typeof left === 'object' && left !== null ? (left as FieldWithName).name : undefined;
		const rightName = typeof right === 'object' && right !== null ? (right as FieldWithName).name : undefined;
		const leftPriority = leftName === undefined ? undefined : priorityByFieldName[leftName];
		const rightPriority = rightName === undefined ? undefined : priorityByFieldName[rightName];

		if (leftPriority !== undefined && rightPriority !== undefined) {
			return leftPriority - rightPriority;
		}

		if (leftPriority !== undefined) {
			return -1;
		}

		if (rightPriority !== undefined) {
			return 1;
		}

		return 0;
	});

export const withOperationDisplay = (
	resource: 'action' | 'search',
	operationId: string,
): Pick<INodeProperties, 'displayOptions'> => ({
	displayOptions: {
		show: {
			resource: [resource],
			operation: [operationId],
		},
	},
});
