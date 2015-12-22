'use strict';

/* Services */
angular.module('ff.FatFractalService', []).
    factory('FatFractal', ['$rootScope', '$q', '$location', '$log', function($rootScope, $q, $location, $log) {
        var ff = new FatFractalService($rootScope, $q, $location, $log);

        // TODO: get cookies working

        ff.setAutoLoadRefs(true);
//        ff.setServiceDebug(true);   // TEST
        ff.loggedIn();  // force FF to look for session info
        return ff;
    }]);

function FatFractalService(scope, $q, $location, $log) {
    var self = this;

    self.ff = new FatFractal();

    self.setDebug = self.ff.setDebug;
    self.getDebug = self.ff.getDebug;

    var m_debug = false;
    self.setServiceDebug = function(debug) {
        m_debug = debug;
    };
    self.getServiceDebug = function() {
        return m_debug;
    };

    self.setBaseUrl = self.ff.setBaseUrl;
    self.getBaseUrl = self.ff.getBaseUrl;
    self.setAutoLoadRefs = self.ff.setAutoLoadRefs;
    self.setSimulateCookies = self.ff.setSimulateCookies;
    self.loggedIn = self.ff.loggedIn;
    self.loggedInUser = self.ff.loggedInUser;

    var m_stringify = function(obj) {
        return obj ? JSON.stringify({ffUrl: obj.ffUrl}) : obj;
//        var seen = [];
//        return JSON.stringify(obj, function(key, val) {
//            if (typeof val == "object") {
//                if (seen.indexOf(val) >= 0) return undefined;
//                seen.push(val);
//            }
//            return val;
//        });
    };

    self.register = function(email, firstName, lastName, password, phoneNumber) {
        var deferred = $q.defer();

        var rr = new RegisterRequest();
        rr.userName = email;
        rr.email = email;
        rr.firstName = firstName;
        rr.lastName = lastName;
        rr.password = password;
        rr.phoneNumber = phoneNumber;

        self.ff.register(rr, function(result) {
            scope.$apply(function() { deferred.resolve(result) });
        }, function(code, result) {
            $log.error("Error: register(" + email + ", " + firstName + ", " + lastName + ", " + "********" + ")");
            scope.$apply(function() { deferred.reject({code: code, message: JSON.parse(result).statusMessage}) });
        });

        return deferred.promise;
    };

    self.login = function(username, password) {
        var deferred = $q.defer();
        self.ff.login(username, password, function(result) {
            scope.$apply(function() { deferred.resolve(result) });
        }, function(code, result) {
            $log.error("Error: login(" + username + ", " + "********" + ")");
            scope.$apply(function() { deferred.reject({code: code, message: JSON.parse(result).statusMessage}) });
        });
        return deferred.promise;
    };

    self.logout = function() {
        var deferred = $q.defer();
        self.ff.logout(function() {
            scope.$apply(function() { deferred.resolve() });
        }, function(code, result) {
            $log.error("Error: logout()");
            scope.$apply(function() { deferred.reject({code: code, message: JSON.parse(result).statusMessage}) });
        });
        return deferred.promise;
    };

    self.getObjFromUri = function(uri, loadRefs) {
        if (m_debug) $log.log("getObjFromUri(" + uri + ", " + loadRefs + ")");
        loadRefs = loadRefs || false;

        var deferred = $q.defer();

        self.ff.getObjFromUri(uri, function(result) {
            if (m_debug) $log.log("Success: getObjFromUri(" + uri + ", " + loadRefs + ") got " + JSON.stringify(result));
            scope.$apply(function() {
                if (loadRefs) {
                    deferred.resolve(self.loadReferences(result));
                } else {
                    deferred.resolve(result)
                }
            });
        }, function(code, result) {
            $log.error("Error: getObjFromUri(" + uri + ", " + loadRefs + ")");
            scope.$apply(function() { deferred.reject({code: code, message: JSON.parse(result).statusMessage}) });
        });

        return deferred.promise;
    };

    self.getArrayFromUri = function(uri, loadRefs) {
        if (m_debug) $log.log("getArrayFromUri(" + uri + ", " + loadRefs + ")");
        loadRefs = loadRefs || false;

        var deferred = $q.defer();

        self.ff.getArrayFromUri(uri, function(result) {
            if (m_debug) $log.log("Success: getArrayFromUri(" + uri + ", " + loadRefs + ") got " + m_stringify(result));
            var resolved;
            if (loadRefs) {
                var arr = [];
                for (var i = 0; i < result.length; i++) {
                    arr.push(self.loadReferences(result[i]));
                }
                resolved = $q.all(arr);
            } else {
                resolved = result;
            }
            scope.$apply(function() { deferred.resolve(resolved) });
        }, function(code, result) {
            $log.error("Error: getArrayFromUri(" + uri + ", " + loadRefs + ")");
            var msg;
            if (result) {
                msg = JSON.parse(result).statusMessage;
            } else {
                msg = "Unknown error";
            }
            if (code == 0 || code == 401) {
                // TODO: put everywhere?
                self.logout()
                    .then(function() {
                        $location.path("/");
                        scope.loggedIn = false;
                        scope.loggedInUser = null;
                        scope.userName = null;
                    });
            }
            scope.$apply(function() { deferred.reject({code: code, message: msg}) });
        });

        return deferred.promise;
    };

    self.getObjFromExtension = function(extensionName) {
        if (m_debug) $log.log("getObjFromExtension(" + extensionName + ")");
        var deferred = $q.defer();
        self.ff.getObjFromExtension(extensionName, function(result) {
            scope.$apply(function() { deferred.resolve(result) });
        }, function(code, result) {
            $log.error("Error: getObjFromExtension(" + extensionName + ")");
            scope.$apply(function() { deferred.reject({code: code, message: JSON.parse(result).statusMessage}) });
        });
        return deferred.promise;
    };

    self.getArrayFromExtension = function(extensionName) {
        var deferred = $q.defer();
        self.ff.getArrayFromExtension(extensionName, function(result) {
            scope.$apply(function() { deferred.resolve(result) });
        }, function(code, result) {
            $log.error("Error: getArrayFromExtension(" + extensionName + ")");
            scope.$apply(function() { deferred.reject({code: code, message: JSON.parse(result).statusMessage}) });
        });
        return deferred.promise;
    };

    self.postObjToExtension = function(obj, extensionName) {
        var deferred = $q.defer();
        self.ff.postObjToExtension(clean(obj), extensionName, function(result) {
            scope.$apply(function() { deferred.resolve(result) });
        }, function(code, result) {
            $log.error("Error: postObjToExtension(" + m_stringify(obj) + ", " + extensionName + ")");
            scope.$apply(function() { deferred.reject({code: code, message: JSON.parse(result).statusMessage}) });
        });
        return deferred.promise;
    };

    self.loadReference = function(obj, memberName) {
        if (m_debug) $log.log("loadReferece(" + m_stringify(obj) + ", " + memberName + ")");
        if (!obj || !obj.ffRefs) return obj;

        var ref = null;
        for (var i = 0; i < obj.ffRefs.length; i++) {
            if (obj.ffRefs[i].type == 'FFO' && obj.ffRefs[i].name == memberName) {
                ref = obj.ffRefs[i];
                break;
            }
        }

        var deferred = $q.defer();
        self.ff.getObjFromUri(obj.ffUrl + "/" + ref.name,
            function(result) {
                scope.$apply(function() { deferred.resolve({ name: ref.name, val: result }) });
            },
            function(code, result) {
                $log.error("Error: loadReference(" + m_stringify(obj) + ", " + memberName + ")");
                scope.$apply(function() { deferred.reject({code: code, message: JSON.parse(result).statusMessage}) });
            });

        return deferred.promise.then(function(ref) {
            obj[ref.name] = ref.val;
            return obj;
        });
    };

    self.loadReferences = function(obj) {
        if (m_debug) $log.log("loadReferences(" + m_stringify(obj) + ")");
        if (!obj || !obj.ffRefs) return obj;

        var promises = [];
        var names = [];
        for (var i = 0; i < obj.ffRefs.length; i++) {
            var ref = obj.ffRefs[i];
            if (ref.type !== 'FFO') continue;

            var promise = self.getObjFromUri(obj.ffUrl + "/" + ref.name, true);
            promises.push(promise);
            names.push(ref.name);
        }

        var allPromise = $q.all(promises);
        return allPromise.then(function(refs) {
            for (var i = 0; i < refs.length; i++) {
                obj[names[i]] = refs[i];
            }
            return obj;
        });
    };

    self.grabBagAdd = function(item, parentObj, gbName) {
        var deferred = $q.defer();
        self.ff.grabBagAdd(item, parentObj, gbName, function(result) {
            scope.$apply(function() { deferred.resolve(result) });
        }, function(code, result) {
            $log.error("Error: grabBagAdd(" + item + ", " + parentObj + ", " + gbName + ")");
            scope.$apply(function() { deferred.reject({code: code, message: JSON.parse(result).statusMessage}) });
        });
        return deferred.promise;
    };

    self.grabBagRemove = function(item, parentObj, gbName) {
        var deferred = $q.defer();
        self.ff.grabBagRemove(item, parentObj, gbName, function(result) {
            scope.$apply(function() { deferred.resolve(result) });
        }, function(code, result) {
            $log.error("Error: grabBagRemove(" + item + ", " + parentObj + ", " + gbName + ")");
            scope.$apply(function() { deferred.reject({code: code, message: JSON.parse(result).statusMessage}) });
        });
        return deferred.promise;
    };

    self.grabBagGetAll = function(parentObj, gbName) {
        var deferred = $q.defer();
        self.ff.grabBagGetAll(parentObj, gbName, function(result) {
            scope.$apply(function() { deferred.resolve(result) });
        }, function(code, result) {
            $log.error("Error: grabBagGetAll(" + parentObj + ", " + gbName + ")");
            scope.$apply(function() { deferred.reject({code: code, message: JSON.parse(result).statusMessage}) });
        });
        return deferred.promise;
    };

    /* similar to above, but returns promise to the object, not the grabbag array */
    self.loadGrabbag = function(obj, gbName, mappedName) {
        mappedName = mappedName || gbName;

        var deferred = $q.defer();

        self.ff.grabBagGetAll(obj, gbName, function(result) {
            obj[mappedName] = result;
            scope.$apply(function() { deferred.resolve(obj) });
        }, function(code, result) {
            $log.error("Error: loadGrabbag(" + m_stringify(obj) + ", " + gbName + ", " + mappedName + ")");
            scope.$apply(function() { deferred.reject({code: code, message: JSON.parse(result).statusMessage}) });
        });

        return deferred.promise;
    };

    /**
     * Takes a list of the current items that should be in a grabbag, and adds and removes
     * items as necessary to synchronize the grabbag members with that list
     * @param {Array} items
     * @param {Object} obj
     * @param {String} gbName
     */
    self.grabBagSync = function(items, obj, gbName) {
        $log.log("grabBagSync(", items, ", ", obj, ", ", gbName, ")");
        var deferred = $q.defer();

        function containsElement(array, member, value) {
            for (var i = 0; i < array.length; i++) {
                if (array[i][member] === value) return true;
            }
            return false;
        }

        var promises = [];
        self.grabBagGetAll(obj, gbName)
            .then(function(currentItems) {
                for (var i = 0; i < currentItems.length; i++) {
                    var item = currentItems[i];
                    if (!containsElement(items, 'ffUrl', item.ffUrl)) {
                        $log.log("grabBagSync: removing item " + item.ffUrl);
                        promises.push(self.grabBagRemove(item, obj, gbName));
                    }
                }
                for (i = 0; i < items.length; i++) {
                    item = items[i];
                    if (!containsElement(currentItems, 'ffUrl', item.ffUrl)) {
                        $log.log("grabBagSync: adding item " + item.ffUrl);
                        promises.push(self.grabBagAdd(item, obj, gbName));
                    }
                }
            }, function(error) {
                scope.$apply(function() { deferred.reject(error) });
            });

        $q.all(promises).then(function() {
            deferred.resolve(obj);
        }, function() {
            deferred.reject({code: 500, message: "Error: grabBagSync"});
        });

        return deferred.promise;
    };

    self.createObjAtUri = function(obj, collectionUri) {
        var deferred = $q.defer();

        self.ff.createObjAtUri(clean(obj), collectionUri, function(result) {
            scope.$apply(function() { deferred.resolve(result) });
        }, function(code, result) {
            $log.error("Error: createObjAtUri(" + m_stringify(obj) + ", " + collectionUri + ")");
            scope.$apply(function() { deferred.reject({code: code, message: JSON.parse(result).statusMessage}) });
        });

        return deferred.promise;
    };

    self.updateObj = function(obj) {
        var deferred = $q.defer();
        self.ff.updateObj(clean(obj), function(result) {
            scope.$apply(function() { deferred.resolve(result) });
        }, function(code, result) {
            $log.error("Error: updateObj(" + m_stringify(obj) + ")");
            scope.$apply(function() { deferred.reject({code: code, message: JSON.parse(result).statusMessage}) });
        });
        return deferred.promise;
    };

    self.updateBlobForObj = function(obj, blob, memberName, mimeType) {
        var deferred = $q.defer();
        self.ff.updateBlobForObj(obj, blob, memberName, mimeType, function(result) {
            scope.$apply(function() { deferred.resolve(result) });
        }, function(code, result) {
            $log.error("Error: updateBlobForObj(" + m_stringify(obj) + ")");
            scope.$apply(function() { deferred.reject({code: code, message: JSON.parse(result).statusMessage}) });
        });
        return deferred.promise;
    };

    self.deleteBlobForObj = function(obj, memberName) {
        var deferred = $q.defer();
        self.ff.deleteBlobForObj(obj, memberName, function(result) {
            scope.$apply(function() { deferred.resolve(result) });
        }, function(code, result) {
            $log.error("Error: deleteBlobForObj(" + m_stringify(obj) + ")");
            scope.$apply(function() { deferred.reject({code: code, message: JSON.parse(result).statusMessage}) });
        });
        return deferred.promise;
    };

    self.deleteObj = function(obj) {
        if (m_debug) $log.log("deleteObj(" + m_stringify(obj) + ")");
        var deferred = $q.defer();
        self.ff.deleteObj(clean(obj), function(result) {
            if (m_debug) $log.log("Success: deleteObj(" + m_stringify(obj) + ")");
            scope.$apply(function() { deferred.resolve(result) });
        }, function(code, result) {
            $log.error("Error: deleteObj(" + m_stringify(obj) + ")");
            scope.$apply(function() { deferred.reject({code: code, message: JSON.parse(result).statusMessage}) });
        });
        return deferred.promise;
    };

    self.forgetObj = function(obj) {
        self.ff.forgetObj(obj);
    };

    function clean(obj) {
        // TODO: not sure this is kosher ...
        delete obj.$$hashKey;
        return obj;
    }
}
