import type {
	ICredentialType,
	ICredentialTestRequest,
	INodeProperties,
} from 'n8n-workflow';

export class DokaaiApi implements ICredentialType {
	name = 'dokaaiApi';

	displayName = 'Dokaai API';

	documentationUrl = 'https://docs.dokaai.com';

	test: ICredentialTestRequest = {
		request: {
			method: 'GET',
			url: 'https://api.dokaai.com/v1/dokaai/opm/organizations/services',
			headers: {
				'x-client-key': '={{$credentials.clientKey}}',
				'x-client-secret': '={{$credentials.clientSecret}}',
			},
		},
	};

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

export { DokaaiApi as dokaai };
