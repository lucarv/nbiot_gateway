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
});

d2c.on('error', (err) => {
	debug(`${name}: server error:\n${err.stack}`);
	d2c.close();
});

d2c.on('message', (buffer, rinfo) => {
	debug(`D2C message from [${rinfo.address}] to [${name}]`);
	process.send({
		type: 'D2C',
		deviceIp: rinfo.address,
		payload: buffer.toString()
	});
});

process.on('message', (msg) => {
	switch (msg.type) {
		case 'C2D_UDP':
			debug(`D2C message from [cluster_master] to [${name}]`);
			c2d.send(msg.payload, 0, msg.payload.length, settings.ports.udp_raw_c2d, msg.deviceIp, function (err, bytes) {
				if (err) debug(name+': error when attempting to send c2d: ' + err);
				else debug(`[${name}] sent a payload of ${bytes} bytes to device: ${(msg.deviceIp)}`);
			});
			break;
		default:
			break;
	}
});

module.exports.d2c = d2c;
module.exports.c2d = c2d;

