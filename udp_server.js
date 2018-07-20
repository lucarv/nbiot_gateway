'use strict';
'esversion:6';
const debug = require('debug')('nbiot_cloud_gw');
const settings = require('./data/config.json');
const name = 'udp-server';

// raw udp datagrams
const dgram = require('dgram');
const ipv = settings.ipVersion;
const d2c = dgram.createSocket(ipv);
const c2d = dgram.createSocket(ipv);


//var msgCounter = 0;

d2c.on('listening', () => {
	const address = d2c.address();
	debug(`${name}:  [pid:${process.pid}] listening on port: ${address.port}`);
});

d2c.on('error', (err) => {
	debug(`${name}: server error:\n${err.stack}`);
	d2c.close();
});

d2c.on('message', (buffer, rinfo) => {
	debug(`${name}: [device] d2c ------> [udp server] from ${rinfo.address}`);
	process.send({
		type: 'd2c',
		deviceIp: rinfo.address,
		payload: buffer.toString()
	});
});

process.on('message', (msg) => {
	switch (msg.type) {
		case 'c2d':
			debug(`${name}: [master] c2d ------> [udp server]:  send ${msg.payload} to ${msg.deviceIp}`);
			c2d.send(msg.payload, 0, msg.payload.length, settings.ports.udp_raw_c2d, msg.deviceIp, function (err, bytes) {
				if (err) debug(name+': error when attempting to send c2d: ' + err);
				else debug(`sent ${bytes} to device`);
			});
			break;
		default:
			break;
	}
});

module.exports.d2c = d2c;
module.exports.c2d = c2d;

