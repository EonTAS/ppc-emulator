var computer;
class Bitfield {
    constructor(value, size) {
        
        this.values = []
        this.size = size
        for (let i = 0; i < size; i++) {
            this.values[size-i-1] = Boolean(value & (1<<i))
        }
    }
    setValue(value) {
        for (let i = 0; i < this.size; i++) {
            this.values[size-i-1] = Boolean(value & (1<<i))
        }
    }
    getFullValue() {
        return this.getValue(0, this.size)
    }
    getValue(start,size) {
        let val = 0
        for (let i = 0; i < size; i++) {
            val += this.values[start + i] * (1<<(size-i-1))
        }
        return val
    }
    getSubField(start, size) {
        return new Bitfield(this.getValue(start, size), size)
    }
    split(splits) {
        let returnSplits = []
        let prevSplit
        for(let i = 0; i < splits.length; i++) {
            let split = splits[i]
            if(prevSplit != undefined) {
                console.log(prevSplit + " " + (split - prevSplit))
                returnSplits.push(this.getSubField(prevSplit, split-prevSplit))
            }
            prevSplit = split
        }
        console.log(prevSplit + " " + (this.size - prevSplit))
        returnSplits.push(this.getSubField(prevSplit, this.size-prevSplit))
        return returnSplits
    }
    getBit(i) {
        return this.values[i]
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

        this.CR = new Bitfield(0, 32)

        
        for (let i = 0; i < program.length; i++) {
            this.memory.setWord(parseInt(program[i], 16), 4*i)
        }

        this.gpr[1] = this.memory.length - 0x10;

        console.log(this.memory)

        this.programCounter = 0
        this.count = 0
        while (this.programCounter < program.length*4) {
            console.log("PC = " + this.programCounter)
            let instruction = new Bitfield(this.memory.getWord(this.programCounter), 32)
            this.step(instruction)
            if(this.count++ > maxLoop) {
                break
            }
        }
        console.log(this)
    }
    step(instruction) {
        console.log("   current instruction : " + instruction.getFullValue().toString(16))
        let opcode = instruction.getValue(0,6)
        let CIA = this.programCounter //current instruction address
        let NIA = CIA + 0x4 //next instruction address
        let args;
        switch(opcode) {
            case 18: {//branch 
                console.log("   branch")
                args = this.getArgs(instruction, "I")
                if (args["AA"].getFullValue()) {
                    NIA = EXTS((args["LI"].getFullValue())<<2,24)
                } else {
                    NIA = CIA + EXTS((args["LI"].getFullValue())<<2, 24)
                }
                console.log("   branch to 0x" + NIA.toString(16))
                if (args["LK"].getFullValue()) {
                    this.lr = CIA + 4
                    console.log("   set lr to 0x" + this.lr.toString(16))
                } 
                break 
            }
            case 16: {//branch conditional
                console.log("   branch conditional")
                args = this.getArgs(instruction, "B")
                if (!args["BO"].getBit(2)) {
                    this.ctr = this.ctr-1
                }
                let ctr_ok = (args["BO"].getBit(2)) | ((this.ctr != 0 ) ^ args["BO"].getBit(3)) 
                let cond_ok = (args["BO"].getBit(0)) | (this.CR.getBit(args["BI"].getFullValue()) == args["BO"].getBit(1))
                if (ctr_ok && cond_ok) {
                    
                    if (args["AA"].getFullValue()) {
                        NIA = EXTS((args["BD"].getFullValue())<<2,16)
                    } else {
                        NIA = CIA + EXTS((args["BD"].getFullValue())<<2, 16)
                    }
                    console.log("   conditional branch to 0x" + NIA.toString(16))
                    if (args["LK"].getFullValue()) {
                        this.lr = CIA + 4
                        console.log("   set lr to 0x" + this.lr.toString(16))
                    } 
                }
                break
            }
            case 19: { //branch conditional to count register
                let cond_ok = (args["BO"].getBit(0)) | (this.CR.getBit(args["BI"].getFullValue()) == args["BO"].getBit(1))
                if (cond_ok) {
                    let type = args["BD"].getValue(5,10)
                    if (type == 528){
                        NIA = this.ctr<<2
                    } else if (type == 16) {
                        NIA = this.lr<<2
                    }
                    console.log("   conditional branch to count register 0x" + this.ctr.toString(16))
                    if (args["LK"].getFullValue()) {
                        this.lr = CIA + 4
                        console.log("   set lr to 0x" + this.lr.toString(16))
                    } 
                }
                break
            }
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
                returnStruct["LI"] = instruction.getSubField(6, 25)
                returnStruct["AA"] = instruction.getSubField(30, 1)
                returnStruct["LK"] = instruction.getSubField(31, 1)
                break
            case "B":
                returnStruct["BO"] = instruction.getSubField(6, 5)
                returnStruct["BI"] = instruction.getSubField(11, 5)
                returnStruct["BD"] = instruction.getSubField(16, 14)
                returnStruct["AA"] = instruction.getSubField(30, 1)
                returnStruct["LK"] = instruction.getSubField(31, 1)
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


function restartCPU() {
    text = $("#input").val().replace(/[^A-Fa-f0-9]/g, "");
    code = text.match(/(.{1,8})/g);
    console.log(code)
    computer = new Computer(code, 0x10)
}