var ContextIO = require('../lib/ContextIO.js'),
	hlp = require('./helpers/helpers.js'),
	tData = require('./helpers/data.js').data.accounts.files,
	vows = require('vows'),
	assert = require('assert'),
	fs = require('fs'),
	path = require('path');

var ctxio = new ContextIO.Client(hlp.apiVersion, 'https://api.context.io', hlp.apiKeys);

vows.describe('ContextIO/accounts/files').addBatch({
	'A list query': {
		topic: function () {
			ctxio.accounts(tData.account_id).files().get(tData.listFilter.params, this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.account_id+'/files', 'GET'),
		'responds with 200': hlp.macros.assertStatus(200),
		'returns an array': hlp.macros.assertBodyType('isArray'),
		'returns what looks like files': function (err, r) {
			assert.ok(('file_id' in r.body[0]));
			assert.ok(('file_name' in r.body[0]));
			assert.ok(('size' in r.body[0]));
			assert.ok(('body_section' in r.body[0]));
		},
		'returns the expected results': function (err, r) {
			if ('limit' in tData.listFilter.params) assert.equal(r.body.length, tData.listFilter.params.limit);
			if ('expectedType' in tData.listFilter) {
				for (var i = 0, iMax = r.body.length; i < iMax; ++i) {
					assert.equal(r.body[i].type, tData.listFilter.expectedType);
				}
			}
		}
	}
}).addBatch({
	'Fetching a given file': {
		topic: function () {
			ctxio.accounts(tData.account_id).files(tData.file_id).get(this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.account_id+'/files/'+tData.file_id, 'GET'),
		'responds with 200': hlp.macros.assertStatus(200),
		'returns an object': hlp.macros.assertBodyType('isObject')
	}
}).addBatch({
	'Fetching a file\'s content': {
		topic: function () {
			ctxio.accounts(tData.account_id).files(tData.file_id).content().get(path.join(__dirname, 'helpers', 'testDownload'), this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.account_id+'/files/'+tData.file_id+'/content', 'GET'),
		'responds with 200': hlp.macros.assertStatus(200),
		'saved a valid file': function (err, r) {
			assert.ok(('savedTo' in r && r.savedTo == path.join(__dirname, 'helpers', 'testDownload')));
			var stats = fs.statSync(r.savedTo);
			assert.ok(stats.isFile());
			assert.ok((stats.size > 0));
			//fs.unlinkSync(r.savedTo);
		}
	},
	'Fetching a file\'s related files': {
		topic: function () {
			ctxio.accounts(tData.account_id).files(tData.file_id).related().get(this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.account_id+'/files/'+tData.file_id+'/related', 'GET'),
		'responds with 200': hlp.macros.assertStatus(200),
		'returns an array': hlp.macros.assertBodyType('isArray')
	},
	'Fetching a file\'s revisions': {
		topic: function () {
			ctxio.accounts(tData.account_id).files(tData.file_id).revisions().get(this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.account_id+'/files/'+tData.file_id+'/revisions', 'GET'),
		'responds with 200': hlp.macros.assertStatus(200),
		'returns an array': hlp.macros.assertBodyType('isArray')
	}
}).export(module);