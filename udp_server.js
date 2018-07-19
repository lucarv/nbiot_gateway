'use strict';
'esversion:6';
const debug = require('debug')('nbiot_cloud_gw');
const settings = require('./config.json');
const name = 'udp-server';

// raw udp datagrams
const dgram = require('dgram');
const ipv = settings.ipVersion;
const d2c = dgram.createSocket(ipv);
const c2d = dgram.createSocket(ipv);


//var msgCounter = 0;

d2c.on('listening', () => {
	const address = d2c.address();
	debug(`udp_front_end [pid:${process.pid}] listening on port: ${address.port}`);
});

d2c.on('error', (err) => {
	debug(`server error:\n${err.stack}`);
	d2c.close();
});

d2c.on('message', (buffer, rinfo) => {
	debug(`[device] d2c ------> [udp server] from ${rinfo.address}`);
	process.send({
		type: 'd2c',
		deviceIp: rinfo.address,
		payload: buffer.toString()
	});
});

process.on('message', (msg) => {
	switch (msg.type) {
		case 'c2d':
			debug(`[master] c2d ------> [udp server]:  send to ${msg.deviceIp}`);
			/*
			let device = dgram.createSocket(ipv);
			device.bind({address: '0.0.0.0',port: settings.ports.udp_raw_c2d})
			*/
			device.send(msg.payload, 0, msg.payload.length, settings.ports.udp_raw_c2d, msg.deviceIp, function (err, bytes) {
				if (err) debug('error when attempting to send c2d: ' + err);
				//device.close();
			});
			break;
		default:
			break;
	}
});

module.exports.d2c = d2c;
module.exports.c2d = c2d;

