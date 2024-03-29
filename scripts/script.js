var computer;
class Bitfield { //class that allows easier access to the bit representation of a 32 bit value.
    constructor(value, size) {
        if (size >= 32) { //max allowed size is 32
            size = 32
        }
        this.size = size //store size
        this.setValue(value) //store value but masked to appropriate size
    }

    setValue(value) {
        if(this.size >= 32) { //due to weirdness in javascript implementation of bitshift, have to have an edgecase for a 32 bit shift (1<<32 should == 0 but it gives 1 since it masks the 32 with a 31 first)
            this.value = value & -1
        } else {
            this.value = value & ((1<<this.size)-1) 
        }
    }

    getValue(start = 0,size = -1) {
        //default values for start and size so less arguments can be given to simplify calling
        if (size < 0) {
            size = this.size - start;
        }
        let mask = -1
        if (start != 0) { //creates a mask that removes all unneccessary data off the left of the data.
            mask = ((1<<(this.size-start))-1)
        }
        let v = (this.value & mask)>>>(this.size-start-size) //creates the unsigned value by then shifting data to the right
        return v
    }
    getValueSignExtended(start = 0, size = -1) { //same as getValue but extends the sign bit of any given number to make it interpret as a negative value when appropriate
        if (size < 0) {
            size = this.size - start;
        }
        return EXTS(this.getValue(start, size), size)
    }
    
    getSubField(start, size) {
        return new Bitfield(this.getValue(start, size), size)
    }

    split(splits, names) { //splits the value into a new array of data as specified 
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

class Memory { //stores all data in the computer memory as single bytes so that things can be addressed easily.
    constructor(size) {
        this.size = size;
        this.contents = [];
        for (let i = 0; i < size; i++){ //initialises memory block as all zeros
            this.contents.push(0)
        }
    }
    
    //since memory is stored as bytes, when writing or reading a value, the appropriate part of the number needs to be extracted using bitmasks and shifts
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
        addr = this.getAddr(addr)      
        return (this.contents[addr]<<8) | this.contents[addr+1]
    }

    getByte(addr) {  
        addr = this.getAddr(addr)      
        return this.contents[addr]
    }

    getSize() {
        return this.size
    }

    //converts a passed address into a valid address within the memory
    getAddr(addr) {        
        addr = addr%this.size
        if (addr<0) {
            addr = addr+this.size
        }
        return addr
    }
}

//https://fail0verflow.com/media/files/ppc_750cl.pdf following this spec for each command (starts at page 353)

// and https://www.nxp.com/docs/en/user-guide/MPCFPE_AD_R1.pdf
class Computer {
    constructor(program) {
        this.memory = new Memory(0x200)

        //architecture defined registers excluding SPRs
        this.CR = [new Bitfield(0,4), new Bitfield(0,4), new Bitfield(0,4), new Bitfield(0,4), new Bitfield(0,4), new Bitfield(0,4), new Bitfield(0,4), new Bitfield(0,4)]
        //bit 0 = LT = Set when result is negative
        //bit 1 = GT = set when result is positive and non zero
        //bit 2 = EQ = set when result is zero
        //SO = copy of XER[SO] 


        this.FPRs = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] //floating point registers, wont be used here.
        this.FPSCR = new Bitfield(0,32)
        this.GPR = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] //normal 32 bit int registers, will be in use.
        
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
        

        //initialises memory with the program passed in
        for (let i = 0; i < program.length; i++) {
            this.memory.setWord(parseInt(program[i], 16), 4*i)
        }

