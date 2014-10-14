var https = require('https'),
    http = require('http'),
    fs = require('fs'),
    querystring = require('querystring'),
    oauth = require('./oauth.js'),
    url = require('url');

/**
 * Context.IO Client constructor. ContextIO.Client([version, [endpoint, ]] consumer)
 * @param {String} version Default [Optional] Explicitly sets the version of the API (default is the latest stable)
 * @param {String} endpoint [Optional] Allows to override the endpoint of the API
 * @param {Object} consumer Default Your Context.IO consumer key and consumer secret.
 */

// export ContextIO client class available
var Client = exports.Client = function () {
  var _argi = 0, _supportedApiVersions = ['2.0'];

  this._settings = {
    version: (typeof arguments[_argi] == 'string') ? arguments[_argi++] : _supportedApiVersions[0],
    endpoint: url.parse((typeof arguments[_argi] == 'string') ? arguments[_argi++].replace(/\/$/,'') : 'https://api.context.io'),
    consumer: (typeof arguments[_argi] == 'object') ? arguments[_argi] : false
  };

  if (!this._settings.consumer || !('key' in this._settings.consumer) || !('secret' in this._settings.consumer)) {
    throw new Error("Missing required consumer attribute with 'key' and 'secret' properties.");
  }
  if (_supportedApiVersions.indexOf(this._settings.version) == -1) {
    throw new Error(this._settings.version+" is not a supported API version.");
  }

  return true;
};

