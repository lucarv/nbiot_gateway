'use strict';
'esversion:6';
const debug = require('debug')('nbiot_cloud_gw');
const name = 'cluster-master';
const cluster = require('cluster');
var worker;
var devices = [];


if (cluster.isMaster) {
	// Count the machine's CPUs
	var cpuCount = require('os').cpus().length;

	// Create a worker for each CPU
	for (var i = 0; i < cpuCount; i += 1) {
		worker = cluster.fork();
		worker.on('message', (msg) => {
			switch (msg.type) {
				case 'pdp_ON':
					debug(`[gw aaa] PDP_ON -------> [master]: ${msg.device.id}`);
					devices.push(msg.device);
					worker.send({
						type: 'conn_DEV',
						device: msg.device
					});
					worker.send({
						type: 'store_IP',
						device: msg.device
					});
					break;
				case 'pdp_OFF':
					debug(`[gw aaa] PDP_OFF ------> [naster]: ${msg.device.id}`);
					worker.send({
						type: 'disconn_DEV',
						device: msg.device
					});
					break;
				case 'd2c':
					debug(`[udp server] d2c ------> [master]: from (${(msg.deviceIp)})`);
					var found = devices.find(o => o.ip === msg.deviceIp);
					if (!found)
						debug(`device at ${msg.deviceIp} not currently registered, ignore the message`)
					else
						worker.send({
							type: 'd2c',
							deviceId: found.id,
							payload: msg.payload
						});
					break;
				case 'c2d':
					debug(`[udp server] c2d ------> [master]: to (${msg.deviceId})`);
					var found = devices.find(o => o.id === msg.deviceId);
					msg.deviceIp = found.ip;
					worker.send(msg);
					break;
				default:
					break;
			}
		});
	}

	// Listen for dying workers
	cluster.on('exit', function () {
		cluster.fork();
	});
} else {
	require('./server');
}