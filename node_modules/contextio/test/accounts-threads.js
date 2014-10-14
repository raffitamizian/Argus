var ContextIO = require('../lib/ContextIO.js'),
	hlp = require('./helpers/helpers.js'),
	tData = require('./helpers/data.js').data.accounts.threads,
	vows = require('vows'),
	assert = require('assert'),
	fs = require('fs'),
	path = require('path');

var ctxio = new ContextIO.Client(hlp.apiVersion, 'https://api.context.io', hlp.apiKeys);

vows.describe('ContextIO/accounts/threads').addBatch({
	'Fetching a list': {
		topic: function () {
			ctxio.accounts(tData.accountId).threads().get(this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/threads', 'GET'),
		'responds with 200': hlp.macros.assertStatus(200),
		'returns an array of strings': function (err, r) {
			assert.isArray(r.body);
			assert.isString(r.body[0]);
		}
	},
	'Fetching an instance': {
		topic: function () {
			ctxio.accounts(tData.accountId).threads(tData.gmThreadId).get(this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/threads/'+tData.gmThreadId, 'GET'),
		'responds with 200': hlp.macros.assertStatus(200),
		'returns the expected object structure': function (err, r) {
			assert.isObject(r.body);
			assert.ok('gmail_thread_id' in r.body);
			assert.ok('email_message_ids' in r.body);
			assert.ok('messages' in r.body);
		}
	}
}).export(module);