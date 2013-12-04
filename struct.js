var Crypto = require('crypto');
var constants = process.binding('constants');
var CM = require('chunkmanager');
var CRC16_TAB = new Array(
    0x0000,0x1021,0x2042,0x3063,0x4084,0x50A5,0x60C6,0x70E7,0x8108,0x9129,0xA14A,0xB16B,0xC18C,
    0xD1AD,0xE1CE,0xF1EF,0x1231,0x0210,0x3273,0x2252,0x52B5,0x4294,0x72F7,0x62D6,0x9339,0x8318,
    0xB37B,0xA35A,0xD3BD,0xC39C,0xF3FF,0xE3DE,0x2462,0x3443,0x0420,0x1401,0x64E6,0x74C7,0x44A4,
    0x5485,0xA56A,0xB54B,0x8528,0x9509,0xE5EE,0xF5CF,0xC5AC,0xD58D,0x3653,0x2672,0x1611,0x0630,
    0x76D7,0x66F6,0x5695,0x46B4,0xB75B,0xA77A,0x9719,0x8738,0xF7DF,0xE7FE,0xD79D,0xC7BC,0x48C4,
    0x58E5,0x6886,0x78A7,0x0840,0x1861,0x2802,0x3823,0xC9CC,0xD9ED,0xE98E,0xF9AF,0x8948,0x9969,
    0xA90A,0xB92B,0x5AF5,0x4AD4,0x7AB7,0x6A96,0x1A71,0x0A50,0x3A33,0x2A12,0xDBFD,0xCBDC,0xFBBF,
    0xEB9E,0x9B79,0x8B58,0xBB3B,0xAB1A,0x6CA6,0x7C87,0x4CE4,0x5CC5,0x2C22,0x3C03,0x0C60,0x1C41,
    0xEDAE,0xFD8F,0xCDEC,0xDDCD,0xAD2A,0xBD0B,0x8D68,0x9D49,0x7E97,0x6EB6,0x5ED5,0x4EF4,0x3E13,
    0x2E32,0x1E51,0x0E70,0xFF9F,0xEFBE,0xDFDD,0xCFFC,0xBF1B,0xAF3A,0x9F59,0x8F78,0x9188,0x81A9,
    0xB1CA,0xA1EB,0xD10C,0xC12D,0xF14E,0xE16F,0x1080,0x00A1,0x30C2,0x20E3,0x5004,0x4025,0x7046,
    0x6067,0x83B9,0x9398,0xA3FB,0xB3DA,0xC33D,0xD31C,0xE37F,0xF35E,0x02B1,0x1290,0x22F3,0x32D2,
    0x4235,0x5214,0x6277,0x7256,0xB5EA,0xA5CB,0x95A8,0x8589,0xF56E,0xE54F,0xD52C,0xC50D,0x34E2,
    0x24C3,0x14A0,0x0481,0x7466,0x6447,0x5424,0x4405,0xA7DB,0xB7FA,0x8799,0x97B8,0xE75F,0xF77E,
    0xC71D,0xD73C,0x26D3,0x36F2,0x0691,0x16B0,0x6657,0x7676,0x4615,0x5634,0xD94C,0xC96D,0xF90E,
    0xE92F,0x99C8,0x89E9,0xB98A,0xA9AB,0x5844,0x4865,0x7806,0x6827,0x18C0,0x08E1,0x3882,0x28A3,
    0xCB7D,0xDB5C,0xEB3F,0xFB1E,0x8BF9,0x9BD8,0xABBB,0xBB9A,0x4A75,0x5A54,0x6A37,0x7A16,0x0AF1,
    0x1AD0,0x2AB3,0x3A92,0xFD2E,0xED0F,0xDD6C,0xCD4D,0xBDAA,0xAD8B,0x9DE8,0x8DC9,0x7C26,0x6C07,
    0x5C64,0x4C45,0x3CA2,0x2C83,0x1CE0,0x0CC1,0xEF1F,0xFF3E,0xCF5D,0xDF7C,0xAF9B,0xBFBA,0x8FD9,
    0x9FF8,0x6E17,0x7E36,0x4E55,0x5E74,0x2E93,0x3EB2,0x0ED1,0x1EF0
);

