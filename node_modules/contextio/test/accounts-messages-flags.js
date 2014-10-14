var ContextIO = require('../lib/ContextIO.js'),
	hlp = require('./helpers/helpers.js'),
	tData = require('./helpers/data.js').data.accounts.messages,
	vows = require('vows'),
	assert = require('assert'),
	fs = require('fs'),
	path = require('path');

var ctxio = new ContextIO.Client(hlp.apiVersion, 'https://api.context.io', hlp.apiKeys);

vows.describe('ContextIO/accounts/messages').addBatch({
	'Fetching flags': {
		topic: function () {
			ctxio.accounts(tData.accountId).messages(tData.messageId).flags().get(this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/messages/'+tData.messageId+'/flags', 'GET'),
		'responds with 200': hlp.macros.assertStatus(200),
		'returns an object': hlp.macros.assertBodyType('isObject')
	},
	'Setting flags': {
		topic: function () {
			ctxio.accounts(tData.accountId).messages(tData.messageId).flags().post({seen:0, flagged:1},this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/messages/'+tData.messageId+'/flags', 'POST'),
		'responds with 200': hlp.macros.assertStatus(200),
		'returns an object': hlp.macros.assertBodyType('isObject'),
		'fetching flags again': {
			topic: function () {
				ctxio.accounts(tData.accountId).messages(tData.messageId).flags().get(this.callback);
			},
			'confirms flags are set correctly': function (err, r) {
				assert.ok(!r.body.seen);
				assert.ok(r.body.flagged);
			}
		}
	}
}).export(module);