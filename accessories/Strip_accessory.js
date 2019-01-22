var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;

const ws281x = require('../node_modules/rpi-ws281x-native/lib/ws281x-native');

let interval = 0;
var NUM_LEDS = 80;
var pixelData = new Uint32Array(NUM_LEDS);



function _kill() {
  console.log('..._kill called...');
  clearInterval(interval);
  setTimeout(() => ws281x.reset(), 600); //let last renders finish
  interval = 0;
}
process.on('SIGINT', function () {
  _kill()
  process.nextTick(function () { process.exit(0); });
});

function _setStaticColor(h, s) {
  s = s/100;
  const l = .50;
  console.log('..._setStatic called...');
  ws281x.init(NUM_LEDS);
  console.log(`hsl... ${h} ${s} ${l}`);
  let rgb = hslToRgb(h, s, l);
  console.log(`rgb... ${rgb[0]} ${rgb[1]} ${rgb[2]}`);
  let hex = rgbToHex(rgb);
  console.log(`hex... ${hex}`);
  for(var i = 0; i < NUM_LEDS; i++) {
      pixelData[i] = hex;
  }
  ws281x.render(pixelData);
  ws281x.setBrightness(255);

  // // ---- puling animation-loop
  // var t0 = Date.now();
  // setInterval(function () {
  //     var dt = Date.now() - t0;

  //     ws281x.setBrightness(
  //         Math.floor(Math.sin(dt/1000) * 128 + 128));
  // }, 1000 / 30);

}

function _runRainbow() {
  if(!interval) { //check if it's already running
    console.log('..._runRainbow called...');
    ws281x.init(NUM_LEDS);

    // ---- animation-loop
    var offset = 0;
    interval = setInterval(function () {
      for (var i = 0; i < NUM_LEDS; i++) {
        pixelData[i] = colorwheel((offset + i) % 256);
      }
      offset = (offset + 1) % 256;
      ws281x.render(pixelData);
    }, 1000 / 30);

    // rainbow-colors, taken from http://goo.gl/Cs3H0v
    function colorwheel(pos) {
      pos = 255 - pos;
      if (pos < 85) { return rgb2Int(255 - pos * 3, 0, pos * 3); }
      else if (pos < 170) { pos -= 85; return rgb2Int(0, pos * 3, 255 - pos * 3); }
      else { pos -= 170; return rgb2Int(pos * 3, 255 - pos * 3, 0); }
    }
  }
}

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(arr) {
  return "0x"+ arr.map(function(x){             //For each array element
    x = parseInt(x).toString(16);      //Convert to a base16 string
    return (x.length==1) ? "0"+x : x;  //Add zero if we get only one character
}).join("")}

function hslToRgb(hue, sat, light) {
  var t1, t2, r, g, b;
  hue = hue / 60;
  if ( light <= 0.5 ) {
    t2 = light * (sat + 1);
  } else {
    t2 = light + sat - (light * sat);
  }
  t1 = light * 2 - t2;
  r = hueToRgb(t1, t2, hue + 2) * 255;
  g = hueToRgb(t1, t2, hue) * 255;
  b = hueToRgb(t1, t2, hue - 2) * 255;
  return [Math.round(r),Math.round(g),Math.round(b)];
}
function hueToRgb(t1, t2, hue) {
  if (hue < 0) hue += 6;
  if (hue >= 6) hue -= 6;
  if (hue < 1) return (t2 - t1) * hue + t1;
  else if(hue < 3) return t2;
  else if(hue < 4) return (t2 - t1) * (4 - hue) + t1;
  else return t1;
}


