var ContextIO = require('../lib/ContextIO.js'),
	hlp = require('./helpers/helpers.js'),
	tData = require('./helpers/data.js').data.accounts.webhooks,
	vows = require('vows'),
	assert = require('assert'),
	fs = require('fs'),
	path = require('path');

var ctxio = new ContextIO.Client(hlp.apiVersion, 'https://api.context.io', hlp.apiKeys);

vows.describe('ContextIO/accounts/webhooks').addBatch({
	'Fetching the list': {
		topic: function () {
			ctxio.accounts(tData.accountId).webhooks().get(this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/webhooks', 'GET'),
		'responds with 200': hlp.macros.assertStatus(200),
		'returns an array': hlp.macros.assertBodyType('isArray')
	}
}).addBatch({
	'Manipulating instances ': {
		'by creating one': {
			topic: function () {
				ctxio.accounts(tData.accountId).webhooks().post(tData.createParams, this.callback);
			},
			'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/webhooks', 'POST'),
			'responds with 201': hlp.macros.assertStatus(201),
			
			'and fetching it': {
				topic: function (createResp) {
					ctxio.accounts(tData.accountId).webhooks(createResp.body.webhook_id).get(this.callback);
				},
				'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/webhooks/*', 'GET'),
				'responds with 200': hlp.macros.assertStatus(200),
				'returns an object': hlp.macros.assertBodyType('isObject'),
				'validates the instance has the correct properties': function (err, r) {
					assert.equal(r.body.callback_url, tData.createParams.callback_url);
					assert.equal(r.body.filter_from, tData.createParams.filter_from);
					assert.ok(r.body.active);
				},
				
				'then pausing it': {
					topic: function (fetchResp) {
						ctxio.accounts(tData.accountId).webhooks(fetchResp.body.webhook_id).post({active: 0}, this.callback);
					},
					'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/webhooks/*', 'POST'),
					'responds with 200': hlp.macros.assertStatus(200),
					
					'then deleting it': {
						topic: function (a, b, fetchResp) {
							ctxio.accounts(tData.accountId).webhooks(fetchResp.body.webhook_id).delete(this.callback);
						},
						'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/webhooks/*', 'DELETE'),
						'responds with 200': hlp.macros.assertStatus(200),
						
						'and attempting to fetch it': {
							topic: function (a, b, c, d, fetchResp) {
								ctxio.accounts(tData.accountId).webhooks(fetchResp.body.webhook_id).get(this.callback);
							},
							'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/webhooks/*', 'GET'),
							'validates the instance has been deleted': hlp.macros.assertStatus(404)
						}
					}
				}
			}
		}
	}
}).export(module);