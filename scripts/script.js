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
    split(splits, names) {
        let returnSplits = {}
        let prevSplit
        for(let i = 0; i < splits.length; i++) {
            let split = splits[i]
            if(prevSplit != undefined) {
                returnSplits[names[i-1]] = this.getSubField(prevSplit, split-prevSplit)
            }
            prevSplit = split
        }
        returnSplits[names[names.length-1]] = this.getSubField(prevSplit, this.size-prevSplit)
        return returnSplits
    }
    setBit(i, val) {
        this.values[i] = val 
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

//https://fail0verflow.com/media/files/ppc_750cl.pdf following this spec for each command (starts at page 353)

// and https://www.nxp.com/docs/en/user-guide/MPCFPE_AD_R1.pdf
class Computer {
    constructor(program, maxLoop = 12) {
        this.memory = new Memory(0x10000)

        //architecture defined registers excluding SPRs
        this.CR = [new Bitfield(0,4), new Bitfield(0,4), new Bitfield(0,4), new Bitfield(0,4), new Bitfield(0,4), new Bitfield(0,4), new Bitfield(0,4), new Bitfield(0,4)]
        //bit 0 = LT = Set when result is negative
        //bit 1 = GT = set when result is positive and non zero
        //bit 2 = EQ = set when result is zero
        //SO = copy of XER[SO] 


        this.FPRs = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        this.FPSCR = new Bitfield(0,32)
        this.GPRs = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        
        //Architecture-Defined SPRs Implemented 
        this.lr = 0
        this.ctr = 0
        this.DAR = 0
        this.DSISR = 0

        this.XER = (new Bitfield(0,32)).split([0,1,2,3,25],["SO", "OV", "CA", "0", "Byte Count"])
        //page 73 of second file
        //SO = summary overflow : set whenever an overflow bit is set, remains set until mtspr or mcrxr instructions occur
        //OV = Overflow, set to indicate overflow during an instruction. Add subtract and negate set to true if the carry is not equal to result + 1, and clear otherwise.
        //          multiply low and divide set OV to true if OE  if cant be represented in 32 bits.
        //CA = Carry bit, set 
        //Byte Count = used by lswx and stswx to store byte count to use 


        this.programCounter = 0;
        

        
        for (let i = 0; i < program.length; i++) {
            this.memory.setWord(parseInt(program[i], 16), 4*i)
        }

        this.gpr[1] = this.memory.length - 0x10;

        console.log(this.memory)

        this.programCounter = 0
        this.count = 0
        while (this.programCounter < program.length*4) {
            console.log("PC = 0x" + this.programCounter.toString(16))
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
        console.log("   " + opcode)
        let CIA = this.programCounter //current instruction address
        let NIA = CIA + 0x4 //next instruction address
        let args;
        switch(opcode) {
            case 31: {//add
                console.log("   add")
                args = instruction.split([6,11,16,21,22,31], ["D", "A", "B", "OE", "type", "Rc"])
                var type = args["type"].getFullValue()
                if (type == 266) { //add

                    let result = this.gpr[args["A"].getFullValue()] + this.gpr[args["B"].getFullValue()];
                    this.gpr[args["D"].getFullValue()] = result
                    if(args["Rc"].getFullValue()) {
                        //CR0 : LT GT EQ SO
                        if(result < 0) {
                            this.CR[0].setValue(0b1000)
                        } else if (result > 0) {
                            this.CR[0].setValue(0b0100)
                        } else {
                            this.CR[0].setValue(0b0010)
                        }
                    } 
                    if(args["OE"].getFullValue()) {
                        //XER : SO, OV
                    } 
                    
                } else if (type == 10) { //addc

                    let result = this.gpr[args["A"].getFullValue()] + this.gpr[args["B"].getFullValue()];
                    this.gpr[args["D"].getFullValue()] = result
                    if(args["Rc"].getFullValue()) {
                        //CR0 : LT GT EQ SO
                        if(result < 0) {
                            this.CR[0].setValue(0b1000)
                        } else if (result > 0) {
                            this.CR[0].setValue(0b0100)
                        } else {
                            this.CR[0].setValue(0b0010)
                        }
                    } 
                    if(args["OE"].getValue()) {
                        //CA
                        //XER : SO, OV
                    } 
                    
                } else if (type == 138) { //add extended

                    let result = this.gpr[args["A"].getFullValue()] + this.gpr[args["B"].getFullValue()] //+XER[CA];
                    this.gpr[args["D"].getFullValue()] = result
                    if(args["Rc"].getFullValue()) {
                        //CR0 : LT GT EQ SO
                        if(result < 0) {
                            this.CR[0].setValue(0b1000)
                        } else if (result > 0) {
                            this.CR[0].setValue(0b0100)
                        } else {
                            this.CR[0].setValue(0b0010)
                        }
                    } 
                    if(args["OE"].getFullValue()) {
                        //CA
                        //XER : SO, OV
                    } 
                    
                }
                break
            }
            case 14: { //addi
                args = instruction.split([6,11,16], ["D", "A", "SIMM"])
                let A = args["A"].getFullValue()
                let D = args["D"].getFullValue()
                let SIMM = EXTS(args["SIMM"].getFullValue(), 16)
                if (A == 0) {
                    this.gpr[D] = SIMM
                }
                else {
                    this.gpr[D] = this.gpr[A] + SIMM
                }
                break
            }
            case 18: {//branch 
                console.log("   branch")
                args = instruction.split([6,30,31], ["LI", "AA", "LK"])
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
                args = instruction.split([6,11,16,30,31], ["BO", "BI", "BD", "AA", "LK"])
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
                
                args = instruction.split([6,11,16,21, 30,31], ["BO", "BI", "0", "type", "LK"])
                let cond_ok = (args["BO"].getBit(0)) | (this.CR.getBit(args["BI"].getFullValue()) == args["BO"].getBit(1))
                if (cond_ok) {
                    let type = args["type"].getFullValue()
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