function crc16Add(crc,c){
  return CRC16_TAB[((crc>>8)^c)&0xFF]^((crc<<8)&0xFFFF);
};

function crc16BufferValue(buf,offset,length){
  var crc = 0;
  offset = offset||0;
  length = length||buf.length;

  for (var i = 2+offset, len = length+offset; i < len; ++i)
  {
    crc = crc16Add(crc, buf[i]);
  }
  return crc;
};

function crc16Buffer(buf){
  buf.writeUInt16LE(crc16BufferValue(buf),0);
};

function crc16BufferCheck(buf,offset,length){
  offset = offset||0;
  var bv = crc16BufferValue(buf,offset,length);
  var bo = buf.readUInt16LE(offset);
  //console.log(bv,'===',bo,'?');
  return bv===bo;
};



function StructElement(){ }
StructElement.prototype.bufferName = function(){return '';}
StructElement.prototype.sizeInBytes = function(){return 0;}
StructElement.prototype.read = function(buffer,offset){
	throw "This should never be called";
  try{
  return buffer['read'+this.bufferName()](offset);
  }
  catch(e){
    console.log('error reading',e);
  }
};
StructElement.prototype.write = function(value,buffer,offset){
  buffer['write'+this.bufferName()](value,offset);
};

function UInt8(){ }
UInt8.prototype = new StructElement();
UInt8.prototype.constructor = UInt8;
UInt8.prototype.bufferName = function(){return 'UInt8';}
UInt8.prototype.read = function (buffer, offset) {return buffer.readUInt8(offset);}
UInt8.prototype.sizeInBytes = function(){return 1;}
function Int8(){ }
Int8.prototype = new StructElement();
Int8.prototype.constructor = Int8;
Int8.prototype.read = function (buffer, offset) {return buffer.readInt8(offset);}
Int8.prototype.bufferName = function(){return 'Int8';}
Int8.prototype.sizeInBytes = function(){return 1;}
function UInt16LE(){ }
UInt16LE.prototype = new StructElement();
UInt16LE.prototype.constructor = UInt16LE;
UInt16LE.prototype.bufferName = function(){return 'UInt16LE';}
UInt16LE.prototype.read = function (buffer, offset) {return buffer.readUInt16LE(offset);}
UInt16LE.prototype.sizeInBytes = function(){return 2;}
function UInt16BE(){ }
UInt16BE.prototype = new StructElement();
UInt16BE.prototype.constructor = UInt16BE;
UInt16BE.prototype.bufferName = function(){return 'UInt16BE';}
UInt16BE.prototype.read = function (buffer, offset) {return buffer.readUInt16BE(offset);}
UInt16BE.prototype.sizeInBytes = function(){return 2;}
function Int16LE(){ }
Int16LE.prototype = new StructElement();
Int16LE.prototype.constructor = UInt16LE;
Int16LE.prototype.bufferName = function(){return 'Int16LE';}
Int16LE.prototype.read = function (buffer, offset) {return buffer.readInt16LE(offset);}
Int16LE.prototype.sizeInBytes = function(){return 2;}
function Int16BE(){ }
Int16BE.prototype = new StructElement();
Int16BE.prototype.constructor = UInt16BE;
Int16BE.prototype.bufferName = function(){return 'Int16BE';}
Int16BE.prototype.read = function (buffer, offset) {return buffer.readInt16BE(offset);}
Int16BE.prototype.sizeInBytes = function(){return 2;}
function UInt32LE(){ }
UInt32LE.prototype = new StructElement();
UInt32LE.prototype.constructor = UInt32LE;
UInt32LE.prototype.bufferName = function(){return 'UInt32LE';}
UInt32LE.prototype.read = function (buffer, offset) {return buffer.readUInt32LE(offset);}
UInt32LE.prototype.sizeInBytes = function(){return 4;}
function UInt32BE(){ }
UInt32BE.prototype = new StructElement();
UInt32BE.prototype.constructor = UInt32BE;
UInt32BE.prototype.bufferName = function(){return 'UInt32BE';}
UInt32BE.prototype.read = function (buffer, offset) {return buffer.readUInt32BE(offset);}
UInt32BE.prototype.sizeInBytes = function(){return 4;}
function Int32LE(){ }
Int32LE.prototype = new StructElement();
Int32LE.prototype.constructor = Int32LE;
Int32LE.prototype.bufferName = function(){return 'Int32LE';}
Int32LE.prototype.read = function (buffer, offset) {return buffer.readInt32LE(offset);}
Int32LE.prototype.sizeInBytes = function(){return 4;}
function Int32BE(){ }
Int32BE.prototype = new StructElement();
Int32BE.prototype.constructor = Int32BE;
Int32BE.prototype.bufferName = function(){return 'Int32BE';}
Int32BE.prototype.read = function (buffer, offset) {return buffer.readInt32BE(offset);}
Int32BE.prototype.sizeInBytes = function(){return 4;}
function FloatLE(){ }
FloatLE.prototype = new StructElement();
FloatLE.prototype.constructor = FloatLE;
FloatLE.prototype.bufferName = function(){return 'FloatLE';}
FloatLE.prototype.read = function (buffer, offset) {return buffer.readFloatLE(offset);}
FloatLE.prototype.sizeInBytes = function(){return 4;}
function FloatBE(){ }
FloatBE.prototype = new StructElement();
FloatBE.prototype.constructor = FloatBE;
FloatBE.prototype.bufferName = function(){return 'FloatBE';}
FloatBE.prototype.read = function (buffer, offset) {return buffer.readFloatBE(offset);}
FloatBE.prototype.sizeInBytes = function(){return 4;}
function UInt64LE(){ }
UInt64LE.prototype = new StructElement();
UInt64LE.prototype.constructor = UInt64LE;
UInt64LE.prototype.sizeInBytes = function(){return 8;}
UInt64LE.prototype.write = function(value,buffer,offset){
  buffer.writeUInt32LE(value,offset);
  buffer.writeUInt32LE(Math.floor(value/0x100000000),offset+4);
};
UInt64LE.prototype.read = function(buffer,offset){
  var ret = buffer.readUInt32LE(offset);
  ret+=(buffer.readUInt32LE(offset+4)*0x100000000);
  return ret;
};

