'esversion: 6';
const debug = require('debug')('nbiot_cloud_gw')
const name = 'redis-server'
var redis = require("redis");
const settings = require('./config.json');

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
		case 'store_IP':
			debug(name + ': [master] STORE_IP ---> [az_redis]: ' + JSON.stringify(msg));
			redis_client.set(
				msg.device.ip,
				msg.device.id,
				redis.print);
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
		case 'del_IP':
			redis_client.del(msg.device.id);
			break;
		default:
			break;
	}
});

module.exports = redis_client;