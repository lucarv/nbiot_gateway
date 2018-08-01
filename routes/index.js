'use strict';
const express = require('express');
const router = express.Router();
const redis = require("redis");
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

//routing
router.get('/tag', function (req, res, next) {
    debug(name + ': [[master] GET_IP ---> [az_redis]: ' + req.query);
    /*

    */

    res.send('nothing here');

});

module.exports = router;