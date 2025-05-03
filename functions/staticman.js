const { processEntry } = require('@staticman/netlify-functions');
const queryString = require('querystring');

exports.handler = (event, context, callback) => {
	const username = 'sivakusayan';
    const repository = 'blog'
	const bodyData = queryString.parse(event.body);

	event.queryStringParameters = {
		...event.queryStringParameters,
		...bodyData,
		username,
		repository,
	};

	const config = {
		origin: event.headers.origin,
		sites: {
			[`${username}/${repository}`]: {
				allowedFields: ['name', 'message', 'post'],
				branch: 'main',
				commitMessage: 'Add comment by {fields.name}',
				filename: 'entry{@timestamp}',
				format: 'json',
				generatedFields: {
                    id: '{fields.name}-{@timestamp}'
					date: {
						type: 'date',
					},
				},
				moderation: false,
				path: `_data/comments/{fields.post}`,
				requiredFields: ['name', 'message', 'post'],
			},
		},
	};

	return processEntry(event, context, callback, config);
};
