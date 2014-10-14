var ContextIO = require('../lib/ContextIO.js'),
	hlp = require('./helpers/helpers.js'),
	tData = require('./helpers/data.js').data.accounts.messages,
	vows = require('vows'),
	assert = require('assert'),
	fs = require('fs'),
	path = require('path');

var ctxio = new ContextIO.Client(hlp.apiVersion, 'https://api.context.io', hlp.apiKeys);

vows.describe('ContextIO/accounts/messages').addBatch({
	'A list being fetched': {
		topic: function () {
			ctxio.accounts(tData.accountId).messages().get(this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/messages', 'GET'),
		'responds with 200': hlp.macros.assertStatus(200),
		'returns an array': hlp.macros.assertBodyType('isArray'),
		'returns what looks like messages': function (err, r) {
			assert.ok(('email_message_id' in r.body[0]));
			assert.ok(('sources' in r.body[0]));
			assert.ok(('folders' in r.body[0]));
		}
	}
}).addBatch({
	'Manipulating instances by creating one': {
		topic: function () {
			ctxio.accounts(tData.accountId).messages().post({
				dst_folder: tData.create.folder,
				message: { path: path.join(__dirname, 'helpers', 'anEmail.eml')}
			}, this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/messages', 'POST'),
		'responds with 201': hlp.macros.assertStatus(201),
		
		'and fetching it': {
			topic: function (createResp) {
				ctxio.accounts(tData.accountId).messages(tData.create.emailMessageId).get(this.callback);
			},
			'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/messages/'+ encodeURIComponent(tData.create.emailMessageId), 'GET'),
			'responds with 200': hlp.macros.assertStatus(200),
			'returns an object': hlp.macros.assertBodyType('isObject'),
			'validates the instance has the correct properties': function (err, r) {
				assert.equal(r.body.email_message_id, tData.create.emailMessageId);
			},
			
			'then moving it to the Trash': {
				topic: function () {
					ctxio.accounts(tData.accountId).messages(tData.create.emailMessageId).post({dst_folder: tData.create.trashFolder, move: 1}, this.callback);
				},
				'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/messages/'+encodeURIComponent(tData.create.emailMessageId), 'POST'),
				'responds with 200': hlp.macros.assertStatus(200)
			}
		}
	}
}).addBatch({
	'Fetching the body': {
		topic: function () {
			ctxio.accounts(tData.accountId).messages(tData.messageId).body().get(this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/messages/'+tData.messageId+'/body', 'GET'),
		'responds with 200': hlp.macros.assertStatus(200),
		'returns an array': hlp.macros.assertBodyType('isArray'),
		'returns what looks like a message body': function (err, r) {
			assert.ok(('type' in r.body[0]));
			assert.ok(('charset' in r.body[0]));
			assert.ok(('body_section' in r.body[0]));
		}
	},
	'Downloading the source': {
		topic: function () {
			ctxio.accounts(tData.accountId).messages(tData.messageId).source().get(path.join(__dirname, 'helpers', 'testSourceDownload'), this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/messages/'+tData.messageId+'/source', 'GET'),
		'responds with 200': hlp.macros.assertStatus(200),
		'saved a valid file': function (err, r) {
			assert.ok(('savedTo' in r && r.savedTo == path.join(__dirname, 'helpers', 'testSourceDownload')));
			var stats = fs.statSync(r.savedTo);
			assert.ok(stats.isFile());
			assert.ok((stats.size > 0));
			//fs.unlinkSync(r.savedTo);
		}
	},
	'Fetching headers': {
		topic: function () {
			ctxio.accounts(tData.accountId).messages(tData.messageId).headers().get(this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/messages/'+tData.messageId+'/headers', 'GET'),
		'responds with 200': hlp.macros.assertStatus(200),
		'returns an object': hlp.macros.assertBodyType('isObject'),
		'returns what looks like RFC-822 headers': function (err, r) {
			assert.ok(('Message-Id' in r.body));
			assert.ok(('Delivered-To' in r.body));
		}
	},
	'Fetching the thread': {
		topic: function () {
			ctxio.accounts(tData.accountId).messages(tData.messageId).thread().get(this.callback);
		},
		'made the right API call': hlp.macros.assertCall('accounts/'+tData.accountId+'/messages/'+tData.messageId+'/thread', 'GET'),
		'responds with 200': hlp.macros.assertStatus(200),
		'returns an object': hlp.macros.assertBodyType('isObject'),
		'returns what looks like a valid thread object': function (err, r) {
			assert.ok(('email_message_ids' in r.body));
			assert.equal(r.body.email_message_ids[0], r.body.messages[0].email_message_id);
		}
	}
}).export(module);