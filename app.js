'use strict';
'esversion:6';
const debug = require('debug')('nbiot_cloud_gw');
const name = 'cluster_master';
const cluster = require('cluster');
const settings = require('./data/config.json');
var redis = require("redis");
var redis_client = redis.createClient(6380, settings.redis.url, {
	auth_pass: settings.redis.key,
	tls: {
		servername: settings.redis.url
	}
});
redis_client.on('connect', function () {
	redis_client.auth(settings.redis.key, (err) => {
		if (err) debug(err);
		else {
			redis_client.flushdb(function (err, reply) { // make sure no older registrations are lingering on the cache
				if (err) debug(`${name}: err`);
			});
		}
	})
});
var worker;
var dev2ip = [],
	ip2dev = [];

var start = () => {
	if (cluster.isMaster) {
		// Count the machine's CPUs
		var cpuCount = require('os').cpus().length;
		require('dns').lookup(require('os').hostname(), function (err, add, fam) {
			if (err) debug(`can't start [${name}]: ${err}`);
			debug(`[${name}] started on ${add}`);
		});
		// Create a worker for each CPU
		for (var i = 0; i < cpuCount; i += 1) {
			worker = cluster.fork();

			worker.on('message', (msg) => {
				var found = false;
				switch (msg.type) {
					case 'PDP_ON':
						debug(`PDP_ON message from [radius_front_end] to [${name}]`);
						redis_client.get('ips', function (err, reply) {
							if (err) debug(`${name}: err`);
							else {
								let ipArray = JSON.parse(reply);
								if (!ipArray) ipArray = []; // this is the first ever PDP_ON
								let found = ipArray.find(o => o.ip === msg.device.ip);
								if (found) debug(`${name}: ignore faulty radius`);
								else {
									worker.send({ // add to AMQP connection Pool
										type: 'CONN_DEV',
										device: msg.device
									});
									dev2ip.push({ // add to maps
										"id": msg.device.id,
										"ip": msg.device.ip
									});
									ip2dev.push({
										"ip": msg.device.ip,
										"id": msg.device.id
									});
									// add to maps
									redis_client.set('ids', JSON.stringify(dev2ip));
									redis_client.set('ips', JSON.stringify(ip2dev));
								}
							}
						});
						break;
					case 'PDP_OFF':
						debug(`PDP_OFF message from [radius_front_end] to [${name}]`);
						redis_client.get('ips', function (err, reply) {
							if (err) debug(`${name}: err`);
							else {
								let ipArray = JSON.parse(reply);
								let found = ipArray.find(o => o.ip === msg.device.ip);
								if (found) {
									worker.send({ // remove from AMQP Connection Pool
										type: 'DISCONN_DEV',
										device: msg.device
									});
									// remove from maps 
									let indexIP = ip2dev.indexOf(found);
									ip2dev.splice(indexIP, 1);
									let indexDEV = dev2ip.indexOf({
										"id": found.id,
										"ip": found.ip
									})
									dev2ip.splice(indexDEV, 1);
									//remove from redis
									redis_client.set('ips', JSON.stringify(ip2dev));
									redis_client.set('ids', JSON.stringify(dev2ip));
								} else
									debug(`${name}: ignore faulty radius`);
							};
						});
						break;
					case 'OBSERVE':
						debug(`OBSERVE message from [hub_server] to [${name}]`);
						worker.send({
							type: 'OBSERVE',
							device: msg.device
						});
						break;
					case 'COAP_GET':
						debug(`COAP_GET message from [api_server] to [${name}]`);
						//NOT YET IMPLEMENTED
						break;
					case 'D2C':
						debug(`D2C message from [coap or udp] server to [${name}]`);
						redis_client.get('ips', function (err, reply) {
							if (err) debug(`${name}: err`);
							else {
								let ipArray = JSON.parse(reply);
								if (ipArray) {
									let found = ipArray.find(o => o.ip === msg.deviceIp);
									if (found) {
										worker.send({ // send to IoT Hub
											type: 'D2C',
											deviceId: found.id,
											payload: msg.payload
										});
										worker.send({ // save last sent message from device
											type: 'CACHE_WRITE',
											deviceId: found.id,
											payload: msg.payload
										});
									} else debug(`${name}: device not registered, discarding message`);
								} else debug(`${name}: NO devices registered, discarding message`);
							}
						});
						break;
					case 'C2D':
						debug(`C2D message from [coap or udp] server to [${name}]`);
						redis_client.get('ids', function (err, reply) {
							if (err) debug(`${name}: err`);
							else {
								let devArray = JSON.parse(reply);
								let found = devArray.find(o => o.id === msg.deviceId);
								if (found) {
									worker.send({ // send to device over raw UDP
										type: 'C2D',
										deviceIp: found.ip,
										payload: msg.payload
									});
								}
							}
						});
						break;
					case 'COAP_OSERVE':
						debug(`C2D message from [api_server] server to [${name}]`);
						worker.send({
							type: 'OBSERVE',
							deviceId: msg.deviceId
						});
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
};

if (!settings.hasOwnProperty('hostname')) {
	console.log('not configured. run npm run-script config on the console');
} else start();

module.exports.start = start;