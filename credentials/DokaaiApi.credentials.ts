import type {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class DokaaiApi implements ICredentialType {
	name = 'dokaaiApi';

	displayName = 'Dokaai API';

	documentationUrl = 'https://docs.dokaai.com';

	properties: INodeProperties[] = [
		{
			displayName: 'Client Key',
			name: 'clientKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
	];
}
