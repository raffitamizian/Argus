var assert = require('assert'),
	fs = require('fs'),
	path = require('path');

exports.apiKeys = JSON.parse(fs.readFileSync(path.join(__dirname, 'keys.json')).toString());
var apiVersion = exports.apiVersion = '2.0';

exports.macros = {
	assertCall: function (resource, method) {
		return function (err, r, req) {
			req.path = req.path.replace(/\/$/,'');
			if (resource.search(/\*/) == -1) {
				assert.equal(req.path, '/'+apiVersion+'/'+resource);
			} else {
				var actual = req.path.replace(/^\//,'').split('/');
				var expected = [apiVersion].concat(resource.split('/'));
				for (var i = 0, iMax = expected.length; i < iMax; ++i) {
					if (expected[i] != '*') assert.equal(expected[i], actual[i]);
					else assert.ok((typeof actual[i] != 'undefined' && actual[i] != ''));
				}
			}
			assert.equal(req.method.toUpperCase(), method.toUpperCase());
		}
	},
	assertStatus: function (code) {
		return function (err, r) {
			assert.equal(r.statusCode, code);
		}
	},
	assertBodyType: function (typeTest) {
		return function (err, r) {
			assert[typeTest](r.body);
		};
	}
};
