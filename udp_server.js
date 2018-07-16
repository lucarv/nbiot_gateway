'use strict';
'esversion:6';
require('dotenv').config();
const debug = require('debug')('telenet-udp-gw');
const name = 'udp-server';

// raw udp datagrams
const dgram = require('dgram');
const gw = dgram.createSocket('udp' + process.env.IPV);

//var msgCounter = 0;

gw.on('listening', () => {
	const address = gw.address();
	debug(`udp_front_end [pid:${process.pid}] listening on port: ${address.port}`);
});

gw.on('error', (err) => {
	debug(`server error:\n${err.stack}`);
	gw.close();
});

gw.on('message', (buffer, rinfo) => {
	debug(`[device] d2c ------> [udpgw] from(${rinfo.address}`);
	process.send({
		type: 'd2c',
		ip: rinfo.address,
		payload: buffer.toString()
	});
});

process.on('message', (msg) => {
	switch (msg.type) {
		case 'c2d':
			debug('[master] c2d ------> [udpgw]: ' + msg.deviceIp);
			let device = dgram.createSocket('udp' + process.env.IPV);
			device.bind({
				address: '0.0.0.0',
				port: 51000
			})
			device.send(msg.payload, 0, msg.payload.length, process.env.DEV_PORT, msg.deviceIp, function (err, bytes) {
				if (err) debug('error when attempting to send c2d: ' + err);
				device.close();
			});
			break;
		default:
			break;
	}
});

module.exports = gw;
