'use strict';
'esversion:6';
const debug = require('debug')('telenet-udp-gw');
const name = 'cluster-master';
const cluster = require('cluster');
var worker;

if (cluster.isMaster) {
	// Count the machine's CPUs
	var cpuCount = require('os').cpus().length;

	// Create a worker for each CPU
	for (var i = 0; i < cpuCount; i += 1) {
		worker = cluster.fork();
		worker.on('message', (msg) => {
			switch (msg.type) {
				case 'pdp_ON':
					debug('[gw aaa] PDP_ON -------> [master]');
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
					debug('[gw aaa] PDP_OFF ------> [naster]');
					worker.send({
						type: 'disconn_DEV',
						device: msg.device
					});
					break;
				case 'd2c':
					debug('[udp gw] d2c ------> [master]');
					worker.send({
						type: 'd2c',
						ip: msg.ip,
						payload: msg.payload
					});
					break;
				case 'c2d':
					debug('[iot_dev] c2d ------> [master]');
					worker.send(msg); // just forward to the UDPGW worker
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
