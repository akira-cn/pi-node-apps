'use strict';

const Gpio = require('rpio2').Gpio;
const wait = require('wait-promise');

const NUMS = [
  0b11010111, //0
  0b00010001, //1
  0b11001011, //2
  0b01011011, //3
  0b00011101, //4
  0b01011110, //5
  0b11011110, //6
  0b00010011, //7
  0b11011111, //8
  0b01011111, //9
];

const DP = 0b00100000; //.

var digitGroup = Gpio.group([29,31,33,35,37,36,38,40], true);
var portGroup = Gpio.group([11,13,15,16]);

digitGroup.open(Gpio.OUTPUT, Gpio.LOW);
portGroup.open(Gpio.OUTPUT, Gpio.LOW);

const startTime = Date.now();
const duration = process.argv[2] * 1000;

if(duration <= 0 || duration > 999000){
    console.error('Duration must between 1 and 999!');
    process.exit(1);
}

wait.every(1).and(function(port){
  var time = duration - (Date.now() - startTime);

  var p = 1 << (port++%4);
  digitGroup.value = 0; //将前一个点亮的数码管关闭
  portGroup.value = p;  //将当前数码管点亮

  if(time <= 0){
    //倒计时结束显示 000.0
    digitGroup.value = NUMS[0] | (p & 0b100 ? DP : 0);
    return;
  }

  if(p & 0b1000){
    //十分位
    digitGroup.value = NUMS[Math.floor(time / 100) % 10];
  }else if(p & 0b100){
    //个位，要显示一个小数点
    digitGroup.value = NUMS[Math.floor(time / 1000) % 10] | DP;
  }else if(p & 0b10){
    //十位
    digitGroup.value = NUMS[Math.floor(time / 10000) % 10];
  }else if(p & 0b1){
    //百位
    digitGroup.value = NUMS[Math.floor(time / 100000) % 10];
  }
}).forward();

process.on("SIGINT", function(){
  digitGroup.close();
  portGroup.close();

  console.log('shutdown!');
  process.exit(0);
});

