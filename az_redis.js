'esversion: 6';
const debug = require('debug')('nbiot_cloud_gw')
const name = 'redis-server'
var redis = require("redis");
const settings = require('./data/config.json');

var redis_client = redis.createClient(6380, settings.redis.url, {
	auth_pass: settings.redis.key,
	tls: {
		servername: settings.redis.url
	}
});

redis_client.on('connect', function () {
	redis_client.auth(settings.redis.key, (err) => {
		if (err) debug(err);
		else debug(`${name} spawned: ${process.pid}`);

	})
});

process.on('message', (msg) => {
	switch (msg.type) {
		case 'store_device':
			debug(name + ': [master] STORE_IP ---> [az_redis]: ' + JSON.stringify(msg.device));
			redis_client.set(
				msg.device.ip,
				msg.device.id);
			redis_client.set(
				msg.device.id,
				msg.device.ip);
			break;
		case 'get_ID':
			debug(name + ': [[master] GET_ID ---> [az_redis]: ' + msg.deviceIp);
			redis_client.get(msg.deviceIp, function (err, reply) {
				process.send({
					type: 'got_ID',
					deviceId: reply
				});
			});
			break;
		case 'get_IP':
			debug(name + ': [[master] GET_IP ---> [az_redis]: ' + msg.deviceId);
			redis_client.get(msg.deviceId, function (err, reply) {
				process.send({
					type: 'got_IP',
					deviceIp: reply,
					payload: msg.payload
				});
			});
			break;
		case 'del_device':
			redis_client.del(msg.device.id);
			redis_client.del(msg.device.ip);
			break;
		default:
			break;
	}
});

module.exports = redis_client;