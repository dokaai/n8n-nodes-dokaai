import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { dokaaiLoadOptions, dokaaiResourceMapping, executeOpenApiOperation } from './GenericFunctions';
import { operationFields, operationOptions, resourceOptions } from './OperationDescription';

export class Dokaai implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Dokaai',
		name: 'dokaai',
		icon: 'file:dokaai.icon.svg',
		group: ['output'],
		version: 1,
		description: 'Use Dokaai APIs in n8n workflows',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'Dokaai',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'dokaaiApi',
				required: true,
			},
		],
		properties: [
			resourceOptions,
			...operationOptions,
			...operationFields,
		],
	};

	methods = {
		loadOptions: dokaaiLoadOptions,
		resourceMapping: dokaaiResourceMapping,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const operation = this.getNodeParameter('operation', itemIndex) as string;
			returnData.push(await executeOpenApiOperation(this, itemIndex, operation));
		}

		return [returnData];
	}
}
