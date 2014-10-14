var ContextIO = require('../lib/ContextIO.js'),
	hlp = require('./helpers/helpers.js'),
	tData = require('./helpers/data.js').data.accounts.contacts,
	vows = require('vows'),
	assert = require('assert'),
	fs = require('fs'),
	path = require('path');

var ctxio = new ContextIO.Client(hlp.apiVersion, 'https://api.context.io', hlp.apiKeys);

vows.describe('ContextIO/accounts/contacts').addBatch({
	'A query': {
		'being made': {
			topic: function () {
				ctxio.accounts(tData.account_id).contacts().get(this.callback);
			},
			'made the right API call': hlp.macros.assertCall('accounts/'+tData.account_id+'/contacts', 'GET'),
			'responds with 200': hlp.macros.assertStatus(200),
			'returns an object': hlp.macros.assertBodyType('isObject')
		},
		'being made on a name': {
			topic: function () {
				ctxio.accounts(tData.account_id).contacts().get({ search: tData.searchTest.search[0] }, this.callback);
			},
			'made the right API call': hlp.macros.assertCall('accounts/'+tData.account_id+'/contacts', 'GET'),
			'responds with 200': hlp.macros.assertStatus(200),
			'returns the expected email address': function (err, r) {
				assert.equal(r.body.matches[0].email, tData.searchTest.search[1])
			}
		}
	}
}).addBatch({
	'Fetching a given contact': {
		topic: function () {
			ctxio.accounts(tData.account_id).contacts(tData.email).get(this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.account_id+'/contacts/'+tData.email, 'GET'),
		'responds with 200': hlp.macros.assertStatus(200),
		'returns an object': hlp.macros.assertBodyType('isObject')
	}
}).addBatch({
	'Fetching 3 of a given contact\'s files': {
		topic: function () {
			ctxio.accounts(tData.account_id).contacts(tData.email).files().get({ limit:3 }, this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.account_id+'/contacts/'+tData.email+'/files', 'GET'),
		'responds with 200': hlp.macros.assertStatus(200),
		'returns an array of 3 items': function (err, r) {
			assert.isArray(r.body);
			assert.equal(r.body.length, 3);
		},
		'returns what looks like files': function (err, r) {
			assert.ok(('file_id' in r.body[0]));
			assert.ok(('file_name' in r.body[0]));
			assert.ok(('size' in r.body[0]));
			assert.ok(('body_section' in r.body[0]));
		}
	},
	'Fetching 5 of a given contact\'s messages': {
		topic: function () {
			ctxio.accounts(tData.account_id).contacts(tData.email).messages().get({limit:5}, this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.account_id+'/contacts/'+tData.email+'/messages', 'GET'),
		'responds with 200': hlp.macros.assertStatus(200),
		'returns an array of 5 items': function (err, r) {
			assert.isArray(r.body);
			assert.equal(r.body.length, 5);
		},
		'returns what looks like messages': function (err, r) {
			assert.ok(('email_message_id' in r.body[0]));
			assert.ok(('sources' in r.body[0]));
			assert.ok(('folders' in r.body[0]));
		}
	},
	'Fetching a given contact\'s threads': {
		topic: function () {
			ctxio.accounts(tData.account_id).contacts(tData.email).threads().get(this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.account_id+'/contacts/'+tData.email+'/threads', 'GET'),
		'responds with 200': hlp.macros.assertStatus(200),
		'returns an array of strings': function (err, r) {
			assert.isArray(r.body);
			assert.isString(r.body[0]);
		}
	}
}).export(module);