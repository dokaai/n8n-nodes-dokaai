const assert = require('node:assert/strict');
const test = require('node:test');

const { dokaaiLoadOptions } = require('../../nodes/Dokaai/shared/loadOptions');

const contextFor = ({ currentParameters = {}, response, error } = {}) => ({
	getCurrentNodeParameter(name) {
		return currentParameters[name];
	},
	async getCredentials() {
		return {
			clientKey: 'key',
			clientSecret: 'secret',
		};
	},
	helpers: {
		async httpRequest() {
			if (error) {
				throw error;
			}

			return response;
		},
	},
});

test('dynamic dropdowns include None when options load successfully', async () => {
	const options = await dokaaiLoadOptions.getProjects.call(
		contextFor({
			response: {
				data: [{ id: 'project-1', name: 'Project 1' }],
			},
		}),
	);

	assert.deepEqual(options[0], { name: 'None', value: '' });
	assert.deepEqual(options[1], { name: 'Project 1', value: 'project-1' });
});

test('dynamic dropdowns include None when no options are returned', async () => {
	const options = await dokaaiLoadOptions.getProjects.call(
		contextFor({
			response: { data: [] },
		}),
	);

	assert.deepEqual(options[0], { name: 'None', value: '' });
	assert.match(options[1].name, /No options found/);
});

test('dynamic dropdowns include None when option loading fails', async () => {
	const options = await dokaaiLoadOptions.getProjects.call(
		contextFor({
			error: new Error('Network failed'),
		}),
	);

	assert.deepEqual(options[0], { name: 'None', value: '' });
	assert.match(options[1].name, /Network failed/);
});
