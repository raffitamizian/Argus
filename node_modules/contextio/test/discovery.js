var ContextIO = require('../lib/ContextIO.js'),
	hlp = require('./helpers/helpers.js'),
	tData = require('./helpers/data.js').data.discovery,
	vows = require('vows'),
	assert = require('assert'),
	fs = require('fs'),
	path = require('path');

var ctxio = new ContextIO.Client(hlp.apiVersion, 'https://api.context.io', hlp.apiKeys);

vows.describe('ContextIO/discovery').addBatch({
	'A Gmail address ': {
		'being discovered': {
			topic: function () {
				ctxio.discovery().get(tData.paramsGmail, this.callback);
			},
			'made the right API call': hlp.macros.assertCall('discovery', 'GET'),
			'responds with 200': hlp.macros.assertStatus(200),
			'returns valid settings': function (err, r) {
				assert.equal(r.body.email, tData.paramsGmail.email);
				assert.ok(r.body.imap.oauth);
				assert.ok((r.body.imap.server == 'imap.gmail.com' || r.body.imap.server == 'imap.googlemail.com'));
			}
		}
	}
}).addBatch({
	'A non-existent address ': {
		'being discovered': {
			topic: function () {
				ctxio.discovery().get(tData.paramsUnknown, this.callback);
			},
			'made the right API call': hlp.macros.assertCall('discovery', 'GET'),
			'responds with 200': hlp.macros.assertStatus(200),
			'has found == false': function (err, r) {
				assert.ok(!r.body.found);
			}
		}
	}
}).export(module);