'use strict';
'esversion:6';
require('dotenv').config();

const api_server = require('./api_server');
const hubProxy = require('./hub_proxy'); // this is for an amqp multiplexer
const az_redis = require('./az_redis');
const udpgw = require('./udp_server');
udpgw.bind(process.env.GW_PORT, process.env.GW_HOST);
const radiusfe = require('./radius_frontend');
radiusfe.bind(1815);





