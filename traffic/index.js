const Gpio = require('rpio2').Gpio;

const traffic = Gpio.group([40, 38, 36], true);

traffic.open(Gpio.OUTPUT, Gpio.LOW);

const green = 0b001, yellow = 0b010, red = 0b100;

function turn(color){
  return new Promise(function(resolve, reject) {
   traffic.value = color;
    resolve();
  });
}

function wait(time){
  return new Promise(function(resolve, reject) {
    setTimeout(resolve,time);
  });
}

void function (){
    turn(green)
    .then(wait.bind(null, 5000))
    .then(turn.bind(null, yellow))
    .then(wait.bind(null, 2000))
    .then(turn.bind(null, red))
    .then(wait.bind(null, 5000))
    .then(arguments.callee)
}();

process.on("SIGINT", function(){
  traffic.close();

  console.log('shutdown!');
  process.exit(0);
});
