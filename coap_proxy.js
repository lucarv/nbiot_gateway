const debug = require('debug')('nbiot_cloud_gw')
const name = 'coap-proxy';
const settings = require('./data/config.json');
const coap = require('coap');
const coap_server = coap.createServer();
debug(`${name}:  [pid:${process.pid}] spawned`);
coap_server.listen(5683);

coap_server.on('request', function (req, res) {
    res.end('Hello ' + req.url.split('/')[1] + '\n')
});

// the default CoAP port is 5683
const queryDevice = (ctx) => {
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
        pathname: '/',
        observe: true
    }
    var req = coap.request(options);
    req.on('response', function (res) {
        res.on('data', function (payload) {
            process.send({
                type: 'd2c',
                deviceIp: res.rsinfo.address,
                payload: res.payload.toString()
            });
        })
        res.on('end', function () {
            process.exit(0)
        })
    })

    req.end()
    /*
        let deviceIp = res.rsinfo.address;
        debug(`${name}: [device] d2c ------> [coap server] from ${deviceIp}`);

        res.on('end', function () {
            // do something here
        })
    })
    req.end()
    */
};

process.on('message', (msg) => {
    switch (msg.type) {
        case 'observe':
            debug(`[master] observe ------> [${name}]: observe ${msg.device.id}`);
            observeDevice(msg.device.ip);
            break;
        case 'get_value':
            debug(`[master] get_value ------> [${name}]:  ${msg.ctx.request.query}`);
            queryDevice(msg.ctx)
            break;
        default:
            break;
    }
});

module.exports = coap_server;