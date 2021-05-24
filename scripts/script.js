var computer;
class Bitfield {
    constructor(value, size) {
        if (size >= 32) {
            size = 32
        }
        this.size = size
        this.setValue(value)
    }

    setValue(value) {
        if(this.size >= 32) {
            this.value = value & -1
        } else {
            this.value = value & ((1<<this.size)-1)

        }
    }

    getFullValue() {
        return this.value
    }

    getValue(start,size) {
        let mask = -1
        if (start != 0) {
            mask = ((1<<(this.size-start))-1)
        }
        let v = (this.value & mask)>>>(this.size-start-size)        
        return v
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
        if(val) {
            this.value |= (1<<(this.size-i-1)) 
        } else {
            this.value &= ~(1<<(this.size-i-1)) 
        }
    }

    getBit(i) {
        return Boolean(this.value & (1<<(this.size-i-1)))
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
        addr = this.getAddr(addr)      
        this.contents[addr+0] = (val&0xFF000000)>>>24
        this.contents[addr+1] = (val&0x00FF0000)>>>16
        this.contents[addr+2] = (val&0x0000FF00)>>>8
        this.contents[addr+3] = (val&0x000000FF)
    }

    setHalfWord(val, addr) {
        addr = this.getAddr(addr)      
        this.contents[addr] =   (val&0xFF00)>>>8
        this.contents[addr+1] = (val&0x00FF)
    }

    setByte(val, addr) {
        addr = this.getAddr(addr)      
        this.contents[addr] = val&0xFF
    }

    getWord(addr) {
        addr = this.getAddr(addr)      
        return (
            (this.contents[addr+0]<<24) | 
            (this.contents[addr+1]<<16) | 
            (this.contents[addr+2]<<8) | 
             this.contents[addr+3] )

    }

    getHalfWord(addr) {
        addr = this.etAddr(addr)      
        return (this.contents[addr]<<8) | this.contents[addr+1]
    }

    getByte(addr) {  
        addr = this.getAddr(addr)      
        return this.contents[addr]
    }

    getSize() {
        return this.size
    }

    getAddr(addr) {        
        addr = addr%this.size
        if (addr<this.size) {
            addr = addr+this.size
        }
        return addr
    }
}

//https://fail0verflow.com/media/files/ppc_750cl.pdf following this spec for each command (starts at page 353)

// and https://www.nxp.com/docs/en/user-guide/MPCFPE_AD_R1.pdf
class Computer {
    constructor(program) {
        this.memory = new Memory(0x100)

        //architecture defined registers excluding SPRs
        this.CR = [new Bitfield(0,4), new Bitfield(0,4), new Bitfield(0,4), new Bitfield(0,4), new Bitfield(0,4), new Bitfield(0,4), new Bitfield(0,4), new Bitfield(0,4)]
        //bit 0 = LT = Set when result is negative
        //bit 1 = GT = set when result is positive and non zero
        //bit 2 = EQ = set when result is zero
        //SO = copy of XER[SO] 


        this.FPRs = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        this.FPSCR = new Bitfield(0,32)
        this.GPR = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        
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

        //this.GPR[1] = this.memory.getSize()-0x10;
        this.halt = false
        console.log(this.memory)
    }
    stepOnce() {
        console.log("PC = 0x" + this.programCounter.toString(16))
        let instruction = new Bitfield(this.memory.getWord(this.programCounter), 32)
        if(!this.step(instruction)) {
            this.halt = true;
        }
    }
    
