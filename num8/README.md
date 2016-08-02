# 用树莓派驱动八段数码管实现倒计时

[前面的文章](https://www.h5jun.com/post/raspberry-pi.html)我们说过，树莓派的 GPIO （通用输入输出）口设置为 OUTPUT 状态时，可以用程序控制它的电平高低，从而输出 0 和 1 逻辑。树莓派 Model B+ 一共有 26 个 GPIO 接口，今天我们用它其中的 12 个来驱动一组 4 个[八段数码管](http://baike.baidu.com/view/3080038.htm)。

在讲解具体实现之前，我们先来看一下成品：

<a href="http://weibo.com/p/230444961d86257b47c7ee06c08c0a42979814" target="_blank"><img src="https://p.ssl.qhimg.com/d/inn/932c6216/num8.jpg" style="max-width: 400px;width:100%;"></a>

<!--more-->

在这里，我们用一组 4 个八段数码管来实现一个倒计时器，用 node.js 的命令行启动，传入一个 1~999 的数字参数来表示秒数，然后数码管显示对应的数字并开始倒计时，时间精确到 0.1 秒。

要实现这个功能，我们先来了解什么是八段数码管，以及多位八段数码管的显示原理。

## 八段数码管

八段数码管由 8 个发光二极管组成，其中 7 个用于组成数字，1 个用于显示小数点。每一根的编号如下图的右上角所示(A-G,DP)。

![八段数码管](https://p.ssl.qhimg.com/d/inn/8198eac7/3461.jpg)

八段数码管又分为共阳和共阴两种，如果 8 个发光二极管共用 1 个正极，接 VCC，8 个输入引脚输入信号为低电平时点亮，叫做共阳数码管。反过来，如果 8 个发光二极管共用 1 个负极，接 GND，8 个输入引脚接入输入信号为高电平时点亮，叫做共阴数码管。本文采用的数码管型号为  [F3461BH](http://item.jd.com/10064834450.html)，是共阳数码管。

从上面分析可知，八段数码管有 8 个输入，一个公共正/负极，这样一位就是 9 个引脚。那么，4 位数码管是否就需要多达 36 个引脚呢？

实际上并不是，因为 4 位数码管也可以共用 8 个输入引脚，再分别各自引出公共正/负级，这样一共是 8 + 4 = 12 个引脚，然后利用控制公共正/负极输出的方式轮流显示。由于人的视觉暂留现象及发光二极管的余辉效应，尽管实际上各位数码管并非同时点亮，但只要扫描的速度足够快，给人的印象就是一组稳定的显示数据，不会有闪烁感，动态显示的效果和静态显示是一样的，能够节省大量的I/O端口，而且功耗更低。**事实上，这种方式也是电子电路常用的方法，例如点阵屏的逐行扫描，也是用同样的原理。**

从上面 F3461BH 数码管的电路图可知，它的 12 个引脚中，第 6、8、9、12 引脚分别为 4 个数码管的公共正极，第 1、2、3、4、5、7、10、11 引脚为 8 段输入引脚。

## 电压和限流

了解了八段数码管的原理，基本上就知道该怎样接入了，但是我们还需要注意一下电子元件的参数，一般的数码管电压为 2V，电流 1~10mA，而树莓派 GPIO 高电平输出的电压约 3.3V，所以需要接限流电阻，电阻阻值的范围为：

- R<sub>min</sub>(3.3 - 2) / 0.01 = 130Ω
- R<sub>max</sub>(3.3 - 2) / 0.001 = 1.3kΩ

所以我们在每个正极接一个 1kΩ 的电阻，这样一共是 4 个电阻。

## 连接电路

上面的分析可知我们要用 4 个引脚来连接 4 个共阳极，用来选择点亮哪一个数码管，用 8 个引脚来连接数码管的 8 段输入，用来决定显示什么数字。这样一共是占用 12 个 GPIO 口，我的选择是：

- 数码管选择端口：11,13,15,23
- 数码管输出端口：29,31,33,35,37,36,38,40

最终的电路图如下：

![原理图](https://p.ssl.qhimg.com/d/inn/53f13007/pi-num8.png)

## 实现程序

根据原理图，程序需要控制 2 组 GPIO 引脚，分别来控制数字显示和数码管切换。我们可以先一个部分一个部分调试，首先来看数字显示。

### 显示数字

根据上面的电路图，我们先将下方 8 个输出引脚接好，上边 4 个先不接，先将 P11（GPIO Pin 17）引脚的那一端直接接在 V3.3+ 的正极上，然后写测试程序：

```js
'use strict';

const Gpio = require('rpio2').Gpio;

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
digitGroup.open(Gpio.OUTPUT, Gpio.LOW);

digitGroup.value = NUMS[5]; //显示数字 5

//5 秒后换成显示带小数点的数字 3.

setTimeout(function(){
  digitGroup.value = NUMS[3] | DP;
}, 5000);

//10 秒后关闭
setTimeout(function(){
  digitGroup.close();
}, 10000);
```

[rpio2](https://github.com/akira-cn/rpio2) 版本 V0.4+ 之后支持 GpioGroup，可以通过 `Gpio.group(pins[, activeLow])` 快速创建一组 GPIO 输入。在这里我们创建了负责显示 8 段数字的 group，直接给它输入一个八位二进制数就可以控制显示内容了。

由于是共阳管，点亮时输入端信号为低电平，在这里我们为了方便起见，可以给 group 方法传第二个参数，把 activeLow 设置为 true，这样就可以用 1 表示低电平，0 表示高电平了。


接着测试一下 8 个输入引脚分别对应点亮数码管的哪一段，然后把 0~9 分别拼出来，根据我们的线路接法，就得到上面的常量 MAP：

```js
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
```

不同的线路接法或者 group 第一个参数的引脚数组的不同次序，会得到不同的常量组合，但是基本原理是一样的。

这样我们就可以简单地通过：

```js
digitGroup.value = NUMS[n];
```

来显示 n 这个数字了。如果要显示小数点，可以：

```js
digitGroup.value = NUMS[n] | DP;
```

### 切换数码管

接下来我们解决切换 4 个数码管的部分，同样我们用一个 group 来实现：

```js
var portGroup = new Gpio.group([11,13,15,16]);

const wait = require('wait-promise');

//轮流点亮数码管
wait.every(1).and(function(port){
  var p = 1 << (port++%4);
  digitGroup.value = 0; //将前一个点亮的数码管关闭
  portGroup.value = p; //将当前数码管点亮
});
```

将这部分代码和前面的代码结合起来，我们会看到 4 个数码管同时被点亮了。在这里我用了一个 [wait-promist](https://github.com/akira-cn/wait-promise) 库，它可以很方便地用来实现轮询。

### 两者结合并计时

下面我们要做的事情就是计时，并且将时间显示的值和轮询结合起来：

```js
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
```

### 收工 

最后是完整代码：

```js
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
```

这样我们就可以使用 Node.js 命令行控制八段数码管实现倒计时了：

```bash
node index.js 100  #倒计时 100 秒
```

## 总结

上面我们用不到 100 代码就实现了用树莓派控制八段数码管显示倒计时。硬件软件结合的开发不仅需要考虑软件程序逻辑，还需要考虑硬件参数和电路，因此需要的综合能力更高，开发起来也更有趣。

后续文章里我会继续和大家分享有关树莓派开发 Node.js 程序控制硬件的话题，我们可以做一些更好玩的东西。如果你有树莓派，你可以和我一起动手。如有任何问题，欢迎提 issue 讨论。
