var decoder = new TextDecoder("utf-8");
const NEXT_FUNC = Symbol();
class Scanner{
    static num (bytes, start, ofs){
        let TypedArray;
        switch(ofs){
        case 1:
            return bytes[start];
        case 2:
            TypedArray = Int16Array;
            break;
        case 4:
            TypedArray = Int32Array;
            break;
        default:
            throw new Error("Invalid offset: " + ofs);
        }
        return new TypedArray(bytes.slice(start, start + ofs).buffer)[0];
    }
    constructor(buffer){
        this.bytes = new Int8Array(buffer);
        this.pos = 0;
        this.decoder = new TextDecoder("utf-8");
    }
    [NEXT_FUNC](offset){
        var result = Scanner.num(this.bytes, this.pos, offset);
        this.pos += offset;
        return result;
    }
    nextInt(){
        return this[NEXT_FUNC](4);
    }
    nextByte(){
        return this[NEXT_FUNC](1);
    }
    nextShort(){
        return this[NEXT_FUNC](2);
    }
    nextBytes(size){
        var rightPos = this.pos + size;
        var result = this.bytes.slice(this.pos, rightPos);
        this.pos = rightPos;
        return result;
    }
    nextString(byteLength){
        return this.decoder.decode(this.nextBytes(byteLength));
    }
    back(offset){
        if(offset <= this.pos){
            this.pos -= offset;
            return true;
        }
        return false;
    }
    tail(){
        return this.bytes.slice(this.pos);
    }
}

function analyzeWave(buffer) {
    const scanner = new Scanner(buffer);

    console.info("================= HEADER =================");
    const headerId = scanner.nextString(4);
    // WAVE文件大小减去ID和size所占用字节数
    const size = scanner.nextInt();
    const type = scanner.nextString(4);
    console.info({
        "id": headerId,
        "大小": size,
        "类型": type
    });

    console.info("================= FORMAT CHUNK =================");
    const fmtId = scanner.nextString(4);
    // 数值为16或18， 18则最后有附加信息
    const fmtSize = scanner.nextInt();
    // 编码方式（一般为0x0001）
    const fmtFlag = scanner.nextShort();
    // 声道数目，1--单声道， 2--双声道
    const channels = scanner.nextShort();
    // 采样频率
    const samplesPerSec = scanner.nextInt();
    // 每秒所需字节数
    const avgBytesPerSec = scanner.nextInt();
    // 数据块对齐单位
    const blockAlign = scanner.nextShort();
    // 每个采样需要的bit数
    const bitsPerSample = scanner.nextShort();
    if(fmtSize === 18){
        const overhead = scanner.nextShort();
        console.info("附加信息： " + overhead);
    }
    console.info({
        "id": fmtId,
        "FormatChunkSize": fmtSize,
        "解码方式": fmtFlag,
        "声道数目": channels,
        "采样频率": samplesPerSec,
        "每秒所需字节数": avgBytesPerSec,
        "数据块对齐单位": blockAlign,
        "每个采样需要的bit数": bitsPerSample
    });
    console.info("================= FACT CHUNK =================");
    const factId = scanner.nextString(4);
    if(factId === "fact"){
        const factSize = scanner.nextInt(4);
        const factData = scanner.nextBytes(4);
        console.info({
            "factSize": factSize,
            "factData": factData
        });
    }else{
        scanner.back(4);
        console.warn("没有FACT CHUNK");
    }
    console.info("================= DATA CHUNK =================");
    // DATA CHUNK ID
    const dataId = scanner.nextString(4);
    // 数据大小
    const dataSize = scanner.nextInt(4);
    // 音频数据
    const data = scanner.tail();
    console.info({
        "id": dataId,
        "dataSize": dataSize,
        "data": data
    });
}

const selector = document.querySelector("#waveFileSelector");
selector.onchange = () => {
    const [file] = selector.files;
    const reader = new FileReader();
    reader.onload = (e) => {
        var buffer = reader.result;
        analyzeWave(buffer);
    };
    reader.readAsArrayBuffer(file);
};
