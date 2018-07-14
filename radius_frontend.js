var radius = require('./lib/radius');
var dgram = require("dgram");
var secret = 'radius_secret';
var radiusfe = dgram.createSocket("udp4");
const debug = require('debug')('telenet-udp-gw')
const name = 'radius-front-end'
radiusfe.on("message", function (msg, rinfo) {
  try {
    var packet = radius.decode({
        packet: msg,
        secret: secret
      }),
      type;

    switch (packet.attributes["Acct-Status-Type"]) {
      case 'Start':
        type = 'pdp_ON';
        debug('[cn aaa] ACC_START ----> [gw aaa]');
        break;
      case 'Stop':
        type = 'pdp_OFF';
        debug('[cn aaa] PDP_OFF----> [gw aaa]');
        break;
      default:
        debug('not a valid accounting operation, ignoring');
        break;
    }

    process.send({
      type: type,
      device: {
        id: packet.attributes["User-Name"],
        ip: packet.attributes["Framed-IP-Address"]
      }
    });
  } catch (e) {
    debug("Failed to decode radius packet, silently dropping:", e);
    return;
  }
});
debug(`radius client spawned: ${process.pid}`);
module.exports = radiusfe;