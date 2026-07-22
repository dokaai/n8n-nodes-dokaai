const assert = require('node:assert/strict');
const test = require('node:test');

const { DokaaiApi } = require('../../credentials/DokaaiApi.credentials');

test('Dokaai API credentials include an n8n credential test request', () => {
	const credentials = new DokaaiApi();

	assert.equal(credentials.test.request.method, 'GET');
	assert.equal(
		credentials.test.request.url,
		'https://api.dokaai.com/v1/dokaai/opm/organizations/services',
	);
	assert.deepEqual(credentials.test.request.headers, {
		'x-client-key': '={{$credentials.clientKey}}',
		'x-client-secret': '={{$credentials.clientSecret}}',
	});
});
