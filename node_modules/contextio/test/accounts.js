var ContextIO = require('../lib/ContextIO.js'),
	hlp = require('./helpers/helpers.js'),
	tData = require('./helpers/data.js').data.accounts,
	vows = require('vows'),
	assert = require('assert'),
	fs = require('fs'),
	path = require('path');

var ctxio = new ContextIO.Client(hlp.apiVersion, 'https://api.context.io', hlp.apiKeys);

vows.describe('ContextIO/accounts').addBatch({
	'A list': {
		'being fetched': {
			topic: function () {
				ctxio.accounts().get(this.callback);
			},
			'made the right API call': hlp.macros.assertCall('accounts','GET'),
			'responds with 200': hlp.macros.assertStatus(200),
			'returns an array': hlp.macros.assertBodyType('isArray')
		},
		'being fetched with filters': {
			topic: function () {
				ctxio.accounts().get({email:tData.listFiltersTest.email[0]}, this.callback);
			},
			'made the right API call': hlp.macros.assertCall('accounts','GET'),
			'responds with 200': hlp.macros.assertStatus(200),
			'returns an array': hlp.macros.assertBodyType('isArray'),
			'return the correct instance': function (err, r) {
				assert.equal(r.body.length, 1);
				assert.equal(r.body[0].id, tData.listFiltersTest.email[1]);
				assert.notEqual(r.body[0].email_addresses.indexOf(tData.listFiltersTest.email[0]), -1);
			}
		}
	}
}).addBatch({
	'An instance': {
		'being fetched': {
			topic: function () {
				ctxio.accounts(tData.instanceId).get(this.callback);
			},
			'made the right API call': hlp.macros.assertCall('accounts/'+tData.instanceId,'GET'),
			'responds with 200': hlp.macros.assertStatus(200),
			'returns an object': hlp.macros.assertBodyType('isObject'),
			'returns the appropriate instance': function (err, r) {
				assert.equal(r.body.id, tData.instanceId);
			}
		}
	}
}).addBatch({
	'Manipulating instances': {
		'by creating one': {
			topic: function () {
				ctxio.accounts().post(tData.createParams, this.callback);
			},
			'made the right API call': hlp.macros.assertCall('accounts','POST'),
			'responds with 201': hlp.macros.assertStatus(201),
			
			'and fetching it': {
				topic: function (createResp) {
					ctxio.accounts(createResp.body.id).get(this.callback);
				},
				'responds with 200': hlp.macros.assertStatus(200),
				'validates the instance has the correct properties': function (err, r) {
					assert.equal(r.body.first_name, tData.createParams.first_name);
					assert.equal(r.body.last_name, tData.createParams.last_name);
					assert.notEqual(r.body.email_addresses.indexOf(tData.createParams.email), -1);
				},
				
				'then updating it': {
					topic: function (fetchResp) {
						ctxio.accounts(fetchResp.body.id).post(tData.updateParams, this.callback);
					},
					'made the right API call': hlp.macros.assertCall('accounts/*','POST'),
					'responds with 200': hlp.macros.assertStatus(200),
					
					'and fetching it again': {
						topic: function (updateResp, updateReqInfo, fetchResp) {
							ctxio.accounts(fetchResp.body.id).get(this.callback);
						},
						'responds with 200': hlp.macros.assertStatus(200),
						'validates instance properties have been changed': function (err, r) {
							assert.equal(r.body.first_name, tData.updateParams.first_name);
							assert.equal(r.body.last_name, tData.createParams.last_name);
						},
						
						'then deleting it': {
							topic: function (fetchResp) {
								ctxio.accounts(fetchResp.body.id).delete(this.callback);
							},
							'made the right API call': hlp.macros.assertCall('accounts/*','DELETE'),
							'responds with 200': hlp.macros.assertStatus(200),
							
							'and attempting to fetch it': {
								topic: function (deleteResp, deleteReqInfo, fetchResp) {
									ctxio.accounts(fetchResp.body.id).get(this.callback);
								},
								'validates the instance has been deleted': hlp.macros.assertStatus(404)
							}
						}
					}
				}
			}
		}
	}
}).export(module);