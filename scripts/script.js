var computer;
class Bitfield {
    constructor(value, size) {
        this.values = []
        this.size = size
        for (let i = 0; i < size; i++) {
            this.values[size-i-1] = Boolean(value & (1<<i))
        }
    }
    getValue() {
        return this.getValue(0, this.values.length-1)
    }
    getValue(start,size) {
        let val = 0
        for (let i = 0; i < size; i++) {
            val += this.values[start + i] * (1<<(size-i-1))
        }
        return val
    }
    getSubField(start, size) {
        return new Bitfield(getValue(start, size), size)
    }
}

class Memory {
    constructor(size) {
        this.size = size;
        this.contents = [];
        for (let i = 0; i < size; i++){
            this.contents.push(0)
        }
    }
    setWord(val, addr) {
        this.contents[addr+0] = (val&0xFF000000)>>>24
        this.contents[addr+1] = (val&0x00FF0000)>>>16
        this.contents[addr+2] = (val&0x0000FF00)>>>8
        this.contents[addr+3] = (val&0x000000FF)
    }
    setHalfWord(val, addr) {
        this.contents[addr] =   (val&0xFF00)>>>8
        this.contents[addr+1] = (val&0x00FF)
    }
    setByte(val, addr) {
        this.contents[addr] = val&0xFF
    }
    getWord(addr) {
        return (
            (this.contents[addr+0]<<24) | 
            (this.contents[addr+1]<<16) | 
            (this.contents[addr+2]<<8) | 
             this.contents[addr+3] )

    }
    getHalfWord(addr) {
        return (this.contents[addr]<<8) | this.contents[addr+1]
    }
    getByte(addr) {        
        return this.contents[addr]
    }
}
class Computer {
    constructor(program, maxLoop = 12) {
        this.memory = new Memory(0x10000)
        this.gpr = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        this.programCounter = 0;
        this.lr = 0
        this.ctr = 0

        
        for (let i = 0; i < program.length; i++) {
            this.memory.setWord(parseInt(program[i], 16), 4*i)
        }

        this.gpr[1] = this.memory.length - 0x10;

        console.log(this.memory)

        this.programCounter = 0
        this.count = 0
        while (this.programCounter < program.length*4) {
            console.log("PC = " + this.programCounter)
            this.step(this.memory.getWord(this.programCounter))
            if(this.count++ > maxLoop) {
                break
            }
        }
        console.log(this)
    }
    init() {

    }
    step(instruction) {
        console.log("   current instruction : " + instruction.toString(16))
        let opcode = maskBits(instruction, 0, 6)
        let CIA = this.programCounter //current instruction address
        let NIA = CIA + 0x4 //next instruction address
        let args;
        switch(opcode) {
            case 18: //branch
                args = this.getArgs(instruction, "I")
                if (args["AA"]) {
                    NIA = EXTS(args["LI"]<<2,24)
                } else {
                    NIA = CIA + EXTS(args["LI"]<<2, 24)
                }
                console.log("   branch to 0x" + NIA.toString(16))
                if (args["LK"]) {
                    this.lr = CIA + 4
                    console.log("   set lr to 0x" + this.lr.toString(16))
                } 
                break
            case 16: //branch conditional
                args = this.getArgs(instruction, "B")
                if (!args["BO"]) {
                    this.ctr = this.ctr-1
                }
                
                if (args["LK"]) {
                    this.lr = CIA + 4
                    console.log("   set lr to 0x" + this.lr.toString(16))
                } 
                break
            default: 
                console.log("   unknown instruction : " + opcode)
                break

        }      
        this.programCounter = NIA
    }
    getArgs(instruction, type) {
        let returnStruct = {}
        switch(type) {
            case "I":
                returnStruct["LI"] = maskBits(instruction, 6, 24)
                returnStruct["AA"] = maskBits(instruction, 30, 1)
                returnStruct["LK"] = maskBits(instruction, 31, 1)
                break
            case "B":
                returnStruct["BO"] = maskBits(instruction, 6, 5)
                returnStruct["BI"] = maskBits(instruction, 11, 5)
                returnStruct["BD"] = maskBits(instruction, 16, 14)
                returnStruct["AA"] = maskBits(instruction, 30, 1)
                returnStruct["LK"] = maskBits(instruction, 31, 1)
                break
            default: 
                return null;
        }
        return returnStruct
    }
}
function EXTS(val, originalSize) {
    
    if(val>>(originalSize-1)) {
        let mask = ((2<<(32-originalSize))-1)<<originalSize
        return val | mask
    }
    return val

}
function maskBits(val, start, len) {
     let mask = (1<<(len)) - 1   
     mask = mask << (32-start-len)
     val &= mask 
     return val >>> (32-start-len)
}


function interpret(code) {

}

function restartCPU() {
    text = $("#input").val().replace(/[^A-Fa-f0-9]/g, "");
    code = text.match(/(.{1,8})/g);
    console.log(code)
    computer = new Computer(code, 0x10)
}