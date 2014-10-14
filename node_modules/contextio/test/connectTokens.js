var ContextIO = require('../lib/ContextIO.js'),
	hlp = require('./helpers/helpers.js'),
	tData = require('./helpers/data.js').data.connect_tokens,
	vows = require('vows'),
	assert = require('assert'),
	fs = require('fs'),
	path = require('path');

var ctxio = new ContextIO.Client(hlp.apiVersion, 'https://api.context.io', hlp.apiKeys);

vows.describe('ContextIO/connect_tokens').addBatch({
	'A list': {
		'being fetched': {
			topic: function () {
				ctxio.connectTokens().get(this.callback);
			},
			'made the right API call': hlp.macros.assertCall('connect_tokens','GET'),
			'responds with 200': hlp.macros.assertStatus(200),
			'returns an array': hlp.macros.assertBodyType('isArray')
		}
	}
}).addBatch({
	'An instance': {
		'being fetched': {
			topic: function () {
				ctxio.connectTokens(tData.token).get(this.callback);
			},
			'made the right API call': hlp.macros.assertCall('connect_tokens/'+tData.token, 'GET'),
			'responds with 200': hlp.macros.assertStatus(200),
			'returns an object': hlp.macros.assertBodyType('isObject'),
			'returns the appropriate instance': function (err, r) {
				assert.equal(r.body.token, tData.token);
			}
		}
	}
}).addBatch({
	'Manipulating instances ': {
		'by creating one': {
			topic: function () {
				ctxio.connectTokens().post(tData.createParams, this.callback);
			},
			'made the right API call': hlp.macros.assertCall('connect_tokens','POST'),
			'responds with 201': hlp.macros.assertStatus(201),
			
			'and fetching it': {
				topic: function (createResp) {
					ctxio.connectTokens(createResp.body.token).get(this.callback);
				},
				'made the right API call': hlp.macros.assertCall('connect_tokens/*', 'GET'),
				'responds with 200': hlp.macros.assertStatus(200),
				'validates the instance has the correct properties': function (err, r) {
					assert.equal(r.body.first_name, tData.createParams.first_name);
					assert.equal(r.body.last_name, tData.createParams.last_name);
					assert.equal(r.body.callback_url, tData.createParams.callback_url);
					assert.equal(r.body.service_level.toLowerCase(), tData.createParams.service_level.toLowerCase());
				},
				
						
				'then deleting it': {
					topic: function (fetchResp) {
						ctxio.connectTokens(fetchResp.body.token).delete(this.callback);
					},
					'made the right API call': hlp.macros.assertCall('connect_tokens/*', 'DELETE'),
					'responds with 200': hlp.macros.assertStatus(200),
					
					'and attempting to fetch it': {
						topic: function (deleteResp, deleteReqInfo, fetchResp) {
							ctxio.connectTokens(fetchResp.body.token).get(this.callback);
						},
						'validates the instance has been deleted': hlp.macros.assertStatus(404)
					}
				}
			}
		}
	}
}).export(module);