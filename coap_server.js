const debug = require('debug')('nbiot_cloud_gw')
const name = 'coap-server';
const settings = require('./data/config.json');

const coap = require('coap'),
    coap_server = coap.createServer();

coap_server.listen(5683)

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

const observeDevice = (deviceId) => {
    var req = coap.request({observe: true});
    debug('send GET request with OBSERVE=true: '+req);
    req.on('response', (res) => {
        res.pipe(process.stdout);
        res.on('end', () => {
            process.exit(0);
        });
    })
    req.end();
};

process.on('message', (msg) => {
    switch (msg.type) {
        case 'observe':
            debug(`[master] c2d ------> [${name}]: observe ${msg}`);
            //observeDevice(msg.deviceId);
            break;
        default:
            break;
    }
});

module.exports = coap_server;