function CRC(){ }
CRC.prototype = new UInt16LE();
CRC.prototype.constructor = CRC;
CRC.prototype.write = function(value,buffer,offset,chunklength){
  //ignore value
  UInt16LE.prototype.write.apply(this,[crc16BufferValue(buffer,offset,chunklength),buffer,offset]);
};

function createStructElement(typename){
  switch(typename){
    case 'uint8':
      return new UInt8();
    case 'int8':
      return new Int8();
    case 'uint16le':
      return new UInt16LE();
    case 'int16le':
      return new Int16LE();
    case 'uint16be':
      return new UInt16BE();
    case 'int16be':
      return new Int16BE();
    case 'uint32le':
      return new UInt32LE();
    case 'int32le':
      return new Int32LE();
    case 'uint32be':
      return new UInt32BE();
    case 'int32be':
      return new Int32BE();
    case 'floatle':
      return new FloatLE();
    case 'floatbe':
      return new FloatBE();
    case 'uint64le':
      return new UInt64LE();
    case 'crc':
      return new CRC();
  }
};


function ArrayStructElement(typename,length){
  var arry = [];
  for(var i=0; i<length; i++){
    arry.push(createStructElement(typename));
  }
  this.arry = arry;
}
ArrayStructElement.prototype.read = function(buffer,offset){
  var ret = [];
  var arry = this.arry;
  var al = arry.length;
  var off = 0;
  for(var i=0; i<al; i++){
    var ae = arry[i];
    ret.push(ae.read(buffer,offset+off));
    off+=ae.sizeInBytes();
  }
  return ret;
};
ArrayStructElement.prototype.write = function(value,buffer,offset){
  var arry = this.arry;
  var al = arry.length;
  var off = 0;
  for(var i=0; i<al; i++){
    var ae = arry[i];
    ae.write(value[i],buffer,offset+off);
    off+=ae.sizeInBytes();
  }
};
ArrayStructElement.prototype.sizeInBytes = function(){
  return this.arry.length*this.arry[0].sizeInBytes();
}

