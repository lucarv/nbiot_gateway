'esversion: 6';
const debug = require('debug')('telenet-udp-gw')
const name = 'redis-server'
var redis = require("redis");
var redis_client = redis.createClient(6379, 'udpgw-telenet.redis.cache.windows.net');

redis_client.on('connect', function () {
	redis_client.auth('IrSTVJLKBYdDHer0o2e80iGkUBC54gPXKR9f6Yn0zgA=', (err) => {
		if (err) debug(err);
		else debug(`azure redis cache client spawned: ${process.pid}`);

	})
});

process.on('message', (msg) => {
	switch (msg.type) {
		case 'store_IP':
            debug('[master] STORE_IP ---> [az_redis]');
            debug('REDIS: ' + JSON.stringify(msg));
			let id = msg.device.id;
			//redis_client.set(msg.device.id, msg.device.ip);
			redis_client.hmset(id, {
				'id': msg.device.ip,
				'cs': 'null'
			});
			break;
		case 'get_IP':
			debug('[master] GET_IP ---> [az_redis]');
			debug('[Device Id: ' + msg.deviceId);

			redis_client.get(msg.deviceId, function (err, reply) {
				// reply is null when the key is missing
				debug('This is what I got from REDIS: ' + reply);
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
