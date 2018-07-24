const debug = require('debug')('nbiot_cloud_gw')
const name = 'coap-server';
const settings = require('./data/config.json');

const coap = require('coap');
const coap_server = coap.createServer();
debug(`${name}:  [pid:${process.pid}] spawned`);
coap_server.listen(5683);

coap_server.on('request', function (req, res) {
    res.end('Hello ' + req.url.split('/')[1] + '\n')
})

// the default CoAP port is 5683
const queryDevice = (deviceId, tag) => {
    var req = coap.request('coap://' + deviceIP + '/' + tag);
    req.on('response', (res) => {
        res.pipe(process.stdout);
        res.on('end', () => {
            process.exit(0);
        });
    })
    req.end();
};

const observeDevice = (deviceIp) => {
    let options = {
        hostname: deviceIp,
        port: 5683,
        method: 'GET',
        observe: true
    }
    var req = coap.request(options);
    debug(`send GET request with OBSERVE=true: ${deviceIp}`);
    req.on('response', (res) => {
        debug(res)
        res.on('end', () => {
        });
    })
};

process.on('message', (msg) => {
    switch (msg.type) {
        case 'observe':
            debug(`[master] c2d ------> [${name}]: observe ${JSON.stringify(msg)}`);
            observeDevice(msg.device.ip);
            break;
        default:
            break;
    }
});

module.exports = coap_server;