function StringStructElement(length, encoding){
  this.strlength = length;
  this.encoding = encoding;
}
StringStructElement.prototype.read = function(buffer,offset){
  var b = new Buffer(this.strlength);
  buffer.copy(b,0,offset,offset+this.strlength);
  var firstzeropos=undefined;
  for(var i=0; i<b.length; i++){
    if(!b[i]){
      firstzeropos=i;
      break;
    }
  }
  return b.toString(this.encoding,0,firstzeropos);
};
StringStructElement.prototype.write = function(value,buffer,offset){
  var b = new Buffer(value,this.encoding);
  buffer.fill(0,offset,offset+this.strlength);
  b.copy(buffer,offset,0,b.length);
};
StringStructElement.prototype.sizeInBytes = function(){
  return this.strlength;
};

function Struct(mapstring){ //'crc:crc,id:uint32le,type:uint16le,numbers:uint8[45],city:string(128,utf8)' 
  if(!mapstring){
    console.trace();
    throw 'Struct cannot be made without a mapstring';
  }
  var elems = {};
  var datanames = [];
  var datanamesforwrite1 = [];
  var datanamesforwrite2 = [];
  var size = 0;
  elems = mapstring.split(',');
  re = new RegExp('^\\s*([^:\\s]+):([^:\\s]+)\\s*$');
  re1 = new RegExp('^([^\\[]+)\\[([^\\]]+)\\]$');
  re2 = new RegExp('^\\s*([0-9]+)(-([^\\s]+))?\\s*$');
  re3 = new RegExp('^{([^}]*)$');
  for(var i in elems){
    var nva = re.exec(elems[i]);
    if(nva === null){continue;}
    var typestr = nva[2];
    var se=undefined;
    var strtypea = re2.exec(typestr);
    if(strtypea !== null){
      se = new StringStructElement(parseInt(strtypea[1]),strtypea[3]);
    }else{
      var typea = re1.exec(typestr);
      if(typea===null){
        var typestruct = re3.exec(typestr);
        if(typestruct===null){
          se = createStructElement(typestr);
        }else{
          if(typestr[0]==='{'){
            console.log('GOT STRUCT',typestruct);
          }
        }
      }else{
        se = new ArrayStructElement(typea[1],parseInt(typea[2]));
      }
    }
    if(!se){continue;}
    var elemname = nva[1];
    elems[elemname] = se;
    datanames.push(elemname);
    if(typestr==='crc'){
      datanamesforwrite2.push(elemname);
    }else{
      datanamesforwrite1.push(elemname);
    }
    se.offset = size;
    size += se.sizeInBytes();
  }
  this.elems = elems;
  this.datanames = datanames;
  this.datanamesforwrite1 = datanamesforwrite1;
  this.datanamesforwrite2 = datanamesforwrite2;
  this.sizeInBytes = size;
}
Struct.prototype.read = function(buffer,offset,fieldnames){
  var data = {};
  var dns = fieldnames || this.datanames;
  var dnsl = dns.length;
  offset = offset||0;

  for(var i=0; i<dnsl; i++){
    var dn = dns[i];
    var e = this.elems[dn];
    data[dn] = e.read(buffer,offset+e.offset);
  }
  return data;
};
Struct.prototype.write = function(data,buffer,offset){
	var dns = this.datanamesforwrite1;
	var dnsl = dns.length;
	for(var i=0; i<dnsl; i++){
		var dn = dns[i];
		var e = this.elems[dn];
		if(typeof data[dn] === 'undefined'){
			console.log(dn,'missing from',data);
		}
		try{
			e.write(data[dn],buffer,offset+e.offset);
		}
		catch(e){
			console.log('Writing',dn,'value',data[dn],'caused error',e);
		}
	}
	dns = this.datanamesforwrite2;
	dnsl = dns.length;
	for(var i=0; i<dnsl; i++){
		var dn = dns[i];
		var e = this.elems[dn];
		try{
			e.write(data[dn],buffer,offset+e.offset,this.sizeInBytes); //sizeInBytes is an extra param, just for the crc
		}
		catch(err){
			console.log('Writing',dn,'value',data[dn],'caused error2',err);
		}
	}
};
Struct.prototype.bufferFrom = function(data){
  var b = new Buffer(this.sizeInBytes);
  this.write(data,b,0);
  return b;
};
Struct.prototype.sizeInBytes = function(){
  var ret = 0;
  for(var i in this.elems){
    ret += this.elems[i].sizeInBytes();
  }
  return ret;
};

