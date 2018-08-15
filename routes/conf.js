'use strict';
const express = require('express');
const router = express.Router();
const jf = require('jsonfile');
const redis = require("redis");

//routing



router.get('/', function (req, res, next) {
  res.render('config', {
    title: 'Config Page',
  });
});

router.post('/config', function (req, res, next) {
  let connstr = req.body.cs;
  let end = connstr.indexOf(';', 0);
  let hostname = (connstr.slice(0, end));
  let config = {
    "hostname": hostname,
    "connectionString": req.body.cs,
    "ipVersion": req.body.ipv,
    "redis": {
      key: req.body.rkey,
      url: req.body.rurl
    },
    "ports": {
      "radius": req.body.radius,
      "udp_raw_d2c": req.body.d2c,
      "udp_raw_c2d": req.body.c2d,
      "coap": req.body.coap,
      "api": req.body.api
    }
  }

  jf.writeFileSync('./data/config.json', config);
  res.json(config);
  process.exit();
});

module.exports = router;