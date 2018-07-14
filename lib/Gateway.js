"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = require("events");
var azure_iot_amqp_base_1 = require("azure-iot-amqp-base");
var azure_iot_amqp_base_2 = require("azure-iot-amqp-base");
var azure_iot_common_1 = require("azure-iot-common");
var azure_iot_common_2 = require("azure-iot-common");
var Gateway = /** @class */ (function (_super) {
    __extends(Gateway, _super);
    function Gateway() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.sasExpiry = 3600; // 60 minutes
        _this.sasRenewalInterval = 2700; // 45 minutes
        return _this;
    }
    Gateway.prototype.open = function (connectionString, autoSettleMessages) {
        var _this = this;
        if (autoSettleMessages === void 0) { autoSettleMessages = true; }
        return new Promise(function (resolve, reject) {
            _this.connectionString = connectionString;
            _this.receiverLinks = {};
            _this.amqp = new azure_iot_amqp_base_1.Amqp(autoSettleMessages, 'dummy');
            try {
                var parsedConnectionString = azure_iot_common_1.ConnectionString.parse(connectionString, [
                    'HostName',
                    'SharedAccessKeyName',
                    'SharedAccessKey'
                ]);
                var endpoint = parsedConnectionString.HostName;
                var hubName = endpoint.split('.')[0];
                var policyName = parsedConnectionString.SharedAccessKeyName;
                var policyKey = parsedConnectionString.SharedAccessKey;
                var sas = azure_iot_common_2.SharedAccessSignature.create(encodeURIComponent(endpoint), policyName, policyKey, Math.ceil((Date.now() / 1000) + _this.sasExpiry));
                var audience = policyName + '@sas.root.' + hubName;
                var token = sas.toString();
            }
            catch (error) {
                reject(error);
                return;
            }
            var uri = 'amqps://' + endpoint + ':5671';
            _this.amqp.connect(uri, null, function (error) {
                if (error) {
                    reject(error);
                    return;
                }
                _this.amqp.initializeCBS(function (error) {
                    if (error) {
                        reject(error);
                        return;
                    }
                    _this.amqp.putToken(audience, token, function (error) {
                        if (error) {
                            reject(error);
                            return;
                        }
                        resolve();
                    });
                });
            });
        });
    };
    Gateway.prototype.close = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.amqp.disconnect(function (error) {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    };
    ;
    Gateway.prototype.addDevice = function (deviceId) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var link = '/devices/' + deviceId + '/messages/devicebound';
            _this.amqp.attachReceiverLink(link, {}, function (error, receiverLink) {
                if (error) {
                    reject(error);
                    return;
                }
                _this.receiverLinks[deviceId] = receiverLink;
                receiverLink.on('message', function (message) {
                    _this.emit('message', azure_iot_amqp_base_2.AmqpMessage.toMessage(message));
                });
                resolve();
            });
        });
    };
    ;
    Gateway.prototype.sendMessage = function (deviceId, message) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var link = '/devices/' + deviceId + '/messages/events';
            _this.amqp.send(message, link, link, function (error) {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    };
    ;
    return Gateway;
}(events_1.EventEmitter));
exports.Gateway = Gateway;
//# sourceMappingURL=Gateway.js.map