var fs = require('fs');

function File(mapstring,path){
  var struct = new Struct(mapstring);
  this.struct = struct;
  this.path = path;
};
File.prototype.recordCount = function(){
  if(!fs.existsSync(this.path)){
    throw (this.path+' does not exist', process.cwd());
  }
  var struct = this.struct;
  var filestat = fs.statSync(this.path);
  var fsz = filestat.size;
  var sz = struct.sizeInBytes;
  if(fsz%sz){
    throw (this.path+' has filesize '+fsz+' that is not a multiple of '+sz+' bytes');
  }
  return fsz/sz;
};
File.prototype.erase = function(){
  fs.writeFileSync(this.path,new Buffer(0));
};

File.prototype.update = function (data, position) {
	var p = position*this.struct.sizeInBytes;
	var fd = fs.openSync(this.path,'r+');
	if (!fd) throw "Unable to open file: "+this.path;
	var b = this.struct.bufferFrom(data);
	fs.writeSync(fd, b , 0, b.length, p);
	setTimeout(function () {fs.closeSync(fd);}, 0);
}

File.prototype.write = function(data){
	fs.writeFileSync(this.path,this.struct.bufferFrom(data));
};

File.prototype.append = function(data){
  fs.appendFileSync(this.path,this.struct.bufferFrom(data));
	return this.recordCount()-1;
};

File.prototype.traverse = function(initcb,cb,fieldnames, chunks){
  if(typeof cb !== 'function'){
    return;
  }
  if(!fs.existsSync(this.path)){
		console.trace();
    throw (this.path+' does not exist within '+process.cwd());
  }
  var struct = this.struct;
  var filestat = fs.statSync(this.path);
  var fsz = filestat.size;
  var sz = struct.sizeInBytes;
  if(fsz%sz){
    throw (this.path+' has filesize '+fsz+' that is not a multiple of '+sz+' bytes');
  }
  if(typeof initcb === 'function'){
    initcb.apply(this,[fsz,sz,Math.floor(fsz/sz)]);
  }

	//Open file for reading in synchronous mode. Instructs the operating system to bypass the local file system cache
	//TODO: introduce more chunk checks on this: check overlapping, check range data and so on ....
  var f = fs.openSync(this.path,'rs');
	if (!chunks) {
		chunks = [{start: 0, end:Math.floor(fsz/sz)}];
	}else{
		chunks = CM.merge(chunks);
	}
	var bufferSize = 0;
	for (var i in chunks) { bufferSize += (CM.chunk_length(chunks[i])*sz); }
	var buff = new Buffer(bufferSize);
	var count = 0;

	for (var i in chunks) {
		var len = CM.chunk_length(chunks[i]);
		for (var l=0; l<len; l++) {
			if (fs.readSync(f, buff,0 , sz, (chunks[i].start+l)*sz) != sz) throw "Invalid file position";
			var cbres = cb.apply(this,[struct.read(buff,0,fieldnames),count]);
			if(cbres===true){
				break;
			}
			count++;
		}
	}
};

File.prototype.getHash = function (cb) {
	if ('function' != typeof(cb)) return undefined;
	var stream = fs.ReadStream(this.path);
	var digest = Crypto.createHash ('sha512');
	stream.on ('data', function (d) {digest.update(d);});
	stream.on ('end', function () {
		cb(digest.digest('hex'));
	});
}


