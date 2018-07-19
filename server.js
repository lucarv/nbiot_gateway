'use strict';
'esversion:6';
const settings = require('./config.json');
const api_server = require('./api_server');
const hubProxy = require('./hub_proxy'); // this is for an amqp multiplexer
const az_redis = require('./az_redis');
const udpgw = require('./udp_server');
udpgw.bind(settings.ports.udp_raw_out, settings.gateway_url);
const radiusfe = require('./radius_frontend');
radiusfe.bind(settings.ports.radius);