    halted() {
        return this.halt
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

                    let result = this.GPR[args["A"].getFullValue()] + this.GPR[args["B"].getFullValue()];
                    result = result<<0
                    this.GPR[args["D"].getFullValue()] = result
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

                    let result = this.GPR[args["A"].getFullValue()] + this.GPR[args["B"].getFullValue()];
                    result = result<<0
                    this.GPR[args["D"].getFullValue()] = result
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

                    let result = this.GPR[args["A"].getFullValue()] + this.GPR[args["B"].getFullValue()] //+XER[CA];
                    result = result<<0
                    this.GPR[args["D"].getFullValue()] = result
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
                else {
                    
                }
                break
            }
            case 14: { //addi
                args = instruction.split([6,11,16], ["D", "A", "SIMM"])
                let A = args["A"].getFullValue()
                let D = args["D"].getFullValue()
                let SIMM = EXTS(args["SIMM"].getFullValue(), 16)
                if (A == 0) {
                    this.GPR[D] = SIMM
                }
                else {
                    this.GPR[D] = this.GPR[A] + SIMM
                    this.GPR[D] = this.GPR[D]<<0
                }
                break
            }
            case 12: { //addic
                break

            }
            case 13: { //addic.

                break

            }
            case 15: { //addis
                args = instruction.split([6,11,16], ["D", "A", "SIMM"])
                let A = args["A"].getFullValue()
                let D = args["D"].getFullValue()
                let SIMM = args["SIMM"].getFullValue()<<16
                if (A == 0) {
                    this.GPR[D] = SIMM
                }
                else {
                    this.GPR[D] = this.GPR[A] + SIMM
                    this.GPR[D] = this.GPR[D]<<0
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
                let cond_ok = (args["BO"].getBit(0)) | (this.CR[0].getBit(args["BI"].getFullValue()) == args["BO"].getBit(1))
                console.log(ctr_ok)
                console.log(cond_ok)
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
            case 31: { //cmp
                args = instruction.split([6,9, 11,16,21,31], ["crfD","L", "A","B", "0", "reserved0"])
                let A = args["A"].getFullValue()
                let B = args["B"].getFullValue()
                let c;
                if (this.GPR[A] < this.GPR[B]) {
                    c = 0b100;
                } else if (this.GPR[A] > this.GPR[B]) {
                    c = 0b010
                }
                else {
                    c = 0b001
                }
                let crfD = args["crfD"].getFullValue()
                this.CR[crfD].setValue(c<<1 + this.XER["SO"])
                break 
            }
            case 11: { //cmpi
                args = instruction.split([6,9, 11,16], ["crfD","L", "A","SIMM"])
                let A = args["A"].getFullValue()
                let SIMM = args["SIMM"].getFullValue()
                let c;
                if (this.GPR[A] < SIMM) {
                    c = 0b1000;
                } else if (this.GPR[A] > SIMM) {
                    c = 0b0100
                }
                else {
                    c = 0b0010
                }
                let crfD = args["crfD"].getFullValue()
                this.CR[crfD].setValue(c + this.XER["SO"].getFullValue())
                break 
            }
            default: 
                console.log("   unknown instruction : " + opcode)
                return false

        }      
        this.programCounter = NIA
        return true;
    }
}
function EXTS(val, originalSize) {
    
    if(val>>(originalSize-1)) {
        let mask = ((2<<(32-originalSize))-1)<<originalSize
        return val | mask
    }
    return val
}
function stepCPU() {
    let steps = $(".stepCount").val()
    for(let i = 0; i < steps; i++) {
        if(!computer.halted()){
            computer.stepOnce()
        }
        else {
            break
        }
    }
    refreshView(computer)
}
function restartCPU() {
    let code = readCode();
    computer = new Computer(code)
    readRegisters(computer)
    refreshView(computer)
}

function readCode() {
    let text = $("#input-side .hex").val()
    let lines = text.split("\n") 
    let code = []
    for(line of lines) { //for each line get code contained
        line = line.split("#")[0] //cut any comments off the end of the line
        line = line.replace(/[^A-Fa-f0-9]/g, "") //strip away everything that is not hexadecimal
        let newCode = line.match(/(.{8})/g) //get each 8 char long segment of the hex
        if(newCode) { //check truthiness of line since it could be empty and then null would be appended
            code = code.concat(newCode)
        }    
    }
    return code

}

function readRegisters(computer) {
    //add onclick handler to register to make it read as hex instead of dec? keep a class on it using jquery to check it
    var registers = $("#input-side .register") //get all input registers
    for(let i = 0; i < registers.length; i++) {
        let val = parseInt($(registers[i]).val())//if a custom value set, use it, else use 0
        if (val != NaN) {
            computer.GPR[i] = val<<0; //val converted to a 32 bit number using leftshift 0 bits, since bitshifts operate on 32 bit ints only
        }
        else {
            computer.GPR[i] = 0;
        }
    }
}

function refreshView(computer) {
    var registers = $("#output-side .register")
    for(let i = 0; i < registers.length; i++) {
        $(registers[i]).val(computer.GPR[i])
    }
    let memory = computer.memory;
    let code = `
                                <tr>
                                    <th></th>
                                    <th>0 1 2 3 </th>
                                    <th>4 5 6 7 </th>
                                    <th>8 9 A B</th>
                                    <th>C D E F</th>
                                </tr>`
    let count = 0



    for(let i = 0; i < memory.getSize(); i+=4) {
        if (count==0) {
            code += "<tr>"
            code += "<th>"
            code += i.toString(16).toUpperCase().padStart(4, "0")
            code += "</th>"
        }
        code += "<td>"
        let currentLine = i == computer.programCounter
        if (currentLine) {
            code += "<b>"
        }
        code += (memory.getWord(i)>>>0).toString(16).toUpperCase().padStart(8, "0");
        if (currentLine) {
            code += "</b>"
        }
        count++
        code += "</td>"
        if (count == 4) {
            count = 0
            code += "</tr>"
        }
    }
    $("#output-side .hex").html(code)
}
restartCPU()