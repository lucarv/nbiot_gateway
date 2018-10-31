    'use strict';
'esversion:6';
const settings = require('./data/config.json');
const api_server = require('./api_server').app
const az_redis = require('./az_redis');
const hubProxy = require('./hub_proxy');
const d2c = require('./udp_server').d2c;
const c2d = require('./udp_server').c2d;
d2c.bind({
    address: '0.0.0.0',
    port: settings.ports.udp_raw_d2c
});
c2d.bind({
    address: '0.0.0.0',
    port: settings.ports.udp_raw_c2d
});
api_server.listen(settings.ports.api);
const coap_server = require('./coap_proxy').c2d;
const radiusfe = require('./radius_frontend');
radiusfe.bind(settings.ports.radius);