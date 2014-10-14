var ContextIO = require('../lib/ContextIO.js'),
	hlp = require('./helpers/helpers.js'),
	tData = require('./helpers/data.js').data.accounts.email_addresses,
	vows = require('vows'),
	assert = require('assert'),
	fs = require('fs'),
	path = require('path');

var ctxio = new ContextIO.Client(hlp.apiVersion, 'https://api.context.io', hlp.apiKeys);

vows.describe('ContextIO/accounts/email_addresses').addBatch({
	'A list': {
		'being fetched': {
			topic: function () {
				ctxio.accounts(tData.account_id).emailAddresses().get(this.callback);
			},
			'made the right API call': hlp.macros.assertCall('accounts/'+tData.account_id+'/email_addresses', 'GET'),
			'responds with 200': hlp.macros.assertStatus(200),
			'returns an array': hlp.macros.assertBodyType('isArray'),
			'returns the expected list of emails': function (err, r) {
				assert.isArray(r.body);
				assert.deepEqual([r.body[0].email, r.body[1].email], tData.existing);
				assert.equal(r.body[0].primary, 1);
				assert.equal(r.body[1].primary, 0);
			}
		}
	}
}).addBatch({
	'Manipulating the resource': {
		'by creating an instance': {
			topic: function () {
				ctxio.accounts(tData.account_id).emailAddresses().post(tData.createParams, this.callback);
			},
			'made the right API call': hlp.macros.assertCall('accounts/'+tData.account_id+'/email_addresses', 'POST'),
			'responds with 201': hlp.macros.assertStatus(201),
			
			'and fetching the list': {
				topic: function () {
					ctxio.accounts(tData.account_id).emailAddresses().get(this.callback);
				},
				'made the right API call': hlp.macros.assertCall('accounts/'+tData.account_id+'/email_addresses', 'GET'),
				'responds with 200': hlp.macros.assertStatus(200),
				'returns an array': hlp.macros.assertBodyType('isArray'),
				'confirms the addition': function (err, r) {
					assert.equal(r.body.length, 3);
					assert.equal(r.body[2].email, tData.createParams.email_address);
				},
				
				'then deleting it': {
					topic: function () {
						ctxio.accounts(tData.account_id).emailAddresses(tData.createParams.email_address).delete(this.callback);
					},
					'made the right API call': hlp.macros.assertCall('accounts/'+tData.account_id+'/email_addresses/'+tData.createParams.email_address, 'DELETE'),
					'responds with 200': hlp.macros.assertStatus(200),
					
					'and fetching the list again': {
						topic: function () {
							ctxio.accounts(tData.account_id).emailAddresses().get(this.callback);
						},
						'validates it has been deleted': function (err, r) {
							assert.equal(r.body.length, 2);
							assert.deepEqual([r.body[0].email, r.body[1].email], tData.existing);
						}
					}
				}
			}
		}
	}
}).addBatch({
	'Changing the primary email': {
		topic: function () {
			ctxio.accounts(tData.account_id).emailAddresses(tData.existing[1]).post({primary:1}, this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.account_id+'/email_addresses/'+tData.existing[1], 'POST'),
		'responds with 200': hlp.macros.assertStatus(200),
		
		'and fetching the list again': {
			topic: function () {
				ctxio.accounts(tData.account_id).emailAddresses().get(this.callback);
			},
			'confirms the change in primary': function (err, r) {
				assert.equal(r.body[1].primary, 1);
			},
			
			'settings the primary back to expected': {
				topic: function () {
					ctxio.accounts(tData.account_id).emailAddresses(tData.existing[0]).post({primary:1}, this.callback);
				},
				'made the right API call': hlp.macros.assertCall('accounts/'+tData.account_id+'/email_addresses/'+tData.existing[0], 'POST'),
				'responds with 200': hlp.macros.assertStatus(200),
			}
		}
	}
}).export(module);