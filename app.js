'use strict';
'esversion:6';
const debug = require('debug')('nbiot_cloud_gw');
const name = 'cluster-master';
const cluster = require('cluster');
const configFile = require('./config.json');

var worker;
var devices = [];

var start = function () {

	if (cluster.isMaster) {
		// Count the machine's CPUs
		var cpuCount = require('os').cpus().length;

		// Create a worker for each CPU
		for (var i = 0; i < cpuCount; i += 1) {

			worker = cluster.fork();

			worker.on('message', (msg) => {
				switch (msg.type) {
					case 'pdp_ON':
						debug(`${name}: [gw aaa] PDP_ON -------> [master]: ${msg.device.id}`);
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
						debug(`${name}: [gw aaa] PDP_OFF ------> [naster]: ${msg.device.id}`);
						worker.send({
							type: 'disconn_DEV',
							device: msg.device
						});
						break;
					case 'd2c':
						debug(`${name}: [udp server] d2c ------> [master]: from (${(msg.deviceIp)})`);
						worker.send({
							type: 'get_ID',
							deviceIp: msg.deviceIp
						});
						break;
					case 'got_ID':
						debug(`${name}: [az redis] gotID ------> [master]: from (${(msg.deviceId)})`);
						var found = devices.find(o => o.id === msg.deviceId);
						if (!found)
							debug(`device at ${msg.deviceId} not currently registered, ignore the message`)
						else
							worker.send({
								type: 'd2c',
								deviceId: found.id,
								payload: msg.payload
							});
						break;
					case 'c2d':
						debug(`${name}: [udp server] c2d ------> [master]: to (${msg.deviceId})`);
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
		require('./launcher');
	}
}

if (!configFile.hasOwnProperty('hostname')) {
	console.log('not configured. open <YOUR GATEWAY IP ADDRESS:8080/config on a browser ');
	var conf = require('./web_server');
} else start();

module.exports.start = start;