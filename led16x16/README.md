# 用树莓派驱动德飞莱16x16点阵屏显示汉字

这周尝试用树莓派驱动了 [LY-LED16x16B V2.1](http://item.jd.com/10377170101.html) 点阵屏。之所以选用这一款是因为它是 16 X 16 点阵（实际上是 4 块 8 X 8 LED 拼起来的，只不过已经集成好了）。LY-LED16x16B V2.1 本身是用于单片机的，官方提供了 51 单片机和 Arduino 下的测试程序。不过，我们有强大的树莓派，既然单片机能驱动，树莓派应该也不是问题。

<img src="https://dn-h5jun.qbox.me/matrix/FXGVviUOrFDo8DLglzttTh6I.jpg" style="max-width:640px">

<!--more-->
<style>
    article img{
        max-width: 640px;
        width: 100%;
    }
</style>

_德飞莱 LY-LED16x16B V2.1 led 点阵屏用在单片机开发板_

![LY-LED16x16B V2.1](https://dn-h5jun.qbox.me/matrix/p61UcFIeNAQ0iwJCEoiZnDBR.jpg)

_德飞莱 LY-LED16x16B V2.1 led 点阵屏连接树莓派_

![LY-LED16x16B V2.1](https://dn-h5jun.qbox.me/matrix/kBChYxpXyCHytEs-u37AnVtB.jpg)

_点亮效果（文字旁边的虚影不是因为显示问题，而是因为手机拍照时文字是移动的）_

那么，树莓派驱动这样一块集成 16 X 16 LED 点阵屏具体该怎么做呢？

## 点阵屏显示的原理

![](https://dn-h5jun.qbox.me/matrix/cfSsEo7uLq0gMPSx1FwIEXcc.jpg)

上面这张图是 LY-LED16x16B 的电路原理图，很久没接触数字电路的小伙伴看了是不是觉得头晕？其实一看到这张图，我也觉得晕，不过没有关系……

我们先来搞清楚点阵屏显示的基本原理：

### 简单 8x8 LED 点阵屏

基础的 8x8 点阵屏其实是这货——

![](https://dn-h5jun.qbox.me/matrix/No8mI9ZpnWE4b6Ck75drLHmD.jpg)

它的原理比较简单：

![](https://dn-h5jun.qbox.me/matrix/vRaHH6H-K_qbuODWxNxjAfLE.jpg)

上面这张图应该容易理解，它其实就是发光二极管排列成矩阵，利用二极管的单向导通特性，分别用 8 行、8 列一共 16 个引脚来控制。平时 R1 ~ R8 为低电平，C1 ~ C8 为高电平，此时二极管不导通。当要点亮第 i 行，第 j 列时，让 Ri 输出高电平，Cj 输出低电平即可。这样用 16 个引脚就可以来控制，显示的时候，每次只能控制一行，否则就会点亮我们不希望点亮的点。比如要想点亮 R2C2、R3C3 两个点，就要将 R2、R3 置为高电平，C2、C3 置为低电平，但如果同时操作的话，R2C3 和 R3C2 这两个点也会被点亮，所以只能先将 R2 置为高电平，C2 置为低电平，点亮 R2C2，然后将 R2、C2 恢复，再将 R3 置为高电平，C3 置为低电平。实际上这种方式也就是所谓的逐行扫描。

### 从 8x8 到 16x16

我们看到驱动普通的 8x8 点阵屏就要 16 个引脚，而 8x8 点阵屏对于显示汉字来说是远远不够的，那么为了显示汉字，我们就要将 4 个 8x8 点阵屏连接起来组成一个 16 x 16 点阵屏，但是这样的话，可想而知需要的引脚数量就更多了，用树莓派驱动如此多数量引脚的设备显然不现实。

然而，我们并不需要直接连接 4 个点阵屏，我们可以使用带有集成电路的 16x16 点阵屏，比如上面那一款。

### LY-LED16x16B V2.1

我们看一下 LY-LED16x16B 与普通点阵屏的区别。

![](https://dn-h5jun.qbox.me/matrix/BtvMYo3RPxveWcL7Y9IeYnqQ.jpg)

可以看到 LY-LED16x16B 由四块 8x8 点阵屏和一些控制器组成。它一共有 22 个引脚，但只有右侧 11 个引脚是输入引脚，左侧的 11 个 是输出引脚，用于多片级联。11 个输入引脚中除去最下方两个引脚是 VCC 和 GND 外，一共有 9 个控制引脚，从上到下分别是：R1、D、C、B、A、LATCH、SCK、G1、EN/OE。

这些引脚又分为几类：

- R1/G1，点亮 LED 灯的输入引脚。有的屏是红绿双色的，R1 是点亮红色，G1 是点亮绿色，因为我们是单色屏，所以 G1 引脚是不用的。注意这个 LED 点阵屏是共阳的，所以要点亮的话，应当输入低电平。

- D/C/B/A，行选信号，这是四位行选信号，表示点亮哪一行，例如要点亮第三行，需要向 B 引脚输入高电平，其他三个引脚输入低电平（行号从0开始，第一行是0000，第二行是0001，所以第三行是0010）。

- LATCH/SCK，SCK 是时钟信号，LATCH 是锁存器。注意到前面 R1/G1 输入只有一位，行选可以选行，那么我们怎么确定要点亮当前行的哪一列呢？这就需要用时钟和锁存器了。实际上如果学过数字电路的同学会比较容易理解。在这里我们用到触发器串行输入的概念，利用时钟脉冲信号触发寄存器存储当前值，一共 16 位寄存器能够存储 16 个值（最近的 16 个脉冲时，R1/G1 的逻辑值），当输入完成后，通过 LATCH 锁存器将寄存器的值保存，然后点亮 LED 灯输出。

- EN/OE 使能端，输出高电平时将关闭屏幕，这是因为实际显示时，逐行扫描的频率很高，锁存器输出和切换行几乎同时进行，因此切换时要将屏幕关掉，不然可能会将上一行的信号部分带到下一行，让字产生虚影（正常显示点旁边会有微弱点亮的LED）。

所以其实要显示内容的程序逻辑并不复杂，伪代码如下：

```
while(1){
  for(var i = 0; i < 16; i++){//行选
    LATCH = 0; //打开锁存，接收输入信号
    for(var j = 0; j < 16; j++){
      R1 = 当前位输出
      //给一个脉冲，记录到寄存器
      SCK = 0;
      SCK = 1;    
    }
    //一行写完了准备写入当前行
    OE = 1; //通过使能端关闭屏幕，避免虚影
    ROW = i;  //通过四位行选信号选择当前行
    LATCH = 1; //锁存并输出
    OE = 0; //打开使能，将数据显示在屏幕上
  }
}
```

可以看到，使用了 LATCH/SCK 之后操作并不复杂，却大大减少了需要的引脚数量，这就是集成 LED16x16 的作用。接下来该连线了。

### 设计电路

电路原理图如下：

![](https://dn-h5jun.qbox.me/pi-led-7.svg)

由于 LY-LED16x16B 需要 5V 供电，虽然也可以用树莓派供电，但为了以后扩展，最好还是接外部电源，因此 +5V 和 GND 不接树莓派。

- R1 接 P36
- LATCH/SCK 分别接 P38、P40
- OE 使能端接 P32
- 行选信号接 P29、P31、P33、P35

这样，理论上电路就可以工作了，但是有一个地方需要注意，由于输入端 R1 在树莓派不输出的时候悬空，SCK 频率又很高，容易产生噪点，影响显示效果，因此，最好在 R1 端加一个下拉电阻来稳定输入（阻值不能太大也不能太小，在 1k 左右即可），避免噪点产生：

![](https://dn-h5jun.qbox.me/pi-led-8.svg)

至此，电路设计就完成了。

## 设计程序

现在要开始设计驱动程序了。根据我们前面分析的原理，我们需要逐行输出。在这里我们可以使用一个16位二进制数来表示一行，也可以使用一个数组来表示。为了 JS 方便操作，我们不妨直接用数组来表示：

```js
var pixels = [
  [0,0,1,0,1,0......,0], //第 1 行
  [0,1,1,0,1,1......,1], //第 2 行
  ......
  [1,0,1,0,0,1......,0] //第 16 行
]
```

这样的话我们就需要将汉字转换为点阵数组来输出，这就涉及到另一个话题：

### 点阵字库

在上个世纪的 90 年代，16x16 和 32x32 点阵字库还在 PC 的操作系统和办公软件中使用。而现在，在 PC 上已经看不见点阵字库，基本上点阵字体都被更漂亮的矢量字库取代了。

一开始，我的思路是尝试将系统的宋体 `SimSun.ttf` 中文字的轮廓提取出来，然后转成点阵。这么做是可以的，只要通过 [fonteditor-core](https://github.com/kekee000/fonteditor-core) 将文字的 glyf（轮廓）提出来，然后根据矢量转成点阵即可。但是这么做发现在 32x32 下效果还可以，压缩到16x16之后，文字严重失真。分析原因可能是现在的矢量字体并不为低分辨率设计，也可能是我用的压缩算法有问题，不管怎么样，这么做比较难实现。

既然这样的话，那只能换一种思路，直接[下载 16x16 点阵字库](http://yunpan.cn/c62eHSfPDhYNv)。由于这个库是 1998 年的，所以它的编码是 GB2312，一部分 utf-8 中有的符号这个字库里面没有。由于是 GB2312 编码，因此我们还得做 UTF-8 到 GB2312 的转码。幸运地是，[iconv-lite](https://github.com/ashtuchkin/iconv-lite) 可以帮助我们做到。

要提取字库中的文字，也很简单，直接将字符的 unicode 通过 iconv-lite 转成 gbk 编码，然后查找对应的区位即可以定位文件中的位置，详细的转换方式可以参考[这篇文章](http://blog.csdn.net/c1505011056/article/details/25324687)。查找到文字在文件中的位置后，将其后的 32 个字节输出并转成一个 16x16 的二维数组即可。用 Node.js 实现的代码如下：

```js
const fs = require('fs');
const iconv = require('iconv-lite');
const fontBuffer = fs.readFileSync(__dirname + '/HZK16');

function readText(text){
  var ret = [];
  var gbkBytes = iconv.encode(text, 'gbk');

  for(var i = 0; i < gbkBytes.length / 2; i++){
    var qh = gbkBytes[2 * i] - 0xa0;
    var wh = gbkBytes[2 * i + 1] - 0xa0;

    var offset = (94 * (qh - 1) + (wh - 1)) * 32;
    var buff = fontBuffer.slice(offset, offset+32);
    var font = [];

    for(var j = 0; j < 16; j++){
      var row = ('00000000' + buff[2 * j].toString(2)).slice(-8)
        + ('00000000' + buff[2 * j + 1].toString(2)).slice(-8);
      row = row.split('').map(c=>0|c);
      font.push(row);
    }
    ret.push(font);
  }
  
  return ret;
}

module.exports = {readText};
```

### 最终将文字显示到点阵屏

接下来，将文字显示到点阵屏就简单了，方式就如前面的伪代码那样。

```js
const Gpio = require('rpio2').Gpio;
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

const readText = require('./lib/font_matrix.js').readText;
var pixels = readText('你好，世界！');
var startTime = Date.now();

while(1){
  var t = Math.floor((Date.now() - startTime) / 1000);
  
  data = pixels[t % pixels.length];  //1 秒钟换一个字，循环播放
   
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
```

这里面有一个地方要注意，那就是因为设备用的是锁存器，所以输入最早的信号出现在右侧（可以将锁存器想象为一个接收信号的堆栈，当堆栈装满了之后输出，所以最先收到的信号在最后，因此输入的时候要颠倒一下：`red.value = data[j][15 - i]`）。

### 让文字运动起来

上面的代码，我们是让点阵屏一秒钟换一个字，循环播放“你好，世界！”。注意到生活中的广告屏（比如公交车上的）都是能让文字移动滚动的，这样更生动一些。那么我们可不可以让文字也滚动循环播放呢？答案当然是可以的。事实上我们很容易能实现这样的动画，实现后的显示效果可以[看这里](http://weibo.com/p/230444c1be420b98857e15eed628696461d966)。

具体怎么实现，留给各位小伙伴思考。想到或想不到的，都可以看我的[实现代码](https://github.com/akira-cn/pi-node-apps/blob/master/led16x16/index.js)。

## 总结

通过实战设计电路和编写代码驱动 LED 点阵屏，我们也重新复习或了解了数字电路中的时序和锁频输入输出（LATCH/SCK）的重要概念。利用树莓派和 Node.js 可以很方便地设计硬件和软件来实现有趣的功能。这个小小的点阵屏板，也可以用来做很多事情。有同事就希望可以将它放在车后面，然后用手机控制它输出的文本内容，这个实际上是可以做到的，尤其是通过 WoT（Web of Things），我们可以将各种设备连接到一起。

有任何问题，欢迎留言讨论~