var LightController = {
  name: "Strip Light", //name of accessory
  pincode: "031-45-707",
  username: "1A:AA:AA:AA:AA:AD", // MAC like address used by HomeKit to differentiate accessories. 

  power: false, //current power status
  brightness: 100, //current brightness
  hue: 0, //current hue
  saturation: 0, //current saturation

  outputLogs: false, //output logs

  

  setPower: function(status) { //set power of accessory
    if(this.outputLogs) console.log("Turning the '%s' %s", this.name, status ? "on" : "off");
    this.power = status;
    if(status){
      _setStaticColor(this.hue, this.saturation);
    } else {
      _kill();
    }
  },

  getPower: function() { //get power of accessory
    if(this.outputLogs) console.log("'%s' is %s.", this.name, this.power ? "on" : "off");
    return this.power;
  },

  setBrightness: function(brightness) { //set brightness
    if(this.outputLogs) console.log("Setting '%s' brightness to %s", this.name, brightness);
    this.brightness = brightness;
    if(!brightness) _kill();  //if the brightness is being set to 0
    if(brightness && !interval) _setStaticColor(this.hue, this.saturation); //if the brightness is getting set but lights arent running
  },

  getBrightness: function() { //get brightness
    if(this.outputLogs) console.log("'%s' brightness is %s", this.name, this.brightness);
    return this.brightness;
  },

  setSaturation: function(saturation) { //set brightness
    if(this.outputLogs) console.log("Setting '%s' saturation to %s", this.name, saturation);
    this.saturation = saturation;
    _setStaticColor(this.hue, this.saturation);
  },

  getSaturation: function() { //get brightness
    if(this.outputLogs) console.log("'%s' saturation is %s", this.name, this.saturation);
    return this.saturation;
  },

  setHue: function(hue) { //set brightness
    if(this.outputLogs) console.log("Setting '%s' hue to %s", this.name, hue);
    this.hue = hue;
    _setStaticColor(this.hue, this.saturation);
  },

  getHue: function() { //get hue
    if(this.outputLogs) console.log("'%s' hue is %s", this.name, this.hue);
    return this.hue;
  },

  identify: function() { //identify the accessory
    if(this.outputLogs) console.log("Identify the '%s'", this.name);
  }
}

// Generate a consistent UUID for our light Accessory that will remain the same even when
// restarting our server. We use the `uuid.generate` helper function to create a deterministic
// UUID based on an arbitrary "namespace" and the word "light".
var lightUUID = uuid.generate('hap-nodejs:accessories:light2' + LightController.name);

// This is the Accessory that we'll return to HAP-NodeJS that represents our light.
var lightAccessory = exports.accessory = new Accessory(LightController.name, lightUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
lightAccessory.username = LightController.username;
lightAccessory.pincode = LightController.pincode;

// listen for the "identify" event for this Accessory
lightAccessory.on('identify', function(paired, callback) {
  LightController.identify();
  callback();
});

// Add the actual Lightbulb Service and listen for change events from iOS.
// We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
lightAccessory
  .addService(Service.Lightbulb, LightController.name) // services exposed to the user should have "names" like "Light" for this case
  .getCharacteristic(Characteristic.On)
  .on('set', function(value, callback) {
    LightController.setPower(value);

    // Our light is synchronous - this value has been successfully set
    // Invoke the callback when you finished processing the request
    // If it's going to take more than 1s to finish the request, try to invoke the callback
    // after getting the request instead of after finishing it. This avoids blocking other
    // requests from HomeKit.
    callback();
  })
  // We want to intercept requests for our current power state so we can query the hardware itself instead of
  // allowing HAP-NodeJS to return the cached Characteristic.value.
  .on('get', function(callback) {
    callback(null, LightController.getPower());
  });

// To inform HomeKit about changes occurred outside of HomeKit (like user physically turn on the light)
// Please use Characteristic.updateValue
// 
// lightAccessory
//   .getService(Service.Lightbulb)
//   .getCharacteristic(Characteristic.On)
//   .updateValue(true);

// also add an "optional" Characteristic for Brightness
lightAccessory
  .getService(Service.Lightbulb)
  .addCharacteristic(Characteristic.Brightness)
  .on('set', function(value, callback) {
    LightController.setBrightness(value);
    callback();
  })
  .on('get', function(callback) {
    callback(null, LightController.getBrightness());
  });

// also add an "optional" Characteristic for Saturation
lightAccessory
  .getService(Service.Lightbulb)
  .addCharacteristic(Characteristic.Saturation)
  .on('set', function(value, callback) {
    LightController.setSaturation(value);
    callback();
  })
  .on('get', function(callback) {
    callback(null, LightController.getSaturation());
  });

// also add an "optional" Characteristic for Hue
lightAccessory
  .getService(Service.Lightbulb)
  .addCharacteristic(Characteristic.Hue)
  .on('set', function(value, callback) {
    LightController.setHue(value);
    callback();
  })
  .on('get', function(callback) {
    callback(null, LightController.getHue());
  });