function Storage(mapstring,count){
  if(mapstring){
    this.struct = new Struct(mapstring);
    this.storage = new Buffer(count*this.struct.sizeInBytes);
  }
}
Storage.prototype.put = function(data,recordinal){
  this.struct.write(data,this.storage,recordinal*this.struct.sizeInBytes);
};
Storage.prototype.get = function(recordinal,fieldnames){
  return this.struct.read(this.storage,recordinal*this.struct.sizeInBytes,fieldnames);
};
///pass a test_cb in order to filter out results ... in test_cb return undefined if you want test to fail ...
Storage.prototype.traverse = function(cb,fieldnames, test_cb){
  if(typeof cb !== 'function'){
    return;
  }
  var sz = this.struct.sizeInBytes;
  var dsz = this.storage.length;
  var pos = 0;
  var cnt = 0;

	var do_test = ('function' === typeof(test_cb));

  while(pos<dsz){
		var cbres;

		if (do_test) {
			var test_result = test_cb.apply(this, [this.struct.read(this.storage, pos, fieldnames), cnt]);
			if ('undefined' !== typeof(test_result))  {
				cbres = cb.apply(this,[this.struct.read(this.storage,pos,undefined),cnt, test_result]);
			}
		}else{
    	cbres = cb.apply(this,[this.struct.read(this.storage,pos,fieldnames),cnt]);
		}
    if(cbres===true){
      break;
    }
    pos+=sz;
    cnt++;
  }
};
Storage.prototype.dataFor = function(name,value,cb,fieldnames){
  if(typeof cb !== 'function'){
    return;
  }
  var struct = this.struct;
  var storage = this.storage;
  this.traverse(function(data,recordinal){
    if(data[name]===value){
      cb.apply(this,[struct.read(storage,recordinal*struct.sizeInBytes,fieldnames),recordinal]);
      return true;
    }
  },[name]);
};

function PKStorage(mapstring,count,pkname){
  Storage.prototype.constructor.apply(this,[mapstring,count]);
  if(!(pkname in this.struct.elems)){
    throw pkname+' cannot be a primary key, it is not in the field names';
  }
  this.pkname = pkname;
  this.pkmap = {};
}
PKStorage.prototype = new Storage();
PKStorage.prototype.constructor = PKStorage;
PKStorage.prototype.put = function(data,recordinal){
  var pkval = data[this.pkname];
  if(typeof this.pkmap[pkval] !== 'undefined'){
    throw 'Unique constraint violated for key '+this.pkname+' on value '+pkval;
  }
  this.pkmap[pkval] = recordinal;
  Storage.prototype.put.apply(this,[data,recordinal]);
};
PKStorage.prototype.dataFor = function(name,value,cb,fieldnames){
  if(typeof cb !== 'function'){
    return;
  }
  if(name===this.pkname){
    var pkord = this.pkmap[value];
    if(typeof pkord === 'undefined'){
      cb.apply(this,[{},undefined]);
      return;
    }
    cb.apply(this,[this.struct.read(this.storage,pkord*this.struct.sizeInBytes,fieldnames),pkord]);
  }else{
    Storage.prototype.dataFor.apply(this,[name,value,cb,fieldnames]);
  }
};

function StorageWFile(mapstring,filemapstring,path,pkname){
  this.file = new File(filemapstring,path);
  this.pkname = pkname;
  this.mapstring = mapstring;
}

StorageWFile.prototype.load = function(initcb,cb, chunks){
  var t = this;
  this.file.traverse(function(fsz,sz,reccnt){
    t.storage = t.pkname ? new PKStorage(t.mapstring,reccnt,t.pkname) : new Storage(t.mapstring,reccnt);
    if(typeof initcb === 'function'){
      initcb.apply(this,[fsz,sz,reccnt]);
    }
  },function(data,recordinal){
    t.storage.put(data,recordinal);
    if(typeof cb === 'function'){
      cb.apply(this,[data,recordinal]);
    }
  }, undefined, chunks);
};
StorageWFile.prototype.get = function (recordinal, fieldnames) {
	return this.storage.get(recordinal, fieldnames);
}

StorageWFile.prototype.put = function(data,recordinal, permanent){
	if (arguments.length == 2) permanent = true;
	this.storage.put(data,recordinal);
	if (permanent) this.file.update(data, recordinal);
	return this.get(recordinal);
};



module.exports = {
  Struct:Struct,
  File:File,
  Storage:Storage,
  PKStorage:PKStorage,
  StorageWFile:StorageWFile
};
