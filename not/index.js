var Gpio = require('rpio2').Gpio;

var output = new Gpio(40);

output.open(Gpio.OUTPUT);

setInterval(()=>output.toggle(), 1000);

process.on("SIGINT", function(){
  output.close();
  process.exit(0);
});


