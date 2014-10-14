var ContextIO = require('../lib/ContextIO.js'),
	hlp = require('./helpers/helpers.js'),
	tData = require('./helpers/data.js').data.accounts.sources,
	vows = require('vows'),
	assert = require('assert'),
	fs = require('fs'),
	path = require('path');

var ctxio = new ContextIO.Client(hlp.apiVersion, 'https://api.context.io', hlp.apiKeys);

vows.describe('ContextIO/accounts/sources').addBatch({
	'Playing with folders': {
		'listing them': {
			topic: function () {
				ctxio.accounts(tData.accountId).sources(tData.label).folders().get(this.callback);
			},
			'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/sources/'+tData.label+'/folders', 'GET'),
			'responds with 200': hlp.macros.assertStatus(200),
			'returns a list of folders': function (err, r){
				assert.isArray(r.body);
				assert.ok('name' in r.body[0]);
				assert.ok('delim' in r.body[0]);
				assert.ok('nb_messages' in r.body[0]);
			}
		},
		'adding a new one': {
			topic: function () {
				ctxio.accounts(tData.folderAddAccount).sources(tData.folderAddSource).folders('Context.IO/test '+(new Date()).getTime()).put(this.callback);
			},
			'made the right API call': hlp.macros.assertCall('accounts/'+tData.folderAddAccount+'/sources/'+tData.folderAddSource+'/folders/*/*', 'PUT'),
			'responds with 201': hlp.macros.assertStatus(201)
		}
	}
}).export(module);