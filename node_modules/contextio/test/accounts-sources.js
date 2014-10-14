var ContextIO = require('../lib/ContextIO.js'),
	hlp = require('./helpers/helpers.js'),
	tData = require('./helpers/data.js').data.accounts.sources,
	vows = require('vows'),
	assert = require('assert'),
	fs = require('fs'),
	path = require('path');

var ctxio = new ContextIO.Client(hlp.apiVersion, 'https://api.context.io', hlp.apiKeys);

vows.describe('ContextIO/accounts/sources').addBatch({
	'A list being fetched': {
		topic: function () {
			ctxio.accounts(tData.accountId).sources().get(this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/sources', 'GET'),
		'responds with 200': hlp.macros.assertStatus(200),
		'returns an array': hlp.macros.assertBodyType('isArray')
	}
}).addBatch({
	'Manipulating instances  by creating one': {
		topic: function () {
			ctxio.accounts(tData.accountId).sources().post(tData.createParams, this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/sources', 'POST'),
		'responds with 201': hlp.macros.assertStatus(201),
		
		'and fetching it': {
			topic: function (createResp) {
				ctxio.accounts(tData.accountId).sources(createResp.body.label).get(this.callback);
			},
			'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/sources/*', 'GET'),
			'responds with 200': hlp.macros.assertStatus(200),
			'returns an object': hlp.macros.assertBodyType('isObject'),
			'validates the instance has the correct properties': function (err, r) {
				assert.equal(r.body.server, tData.createParams.server);
				assert.equal(r.body.username, tData.createParams.username);
				assert.equal(r.body.authentication_type, 'oauth');
			},
			
			'then resetting its status': {
				topic: function (fetchResp) {
					ctxio.accounts(tData.accountId).sources(fetchResp.body.label).post({status: 1}, this.callback);
				},
				'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/sources/*', 'POST'),
				'responds with 200': hlp.macros.assertStatus(200),
				
				'then deleting it': {
					topic: function (a, b, fetchResp) {
						ctxio.accounts(tData.accountId).sources(fetchResp.body.label).delete(this.callback);
					},
					'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/sources/*', 'DELETE'),
					'responds with 200': hlp.macros.assertStatus(200),
					
					'and attempting to fetch it': {
						topic: function (a, b, c, d, fetchResp) {
							ctxio.accounts(tData.accountId).sources(fetchResp.body.label).get(this.callback);
						},
						'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/sources/*', 'GET'),
						'validates the instance has been deleted': hlp.macros.assertStatus(404)
					}
				}
			}
			
		}
	}
}).addBatch({
	'Getting sync info': {
		topic: function () {
			ctxio.accounts(tData.accountId).sources(tData.label).sync().get(this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/sources/'+tData.label+'/sync', 'GET'),
		'responds with 200': hlp.macros.assertStatus(200),
		'returns expected data': function (err, r){
			assert.isObject(r.body);
			assert.ok('initial_import_finished' in r.body.Inbox);
			assert.ok('last_sync_start' in r.body.Inbox);
		}
	},
	'Triggering syncs': {
		topic: function () {
			ctxio.accounts(tData.accountId).sources(tData.label).sync().post(this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/sources/'+tData.label+'/sync', 'POST'),
		'responds with 202': hlp.macros.assertStatus(202),
		'returns an object': hlp.macros.assertBodyType('isObject')
	}
}).export(module);