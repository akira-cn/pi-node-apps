const Gpio = require('rpio2').Gpio;
const readText = require('./lib/font_matrix.js').readText;
var pixels = readText('你好，世界！');

function scrollDatas(pixels, offset){
  var len = pixels.length;
  offset = offset % ((len + 2) * 16);

  var ret = [];

  for(var i = 0; i < 16; i++){
    ret[i] = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    for(var j = 0; j < len; j++){
      ret[i] = ret[i].concat(pixels[j][i]);
    }
    ret[i] = ret[i].concat([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
    ret[i] = ret[i].slice(offset, offset + 16);
  }
  return ret;
}

var latch = new Gpio(38);//锁存器 
var clk = new Gpio(40); //时钟信号
var red = new Gpio(36, true); //点阵输出信号
var oe = new Gpio(32); //使能信号
var rows = Gpio.group([29,31,33,35]);

rows.open(Gpio.OUTPUT, Gpio.LOW); 
rows.value = 0; //选行
latch.open(Gpio.OUTPUT, Gpio.HIGH); //锁存输出
clk.open(Gpio.OUTPUT, Gpio.LOW);
red.open(Gpio.OUTPUT, Gpio.HIGH);
oe.open(Gpio.OUTPUT, Gpio.HIGH);
rows.value = 0;

var cmd = process.argv[2];

if(cmd === 'stop'){

  rows.close();
  latch.close();
  clk.close();
  oe.close();
  red.close();

  console.log('stop all pins');
  process.exit(0);
}

var data = scrollDatas(pixels, 0), 
  scroll = 0;

var startTime = Date.now();
while(1){
  var t = Math.floor((Date.now() - startTime) / 60);
  if(t !== scroll){
    scroll = t;
    data = scrollDatas(pixels, scroll);
  }
  

  for(var j = 0; j < 16; j++){    
    latch.value = 0;
    for(var i = 0; i < 16; i++){
      red.value = data[j][15 - i]; //注意输入信号从右到左，所以左右要颠倒一下
      clk.value = 0;
      clk.value = 1;
    }
    oe.value = 1;
    rows.value = j;
    latch.value = 1;
    oe.value = 0;
  }
}

/*process.on("SIGINT", function(){
  rows.close();
  latch.close();
  clk.close();
  red.close();

  console.log('shutdown!');
  process.exit(0);
});*/
