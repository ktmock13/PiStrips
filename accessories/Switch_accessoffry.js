// Couch accessory
var cmd = require('node-cmd');
var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;
const ws281x = require('../node_modules/rpi-ws281x-native/lib/ws281x-native');

var state = false;
var duration = 4000;
var interval = 0;

var accUUID = uuid.generate('hap-nodejs:accessories:switch2');

var acc = exports.accessory = new Accessory("Switch", accUUID);

function _clearLights() {
  console.log("Clear lights...");
  state = false;
  clearInterval(interval);
  ws281x.reset();

  acc.getService(Service.Switch)
    .getCharacteristic(Characteristic.On)
    .updateValue(state);
}

function _runRainbow() {
  var NUM_LEDS = 80,
  pixelData = new Uint32Array(NUM_LEDS);

  ws281x.init(NUM_LEDS);

  // ---- trap the SIGINT and reset before exit
  process.on('SIGINT', function () {
    ws281x.reset();
    process.nextTick(function () { process.exit(0); });
  });


  // ---- animation-loop
  var offset = 0;
  interval = setInterval(function () {
    for (var i = 0; i < NUM_LEDS; i++) {
      pixelData[i] = colorwheel((offset + i) % 256);
    }
    offset = (offset + 1) % 256;
    ws281x.render(pixelData);
  }, 1000 / 30);

  console.log('Press <ctrl>+C to exit.');

  // rainbow-colors, taken from http://goo.gl/Cs3H0v
  function colorwheel(pos) {
    pos = 255 - pos;
    if (pos < 85) { return rgb2Int(255 - pos * 3, 0, pos * 3); }
    else if (pos < 170) { pos -= 85; return rgb2Int(0, pos * 3, 255 - pos * 3); }
    else { pos -= 170; return rgb2Int(pos * 3, 255 - pos * 3, 0); }
  }

  function rgb2Int(r, g, b) {
   return ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
  }
}


acc.username = "1A:AA:AA:AA:AA:AB";
acc.pincode = "031-45-777";

acc.on('identify', function(paired, callback) {
  console.log("Identify switch");
  ws281x.reset();
  callback();
});

acc.addService(Service.Switch, "Switch")
  .getCharacteristic(Characteristic.On)
  .on('get', function(callback) {
    console.log("The current state is %s", state ? "on" : "off");
    callback(null, state);
  })
  .on('set', function(value, callback) {
    console.log("The switch has been flipped");
    state = value;
    _runRainbow();
    if(value) setTimeout(_clearLights, 10000);
    callback();
  });