        this.halt = false
        console.log(this.memory)
    }

    //runs one instruction forwards, setting a halt flag if it fails
    stepOnce() {
        console.log("PC = 0x" + this.programCounter.toString(16))
        let instruction = new Bitfield(this.memory.getWord(this.programCounter), 32)
        if(!this.step(instruction)) {
            this.halt = true;
        }
    }
    
    //executes the passed instruction
    step(instruction) {
        console.log("   current instruction : " + instruction.getValue().toString(16))
        let opcode = instruction.getValue(0,6)
        console.log("   " + opcode)
        let CIA = this.programCounter //current instruction address
        let NIA = CIA + 0x4 //next instruction address
        let args;
        switch(opcode) {
            case 7: { //mulli
                console.log("   mulli")
                args = instruction.split([6,11,16], ["D","A", "SIMM"])
                let D = args["D"].getValue() //gets output register number from instruction
                let A = args["A"].getValue() //gets input register number from instruction
                let SIMM = args["SIMM"].getValue() //gets multiplier from instruction
                let prod = this.GPR[A] * SIMM
                prod = prod<<0 //makes sure value is a 32 bit value
                this.GPR[D] = prod
            }
            case 11: { //cmpi
                
                console.log("   cmpi")
                args = instruction.split([6,9, 11,16], ["crfD","L", "A","SIMM"])
                let A = args["A"].getValue()
                let SIMM = args["SIMM"].getValue()
                let c;
                if (this.GPR[A] < SIMM) {
                    c = 0b1000;
                } else if (this.GPR[A] > SIMM) {
                    c = 0b0100
                }
                else {
                    c = 0b0010
                }
                let crfD = args["crfD"].getValue()
                this.CR[crfD].setValue(c + this.XER["SO"].getValue())
                break 
            }
            case 12: { //addic
                break

            }
            case 13: { //addic.

                break

            }
            case 14: { //addi
                console.log("   addi")
                args = instruction.split([6,11,16], ["D", "A", "SIMM"])
                let A = args["A"].getValue()
                let D = args["D"].getValue()
                let SIMM = args["SIMM"].getValueSignExtended()
                if (A == 0) {
                    this.GPR[D] = SIMM
                }
                else {
                    this.GPR[D] = this.GPR[A] + SIMM
                    this.GPR[D] = this.GPR[D]<<0
                }
                break
            }
            case 15: { //addis
                console.log("   addis")
                args = instruction.split([6,11,16], ["D", "A", "SIMM"])
                let A = args["A"].getValue()
                let D = args["D"].getValue()
                let SIMM = args["SIMM"].getValue()<<16
                if (A == 0) {
                    this.GPR[D] = SIMM
                }
                else {
                    this.GPR[D] = this.GPR[A] + SIMM
                    this.GPR[D] = this.GPR[D]<<0
                }
                break

            }
            case 16: {//branch conditional
                console.log("   bc")
                args = instruction.split([6,11,16,30,31], ["BO", "BI", "BD", "AA", "LK"])
                if (!args["BO"].getBit(2)) {
                    this.ctr = this.ctr-1
                }
                let ctr_ok = (args["BO"].getBit(2)) | ((this.ctr != 0 ) ^ args["BO"].getBit(3)) 
                let cond_ok = (args["BO"].getBit(0)) | (this.CR[0].getBit(args["BI"].getValue()) == args["BO"].getBit(1))
                if (ctr_ok && cond_ok) {
                    
                    if (args["AA"].getValue()) {
                        NIA = EXTS((args["BD"].getValue())<<2,16)
                    } else {
                        NIA = CIA + EXTS((args["BD"].getValue())<<2, 16)
                    }
                    console.log("   conditional branch to 0x" + NIA.toString(16))
                    if (args["LK"].getValue()) {
                        this.lr = CIA + 4
                        console.log("   set lr to 0x" + this.lr.toString(16))
                    } 
                }
                break
            }
            case 18: {//branch 
                console.log("   b")
                args = instruction.split([6,30,31], ["LI", "AA", "LK"])
                if (args["AA"].getValue()) {
                    NIA = EXTS((args["LI"].getValue())<<2,24)
                } else {
                    NIA = CIA + EXTS((args["LI"].getValue())<<2, 24)
                }
                console.log("   branch to 0x" + NIA.toString(16))
                if (args["LK"].getValue()) {
                    this.lr = CIA + 4
                    console.log("   set lr to 0x" + this.lr.toString(16))
                } 
                break 
            }
            case 19: { //branch conditional to count register
                
                console.log("   bcctr/bclr")
                
                args = instruction.split([6,11,16,21,31], ["BO", "BI", "0", "type", "LK"])
                let cond_ok = (args["BO"].getBit(0)) | (this.CR[0].getBit(args["BI"].getValue()) == args["BO"].getBit(1))
                if (cond_ok) {
                    let type = args["type"].getValue()
                    console.log(type)
                    if (type == 528){
                        NIA = this.ctr
                        console.log("   conditional branch to count register 0x" + NIA)
                    } else if (type == 16) {
                        NIA = this.lr
                        console.log("   conditional branch to link register 0x" + NIA)
                    }
                    if (args["LK"].getValue()) {
                        this.lr = CIA + 4
                        console.log("   set lr to 0x" + this.lr.toString(16))
                    } 
                }
                break
            }
            case 24: { //OR immediate ori
                console.log("   ori")
                args = instruction.split([6,11,16], ["S", "A", "UIMM"])
                let S = args["S"].getValue()
                let A = args["A"].getValue()
                let UIMM = args["UIMM"].getValue()
                
                this.GPR[A] = this.GPR[S] | UIMM
                break

            }
            case 31: {//everything else - add, addc, adde, cmp
                args = instruction.split([6,11,16,21,22,31], ["D", "A", "B", "OE", "type", "Rc"])
                var type = args["type"].getValue()
                switch(type) {
                    case 266: {  //add
                        console.log("   add")

                        let result = this.GPR[args["A"].getValue()] + this.GPR[args["B"].getValue()];
                        result = result<<0
                        this.GPR[args["D"].getValue()] = result
                        if(args["Rc"].getValue()) {
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
                            //XER : SO, OV
                        } 
                        break;
                    }
                    case 10: { //addc
                        console.log("   addc")

                        let result = this.GPR[args["A"].getValue()] + this.GPR[args["B"].getValue()];
                        result = result<<0
                        this.GPR[args["D"].getValue()] = result
                        if(args["Rc"].getValue()) {
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
                        
                        break;
                    }
                    case 138: { //add extended
                        console.log("   adde")

                        let result = this.GPR[args["A"].getValue()] + this.GPR[args["B"].getValue()] //+XER[CA];
                        result = result<<0
                        this.GPR[args["D"].getValue()] = result
                        if(args["Rc"].getValue()) {
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
                    
                
                        break;
                    }
                    case 0: {//cmp
                        console.log("   cmp")
                        args = instruction.split([6,9, 11,16,21,31], ["crfD","L", "A","B", "0", "reserved0"])
                        let A = args["A"].getValue()
                        let B = args["B"].getValue()
                        let c;
                        if (this.GPR[A] < this.GPR[B]) {
                            c = 0b1000;
                        } else if (this.GPR[A] > this.GPR[B]) {
                            c = 0b0100
                        }
                        else {
                            c = 0b0010
                        }
                        let crfD = args["crfD"].getValue()
                        this.CR[crfD].setValue(c + this.XER["SO"].getValue())
                        
                
                        break;
                    }
                    case 23: {//lwzx
                        console.log("   lwzx")
                        let D = args["D"].getValue()
                        let A = args["A"].getValue()
                        let B = args["B"].getValue()
                        let EA = this.GPR[B]
                        if (A == 0) {
                            EA += this.GPR[A]
                        }
                        this.GPR[D] = this.memory.getWord(EA)
                        break
                    }
                    case 151: {//stwx
                        console.log("   stwx")
                        let S = args["D"].getValue()
                        let A = args["A"].getValue()
                        let B = args["B"].getValue()
                        let EA = this.GPR[B]
                        if (A == 0) {
                            EA += this.GPR[A]
                        }
                        this.memory.setWord(this.GPR[S], EA)
                        break
                    }
                    case 235: {//mullw
                        console.log("   mullw")
                        let D = args["D"].getValue()
                        let A = args["A"].getValue()
                        let B = args["B"].getValue()

                        let prod = this.GPR[A] * this.GPR[B]
                        prod = prod << 0
                        
                        this.GPR[D] = prod

                        //there should also be condition register setting but not implemented
                        break
                    }
                    case 444: {// or 
                        console.log("   or")
                        let S = args["D"].getValue()
                        let A = args["A"].getValue()
                        let B = args["B"].getValue()
                        
                        this.GPR[A] = this.GPR[S] | this.GPR[B]
                        break

                    }
                    case 467: { //mtspr
                        console.log("   mtspr")
                        let S = this.GPR[args["D"].getValue()]
                        let spr = args["A"].getValue()
                        if (spr == 1) {
                            console.log("   XER")
                            this.XER = (new Bitfield(S,32)).split([0,1,2,3,25],["SO", "OV", "CA", "0", "Byte Count"])
                        } 
                        else if (spr == 8) {//lr 
                            console.log("   LR")
                            this.lr = S
                        }
                        else if (spr == 9) {//ctr 
                            console.log("   CTR")
                            this.ctr = S
                        }
                        break
                    }
                    case 339: { //mfspr
                        console.log("   mfspr")
                        let S = args["D"].getValue()
                        let spr = args["A"].getValue()
                        if (spr == 1) {
                            console.log("   XER")
                            this.GPR[S] = this.XER.getValue()
                        } 
                        else if (spr == 8) {//lr 
                            console.log("   LR")
                            this.GPR[S] = this.lr
                        }
                        else if (spr == 9) {//ctr 
                            console.log("   CTR")
                            this.GPR[S] = this.ctr
                        }
                    }
                    default:
                        break;
                }
                break;
            }
            case 32: { //lwz
                
                console.log("   lwz")
                
                args = instruction.split([6,11,16], ["D", "A", "d"])
                let D = args["D"].getValue()
                let A = args["A"].getValue()
                let d = args["d"].getValueSignExtended()
                let EA = d
                if (A != 0) {
                    EA += this.GPR[A]
                }
                this.GPR[D] = this.memory.getWord(EA)
                
                break

            }
            case 36: { //stw
                
                console.log("   stw")
                
                args = instruction.split([6,11,16], ["S", "A", "d"])
                let S = args["S"].getValue()
                let A = args["A"].getValue()
                let d = args["d"].getValueSignExtended()
                let EA = d
                if (A != 0) {
                    EA += this.GPR[A]
                }
                this.memory.setWord(this.GPR[S], EA)
                
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
function EXTS(val, originalSize) { //extends sign of a value with originalSize bits to a value with 32 bits  
    
    if(val>>(originalSize-1)) {
        let mask = ((1<<(32-originalSize))-1)<<originalSize
        return val | mask
    }
    return val
}
function stepCPU() { //tells the computer to step however many times the user specified until it halts.
    let steps = $(".stepCount").val()
    for(let i = 0; i < steps; i++) {
        if(!computer.halt){
            computer.stepOnce()
        }
        else {
            break
        }
    }
    refreshView(computer) //after every step has been completed, refresh what the user sees
}
function restartCPU() { //completely clear old computer replaced with new memory
    let code = readCode();
    computer = new Computer(code)
    readRegisters()
    initialiseTable()
    refreshView()
}

function readCode() { //reads input in 4 byte sections, ignoring everything in a line after a #
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

function readRegisters() {
    //add onclick handler to register to make it read as hex instead of dec? keep a class on it using jquery to check it
    var registers = $("#input-side .register") //get all input registers
    for(let i = 0; i < registers.length; i++) {
        let val = parseInt($(registers[i]).val())//if a custom value set, use it, else use 0
        if (val != NaN) {
            computer.GPR[i] = val<<0; //val converted to a 32 bit number using leftshift 0 bits, since bitshifts operate on 32 bit ints only
        }
        else {
            $(registers[i]).val(0);
            computer.GPR[i] = 0;
        }
    }
}
function initialiseTable() { //creates the output table for the memory, setting each value to whatever is in memory for that point, with labels for position in memory.
    $("#output-side .hex .data").remove()
    let table = $("#output-side .hex") 
    for(let i = 0; i < computer.memory.getSize();) {
        let row = $("<tr>").addClass("data")
        let id = $("<th>")
        id.text(i.toString(16).toUpperCase().padStart(4, "0"))
        row.append(id)
        for(let j = 0; j < 4; j++) {
            let value = $("<td>")
            value.text((computer.memory.getWord(i)>>>0).toString(16).toUpperCase().padStart(8, "0"))
            if (i == computer.programCounter) {
                value.addClass("currentCommand")
            }
            value.addClass("value")
            i += 4
            row.append(value)
        }
        table.append(row)
    }


}
function refreshView() { //refreshes everything the user can see
    var registers = $("#output-side .register")
    for(let i = 0; i < registers.length; i++) {
        $(registers[i]).val(computer.GPR[i])
    }
    let mem = $("#output-side .hex .data .value")
    mem.removeClass("currentCommand")
    $(mem[computer.programCounter/4]).addClass("currentCommand")

    for(let i = 0; i < computer.memory.getSize(); i += 4) {
        $(mem[i/4]).text((computer.memory.getWord(i)>>>0).toString(16).toUpperCase().padStart(8, "0"))
    }
}

//once everything is loaded, load the example program into the computer so something is there
restartCPU()

//add a limit to step value so it cant be outside the bounds of 1-999 and can only be an integer
$(".stepCount").on("change", function() {
    let v = this.value
    if (v < this.min) {
        this.value = this.min
        alert("Step value must be >= " + this.min)
    }
    else if (v > this.max) {
        this.value = this.max
        alert("Step value must be <= " + this.max)
    }
    else {
        this.value = Math.floor(v)
        if(this.value != v) {
            alert("Step value must be a whole number")
        }
    }
})