Client.prototype = (function () {

  function _doCall(method, resource, params, cb, saveBodyToFileName) {

    if (typeof params != 'object') params = false;
    if (typeof saveBodyToFileName != 'string') saveBodyToFileName = false;

    var isMultiPartPost = false;
    if (method.search(/^POST-MULTIPART/) == 0) {
      isMultiPartPost = true;
      var paramsAsFiles = method.match(/:(.*)$/).pop().split(',');
      var postMultiPartBoundary = '------' + _randomString(32);
      method = "POST";
    }

    var OAuthMsg = {
      method: method,
      action: url.format(this._settings.endpoint) + this._settings.version + '/' + resource,
      parameters: _extend((params && !isMultiPartPost) ? params : {}, {
        oauth_consumer_key: this._settings.consumer.key,
        oauth_version: '1.0'
      })
    };

    oauth.setTimestampAndNonce(OAuthMsg);
    oauth.SignatureMethod.sign(OAuthMsg, {
      consumerSecret: this._settings.consumer.secret,
      tokenSecret: ''
    });

    var opts = {
      host: this._settings.endpoint.hostname,
      path: this._settings.endpoint.pathname + this._settings.version + '/' + resource,
      method: method,
      headers: {
        Authorization: oauth.getAuthorizationHeader(OAuthMsg.parameters),
        'User-Agent': 'ContextIO Node.js library'
      }
    };

    var reqInfo = {
      host: opts.host,
      path: opts.path + '',
      method: opts.method
    };

    if (params) {

      if (method == 'GET' || method == 'PUT') {

        var requestHasBody = false;
        var encodedParams = querystring.stringify(params);
        opts.path += '?' + encodedParams;
        reqInfo['queryString'] = encodedParams;

      } else if (method == 'POST') {

        var requestHasBody = true;

        if (isMultiPartPost) {

          var postBodyParts = [];
          for (var name in params) {

            if (!params.hasOwnProperty(name)) continue;
            var part = ((postBodyParts.length == 0) ? '' : "\r\n") + '--' + postMultiPartBoundary + "\r\n";
            if (paramsAsFiles.indexOf(name) != -1) {
              // this field mimics a file upload
              part += 'Content-Disposition: form-data; name="' + name + "\"; filename=\"message.eml\"\r\nContent-Type: message/rfc822\r\n\r\n";
              postBodyParts.push(part);
              if (typeof params[name] == 'object' && 'path' in params[name]) {
                postBodyParts.push(fs.readFileSync(params[name].path));
              } else {
                postBodyParts.push(params[name]);
              }
            } else {
              // standard field
              part += 'Content-Disposition: form-data; name="' + name + "\"\r\n\r\n";
              part += params[name];
              postBodyParts.push(part);
            }
          }

          postBodyParts.push("\r\n--" + postMultiPartBoundary + "--\r\n");
          var bodyLength = 0;
          for (var i = 0, iMax = postBodyParts.length; i < iMax; ++i) {
            bodyLength += postBodyParts[i].length;
          }
          opts.headers['Content-Type'] = 'multipart/form-data; boundary='+postMultiPartBoundary;
          opts.headers['Content-Length'] = bodyLength;

        } else {

          var postBody = querystring.stringify(params);
          opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
          opts.headers['Content-Length'] = postBody.length;

        }
      }
    }

    reqInfo['headers'] = opts.headers;

    var req = (this._settings.endpoint.protocol == 'https:') ? https.request(opts) : http.request(opts);

    req.on('response', (saveBodyToFileName) ? function (r) {

      var fws = fs.createWriteStream(saveBodyToFileName, {
        flags: 'w',
        encoding: null,
        mode: 0666
      }).on('drain', function () {
        r.resume();
      }).on('close', function () {
        cb(null, {
          savedTo: saveBodyToFileName,
          headers: r.headers,
          statusCode: r.statusCode
        }, reqInfo);
      });

      r.on('data', function(chunk) {
        if (!fws.write(chunk)) {
          r.pause();
        }
      });
      r.on('end', function() {
        fws.end();
      });

    } : function (r) {

      var tmp = [];
      var length = 0;
      r.on('data', function(chunk) {
        length += chunk.length;
        tmp.push(chunk);
      });
      r.on('end', function() {
        var buf = new Buffer(length);
        length = 0;
        for (var i in tmp) {
          tmp[i].copy(buf, length);
          length += tmp[i].length;
        }

        var rBody = null;
        if (buf) {
          if (r.headers['content-disposition'] && r.headers['content-disposition'].indexOf('attachment;') === 0) {
            rBody = buf;
          } else if (r.headers['content-type'] == 'application/json') {
            rBody = JSON.parse(buf.toString('binary').replace(/^\s*/,'').replace(/\s*$/,''));
          } else {
            rBody = buf.toString('binary');
          }
        }

        cb(null, {
          body: rBody,
          headers: r.headers,
          statusCode: r.statusCode
        }, reqInfo);
      });

    }).on('error', function (e) {
      cb(e, null, reqInfo);
    });

    if (requestHasBody) {
      if (typeof postBodyParts == 'object' && 'length' in postBodyParts) {
        reqInfo['body'] = '';
        for (var i = 0, iMax = postBodyParts.length; i < iMax; ++i) {
          req.write(postBodyParts[i].toString());
          reqInfo['body'] += postBodyParts[i].toString();
        }
      } else {
        req.write(postBody);
        reqInfo['body'] = postBody;
      }
    }
    req.end();

  };

  /**
   * All get()/post()/put()/delete() calls support up to 3 optional arguments.
   * This function handles cases where some aren't defined in the function call
   * and return a standard object with all 3 arguments as properties.
   *   1: {object} Call parameters
   *   2: {string} Path to a local file when getting a file content or message
   *               source
   *   3: {function} Callback function which receives response from API
   */
  function _parseArgs(fnArgs) {
    if (typeof fnArgs[0] == 'function') {
      return {
        params: null,
        cb: fnArgs[0],
        fileName: null
      };
    } else if (typeof fnArgs[0] == 'string') {
      return {
        params: null,
        cb: (typeof fnArgs[1] == 'function') ? fnArgs[1] : function () {},
        fileName: fnArgs[0]
      };
    } else if (typeof fnArgs[0] == 'object') {
      return {
        params: fnArgs[0],
        cb: (typeof fnArgs[1] == 'function') ? fnArgs[1] : (typeof fnArgs[2] == 'function') ? fnArgs[2] : function () {},
        fileName: (typeof fnArgs[1] == 'string') ? fnArgs[1] : null
      };
    } else {
      return {
        params: null,
        cb: function () {},
        fileName: null
      };
    }
  };

  function _extend(dest, from) {
    var props = Object.getOwnPropertyNames(from);
    var r = _cloneObj(dest);
    props.forEach(function(name) {
      var destination = Object.getOwnPropertyDescriptor(from, name);
      Object.defineProperty(r, name, destination);
    });
    return r;
  };

  /**
   * Generates a string of random characters
   * @param {Number} length Specify desired key length, if null, random length between 32 and 64 characters will be generated
   * @return {String}
   */
  function _randomString(length) {
    var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
      keyLen = (length == undefined || length == null) ? 32 : parseInt(length, 10),
      key = '';
    while (key.length < keyLen) {
      key += chars.charAt(Math.ceil(Math.random() * (chars.length - 1)));
    }
    return key;
  };

  function _cloneObj(theObj) {
    var clone = (theObj instanceof Array) ? [] : {};
    for (i in theObj) {
      if (theObj.hasOwnProperty(i)) {
        if (theObj[i] && typeof theObj[i] == "object") {
          clone[i] = _cloneObj(theObj[i]);
        } else {
          clone[i] = theObj[i];
        }
      }
    }
    return clone;
  };

  // Public methods and properties

  return {
    constructor: Client,

    accounts: function () {
      var _obj = this;
      var _accountId = (typeof arguments[0] == 'string') ? arguments[0] : '';
      var _resourcePath = 'accounts/';

      return {

        get: function () {
          var _args = _parseArgs(arguments);
          _doCall.call(_obj, 'GET', _resourcePath + _accountId, _args.params, _args.cb);
        },
        post: function () {
          var _args = _parseArgs(arguments);
          _doCall.call(_obj, 'POST', _resourcePath + _accountId, _args.params, _args.cb);
        },
        put: function () {
          if (_accountId) {
            this.post.apply(this, arguments);
          } else {
            MethodNeedsInstanceError('accounts', 'put', _parseArgs(arguments).cb);
          }
        },
        'delete': function () {
          if (_accountId) {
            _doCall.call(_obj, 'DELETE', _resourcePath + _accountId, null, _parseArgs(arguments).cb);
          } else {
            MethodNeedsInstanceError('accounts', 'delete', _parseArgs(arguments).cb);
          }
        },

        connect_tokens: function () {
          if (!_accountId) return null;
          _resourcePath += _accountId+'/connect_tokens/';

          var _token = (typeof arguments[0] == 'string') ? arguments[0] : '';
          return {
            get: function () {
              _doCall.call(_obj, 'GET', _resourcePath + _token, null, _parseArgs(arguments).cb);
            },
            post: function () {
              if (_token) {
                MethodNotForInstanceError('accounts/connect_tokens', 'post', _parseArgs(arguments).cb);
              } else {
                var _args = _parseArgs(arguments);
                _doCall.call(_obj, 'POST', _resourcePath, _args.params, _args.cb);
              }
            },
            'delete': function () {
              if (_token) {
                _doCall.call(_obj, 'DELETE', _resourcePath + _token, null, _parseArgs(arguments).cb);
              } else {
                MethodNeedsInstanceError('accounts/connect_tokens', 'delete', _parseArgs(arguments).cb);
              }
            }
          };
        },

        connectTokens: function () {
          return this.connect_tokens.apply(this, arguments);
        },

        contacts: function () {
          if (!_accountId) return null;
          _resourcePath += _accountId+'/contacts/';

          var _email = (typeof arguments[0] == 'string') ? arguments[0] : '';

          var _subResource = function (subRes) {
            if (!_email) return null;
            _resourcePath += _email+'/'+subRes+'/';
            return {
              get: function () {
                var _args = _parseArgs(arguments);
                _doCall.call(_obj, 'GET', _resourcePath, _args.params, _args.cb);
              }
            };
          };

          return {
            get: function () {
              var _args = _parseArgs(arguments);
              _doCall.call(_obj, 'GET', _resourcePath + _email, _args.params, _args.cb);
            },
            files: function () {
              return _subResource('files');
            },
            messages: function () {
              return _subResource('messages');
            },
            threads: function () {
              return _subResource('threads');
            }
          };
        },

        email_addresses: function () {
          if (!_accountId) return null;
          _resourcePath += _accountId+'/email_addresses/';

          var _email = (typeof arguments[0] == 'string') ? arguments[0] : '';
          return {

            get: function () {
              if (_email) {
                MethodNotForInstanceError('accounts/email_addresses', 'get', _parseArgs(arguments).cb);
              } else {
                _doCall.call(_obj, 'GET', _resourcePath, null, _parseArgs(arguments).cb);
              }
            },
            post: function () {
              var _args = _parseArgs(arguments);
              _doCall.call(_obj, 'POST', _resourcePath + _email, _args.params, _args.cb);
            },
            'delete': function () {
              if (_email) {
                _doCall.call(_obj, 'DELETE', _resourcePath + _email, null, _parseArgs(arguments).cb);
              } else {
                MethodNeedsInstanceError('accounts/email_addresses', 'delete', _parseArgs(arguments).cb);
              }
            }
          };
        },

        emailAddresses: function () {
          return this.email_addresses.apply(this, arguments);
        },

        files: function () {
          if (!_accountId) return null;
          _resourcePath += _accountId+'/files/';

          var _fileId = (typeof arguments[0] == 'string') ? arguments[0] : '';

          var _subResource = function (subRes) {
            if (!_fileId) return null;
            _resourcePath += _fileId+'/'+subRes;
            return {
              get: function () {
                var _args = _parseArgs(arguments);
                _doCall.call(_obj, 'GET', _resourcePath, _args.params, _args.cb);
              }
            };
          };

          return {
            get: function () {
              var _args = _parseArgs(arguments);
              _doCall.call(_obj, 'GET', _resourcePath + _fileId, _args.params, _args.cb);
            },
            content: function () {
              if (!_fileId) return null;
              _resourcePath += _fileId+'/content/';
              return {
                get: function () {
                  var _args = _parseArgs(arguments);
                  _doCall.call(_obj, 'GET', _resourcePath, _args.params, _args.cb, _args.fileName);
                }
              };
            },
            changes: function () {
              return _subResource('changes');
            },
            related: function () {
              return _subResource('related');
            },
            revisions: function () {
              return _subResource('revisions');
            }
          };
        },

        messages: function () {

          if (!_accountId) return null;
          _resourcePath += _accountId+'/messages/';

          var _messageId = (typeof arguments[0] == 'string') ? arguments[0] : '';
          if (_messageId.search(/^</) == 0) _messageId = encodeURIComponent(_messageId);

          var _subResource = function (subRes) {
            if (!_messageId) return null;
            _resourcePath += _messageId+'/'+subRes+'/';
            return {
              get: function () {
                var _args = _parseArgs(arguments);
                _doCall.call(_obj, 'GET', _resourcePath, _args.params, _args.cb);
              }
            };
          };

          return {
            get: function () {
              var _args = _parseArgs(arguments);
              _doCall.call(_obj, 'GET', _resourcePath + _messageId, _args.params, _args.cb);
            },
            post: function () {
              var _args = _parseArgs(arguments);
              if (_messageId) {
                _doCall.call(_obj, 'POST', _resourcePath + _messageId, _args.params, _args.cb);
              } else {
                _doCall.call(_obj, 'POST-MULTIPART:message', _resourcePath, _args.params, _args.cb);
              }
            },
            'delete': function () {
              if (_messageId) {
                _doCall.call(_obj, 'DELETE', _resourcePath + _messageId, null, _parseArgs(arguments).cb);
              } else {
                MethodNeedsInstanceError('accounts/messages', 'delete', _parseArgs(arguments).cb);
              }
            },
            flags: function () {
              if (!_messageId) return null;
              _resourcePath += _messageId+'/flags/';
              return {
                get: function () {
                  var _args = _parseArgs(arguments);
                  _doCall.call(_obj, 'GET', _resourcePath, _args.params, _args.cb);
                },
                post: function () {
                  var _args = _parseArgs(arguments);
                  _doCall.call(_obj, 'POST', _resourcePath, _args.params, _args.cb);
                }
              };
            },
            folders: function () {
              if (!_messageId) return null;
              _resourcePath += _messageId+'/folders/';
              return {
                get: function () {
                  var _args = _parseArgs(arguments);
                  _doCall.call(_obj, 'GET', _resourcePath, _args.params, _args.cb);
                },
                put: function () {
                  var _args = _parseArgs(arguments);
                  _doCall.call(_obj, 'PUT', _resourcePath, _args.params, _args.cb);
                },
                post: function () {
                  var _args = _parseArgs(arguments);
                  _doCall.call(_obj, 'POST', _resourcePath, _args.params, _args.cb);
                }
              };
            },
            source: function () {
              if (!_messageId) return null;
              _resourcePath += _messageId+'/source/';
              return {
                get: function () {
                  var _args = _parseArgs(arguments);
                  _doCall.call(_obj, 'GET', _resourcePath, _args.params, _args.cb, _args.fileName);
                }
              };
            },
            body: function () {
              return _subResource('body');
            },
            headers: function () {
              return _subResource('headers');
            },
            thread: function () {
              return _subResource('thread');
            }
          };
        },

        sources: function () {

          if (!_accountId) return null;
          _resourcePath += _accountId + '/sources/';

          var _sourceLabel = (typeof arguments[0] == 'string') ? arguments[0] : '';
          return {
            get: function () {
              var _args = _parseArgs(arguments);
              _doCall.call(_obj, 'GET', _resourcePath + _sourceLabel, _args.params, _args.cb);
            },
            post: function () {
              var _args = _parseArgs(arguments);
              _doCall.call(_obj, 'POST', _resourcePath + _sourceLabel, _args.params, _args.cb);
            },
            put: function () {
              if (_sourceLabel) {
                this.post.apply(this, arguments);
              } else {
                MethodNeedsInstanceError('accounts/sources', 'put', _parseArgs(arguments).cb);
              }
            },
            'delete': function () {
              if (_sourceLabel) {
                _doCall.call(_obj, 'DELETE', _resourcePath + _sourceLabel, null, _parseArgs(arguments).cb);
              } else {
                MethodNeedsInstanceError('accounts/sources', 'delete', _parseArgs(arguments).cb);
              }
            },
            folders: function () {
              if (!_sourceLabel) return null;
              _resourcePath += _sourceLabel + '/folders/';
              var _folderName = (typeof arguments[0] == 'string') ? arguments[0] : '';
              return {
                get: function () {
                  var _args = _parseArgs(arguments);
                  _doCall.call(_obj, 'GET', _resourcePath + _folderName, _args.params, _args.cb);
                },
                put: function () {
                  if (_folderName) {
                    var _args = _parseArgs(arguments);
                    if (_args.params && 'delim' in _args.params && _args.params.delim != '/') {
                      _folderName = encodeURIComponent(_folderName);
                    } else {
                      var f = _folderName.split('/');
                      for (var idx = 0, max = f.length; idx < max; ++idx) {
                        f[idx] = encodeURIComponent(f[idx]);
                      }
                      _folderName = f.join('/');
                    }
                    _doCall.call(_obj, 'PUT', _resourcePath + _folderName, _args.params, _args.cb);
                  } else {
                    MethodNeedsInstanceError('accounts/sources/folders', 'put', _parseArgs(arguments).cb);
                  }
                },
                'delete': function () {
                  if (_folderName) {
                    _doCall.call(_obj, 'DELETE', _resourcePath + _folderName, null, _parseArgs(arguments).cb);
                  } else {
                    MethodNeedsInstanceError('accounts/sources/folders', 'delete', _parseArgs(arguments).cb);
                  }
                },
                'expunge': function () {
                  if (!_folderName) return null;
                  _resourcePath += _folderName + '/expunge';
                  return {
                    'post': function () {
                      _doCall.call(_obj, 'POST', _resourcePath, null, _parseArgs(arguments).cb);
                    }
                  }
                }
              };
            },
            sync: function () {
              if (!_sourceLabel) return null;
              _resourcePath += _sourceLabel + '/sync/';
              return {
                get: function () {
                  _doCall.call(_obj, 'GET', _resourcePath, null, _parseArgs(arguments).cb);
                },
                post: function () {
                  _doCall.call(_obj, 'POST', _resourcePath, null, _parseArgs(arguments).cb);
                }
              };
            }
          };
        },

        sync: function () {

          if (!_accountId) return null;
          _resourcePath += _accountId + '/sync/';

          return {
            get: function () {
              _doCall.call(_obj, 'GET', _resourcePath, null, _parseArgs(arguments).cb);
            },
            post: function () {
              _doCall.call(_obj, 'POST', _resourcePath, null, _parseArgs(arguments).cb);
            }
          };
        },

        threads: function () {

          if (!_accountId) return null;
          _resourcePath += _accountId + '/threads/';

          var _threadId = (typeof arguments[0] == 'string') ? arguments[0] : '';
          return {
            get: function () {
              var _args = _parseArgs(arguments);
              _doCall.call(_obj, 'GET', _resourcePath + _threadId, _args.params, _args.cb);
            }
          };
        },

        webhooks: function () {

          if (!_accountId) return null;
          _resourcePath += _accountId + '/webhooks/';

          var _webhookId = (typeof arguments[0] == 'string') ? arguments[0] : '';
          return {
            get: function () {
              _doCall.call(_obj, 'GET', _resourcePath + _webhookId, null, _parseArgs(arguments).cb);
            },
            post: function () {
              var _args = _parseArgs(arguments);
              _doCall.call(_obj, 'POST', _resourcePath + _webhookId, _args.params, _args.cb);
            },
            'delete': function () {
              if (_webhookId) {
                _doCall.call(_obj, 'DELETE', _resourcePath + _webhookId, null, _parseArgs(arguments).cb);
              } else {
                MethodNeedsInstanceError('accounts/webhooks', 'delete', _parseArgs(arguments).cb);
              }
            }
          };
        }
      };
    },

    oauth_providers: function () {
      var _obj = this;
      var _key = (typeof arguments[0] == 'string') ? arguments[0] : '';
      var _resourcePath = 'oauth_providers/';
      return {
        get: function () {
          var _args = _parseArgs(arguments);
          _doCall.call(_obj, 'GET', _resourcePath + _key, null, _args.cb);
        },
        post: function () {
          if (_key) {
            MethodNotForInstanceError('oauth_providers', 'post', _parseArgs(arguments).cb);
          } else {
            var _args = _parseArgs(arguments);
            _doCall.call(_obj, 'POST', _resourcePath, _args.params, _args.cb);
          }
        },
        'delete': function () {
          if (_key) {
            var _args = _parseArgs(arguments);
            _doCall.call(_obj, 'DELETE', _resourcePath + _key, null, _args.cb);
          } else {
            MethodNeedsInstanceError('oauth_providers', 'delete', _parseArgs(arguments).cb);
          }
        }
      };
    },

    oauthProviders: function () {
      return this.oauth_providers.apply(this, arguments);
    },

    discovery: function () {
      var _obj = this;
      return {
        get: function () {
          var _args = _parseArgs(arguments);
          _doCall.call(_obj, 'GET', 'discovery/', _args.params, _args.cb);
        }
      }
    },

    connect_tokens: function () {
      var _obj = this;
      var _token = (typeof arguments[0] == 'string') ? arguments[0] : '';
      var _resourcePath = 'connect_tokens/';
      return {
        get: function () {
          var _args = _parseArgs(arguments);
          _doCall.call(_obj, 'GET', _resourcePath + _token, null, _args.cb);
        },
        post: function () {
          if (_token) {
            MethodNotForInstanceError('connect_tokens', 'post', _parseArgs(arguments).cb);
          } else {
            var _args = _parseArgs(arguments);
            _doCall.call(_obj, 'POST', _resourcePath, _args.params, _args.cb);
          }
        },
        'delete': function () {
          if (_token) {
            var _args = _parseArgs(arguments);
            _doCall.call(_obj, 'DELETE', _resourcePath + _token, null, _args.cb);
          } else {
            MethodNeedsInstanceError('connect_tokens', 'delete', _parseArgs(arguments).cb);
          }
        }
      };
    },

    connectTokens: function () {
      return this.connect_tokens.apply(this, arguments);
    }

  };
})();

function MethodNeedsInstanceError(resource, method, cb) {
  cb(new Error(method.toUpperCase() + ' is only supported on instances of '+resource+', not on the resource itself. See http://context.io/docs/latest/http://context.io/docs/2.0/'+resource), null, null);
};

function MethodNotForInstanceError(resource, method, cb) {
  cb(new Error(method.toUpperCase() + ' is only supported on the '+resource+' resource itself, not instances of it. See http://context.io/docs/latest/http://context.io/docs/2.0/'+resource), null, null);
};
