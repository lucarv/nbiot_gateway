'use strict';
'esversion:6';
const debug = require('debug')('nbiot_cloud_gw');
const settings = require('./config.json');
const name = 'udp-server';

// raw udp datagrams
const dgram = require('dgram');
const ipv = settings.ipVersion;
const gw = dgram.createSocket(ipv);

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
	debug(`[device] d2c ------> [udp_server] from ${rinfo.address}`);
	process.send({
		type: 'd2c',
		ip: rinfo.address,
		payload: buffer.toString()
	});
});

process.on('message', (msg) => {
	switch (msg.type) {
		case 'c2d':
			debug(`[master] c2d ------> [udp_server]:  send to ${msg.deviceIp}`);
			let device = dgram.createSocket(ipv);
			device.bind({
				address: '0.0.0.0',
				port: 51000
			})
			device.send(msg.payload, 0, msg.payload.length, settings.ports.udp_raw_in, msg.deviceIp, function (err, bytes) {
				if (err) debug('error when attempting to send c2d: ' + err);
				device.close();
			});
			break;
		default:
			break;
	}
});

module.exports = gw;
