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
