const Gpio = require('rpio2').Gpio;
const wait = require('wait-promise');

const colorLed = Gpio.group([40,38,36], true);
colorLed.open(Gpio.OUTPUT, Gpio.LOW);

wait.every(1000).and(function(t){
  colorLed.value = t % 8;
}).forward(); 

process.on("SIGINT", function(){
  colorLed.close();

  console.log('shutdown!');
  process.exit(0);
});
