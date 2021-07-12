# Purpose of the Project :

Create a basic power pc assembler emulator that can be used to quick and easy test code online with minimal work.

# User Stories :

1) as a user i want to be able to input code and quickly see the outcome of the code

2) as a user i want to be able to know what commands are so far usable

3) as a visitor i want to be able to learn a little about how low level operations work through stepping through code line by line

4) as a user i want to be able to watch how memory and registers update as the code is run

# Features :

1) Memory Start

    Main way to interact with the page. Input code in hex and any extra data after

2) Registers start

    Allow you to set extra initial conditions of registers of memory

3) emulator start

    When pressed, full emulator side of page is reloaded with initial conditions specified by the user 

4) emulation

    Allows the user to start the interpretter and steps through code as a processor actually would, updating all visuals to show the new state of the machine

5) play/step

    allows user to emulate either one step at a time or in large jumps 

6) limited instruction set 

    this implementation is only going to have a few commands implemented so that it can be finished within a reasonable amount of time. 
    planned command types are all branch commands, compare, add, multiply, subtract and load 

# Future Features: 


1) skip

    allow user to skip a command in testing 

2) edit memory/registers during emulation 

    allow editting the emulator as its running

3) larger instruction set

    once this is done as a small project, i plan to incrementally increase the implemented instruction set so this can be used to write more complicated codes.

# Typography and Color Scheme :


Background will be a carbon colour, relatively dark.
Text will be an off-white colour using the Exo and Roboto fonts.


# Wireframes :

![Image](/wireframes/asmpage.png)

# Current State :

all commands implemented in this are as follows : 
cmpi 
addi 
addis 
bc (blt ble bge bgt beq bne)
b 
bcctr 
add
addc
adde 
cmp
lwz 
stw 
lwzx 
stwx 
mulli 
mullw
or

This is tiny in comparison to the full instruction set of PPC, but it is sufficient for any small programs and allows a base framework to play with.

A couple of these instructions are intended to set flags as they happen (or have a varient to perform the same action but with flag setting on top). These mostly went unimplemented, such as `or` not setting any flag for its results. Instructions that set compare registers flags on top of their base functionality are as follows : 
cmpi
cmp
add
addc
adde

(technically cmpi and cmp the setting flags is their entire functionality, not just a side-effect).

# Testing

## register testing
![Image](/testingImages/registers_1.png)

when everything is opened at first, every input register on the left is defaulted to blank. This is then all immediately read and interpretted in the output registers as all 0's. 

Using the default program that loads when you open the page, I can step forwards and registers values update according each step as expected

![Image](/testingImages/registers_2.png)

When Input registers are set to a value, nothing on the output changes until Go is pressed, at which point the values specified for specific registers are updated as expected: 

![Image](/testingImages/registers_3.png)

# Integer Overflow: 

All registers are intended to only contain a 32 bit integer. Javascript stores all integers as floating point values, so enforcing the 32 bit value limit had to be done in code. Conveniently javascript bitwise operators convert the value into a 32 bit value and back to perform their operations, so a bitshift right 0 bits forces all values to always stay within the 32 bit bounds. 

The highest positive integer can be represented as 0x7FFFFFFF, 2147483647 in decimal, and you can see this correctly transfers over.

![Image](/testingImages/overflow_1.png)

The lowest negative number can be represented as 0x80000000, -2147483648 in decimal, and you can see this correctly transfers over.

![Image](/testingImages/overflow_2.png)

![Image](/testingImages/overflow_4.png)

Any value equal to or above 0x100000000 is too large to be represented in 32 bits. If a value is above this range, only the first 32 bits of the number are used, so for example 0x100000002 = 2.

![Image](/testingImages/overflow_3.png)

## basic code testing

A few example functions are included in the file exampleFunctions.txt that demonstrate functionality of actual opcodes is working as intended. I will attempt to show this without going in depth into every command.

# fibonnacci 

Demonstrates functionality of branch, li, mr and add.

This example code calculates the fibonacci sequence in 3 of the registers on the output side, infinitely looping. 

The first 2 commands load initial values into output registers 3 and 4. 

![Image](/testingImages/fib_1.png)

The third command is an add, showing adding r3 and r4 and storing value into r5. 

![Image](/testingImages/fib_2.png)

The next two commands are mr commands, which copy registers into other positions. 

![Image](/testingImages/fib_3.png)

The last command changes where the program counter is, moving execution back to the add command. 

![Image](/testingImages/fib_4.png)

After stepping a fair bit, the values seen are still fibonnacci numbers, so it is working correctly.

![Image](/testingImages/fib_5.png)

# factorial 

shows off multiply, compare, conditional branch. 



# load store example with no good name 

shows off load word and store word.

## interface interacting testing

currrent command highlighting

steps correctly do commands

Following image shows the command at 0004 is the current command, as it is highlighted:

![Image](/testingImages/steps_1.png)

When one step of the program is run by pressing the top of the screen, this progresses one forwards, unhighlighting 0004 and highlighting 0008

![Image](/testingImages/steps_2.png)

Using the step size option on the page correctly changes how far each step goes. When at setting of 1, it visually goes command by command. At setting 2, it visually skips a command each time. At 3, it looks like its going backwards in the 4-command loop of the default example program. And at 4 it visually stays in place while registers update for each loop.

![Step Sizes](/testingImages/steps_4.gif)

Stepsize Limits: 
Minimum and Maximum values of step size were set to 1 and 999 respectively. This is intended to be only integers since it is a count of acts. I was under the belief these limitations came with the `input type=number` but actual code had to be added to validate the values correctly.

Step size can only be a positive integer, if an invalid value is input, a popup is produced as would be expected.

# Client Story Testing


# Lighthouse: 

# Others:


# Deployment

I developed this project using [Gitpod IDE](https://gitpod.io/) and a git-repo hosted on GitHub. 

The page is hosted using GitHub Pages by doing the following:

1) Log in
2) Open Repo
3) Select Settings
4) Find the GitHub Pages Section
5) select the master branch as the source
6) get link from the page again.

This page can be found [here](https://EonTas.github.io/Mods-Site/.) for the forseeable future.

## How to run locally

To clone you will need a github account or other git client.
1) Open this link to the [project](https://github.com/EonTAS/Mods-Site/)
2) Under the repo name, click "clone or download" button.
3) copy the clone url for the repository.
4) In your IDE of choice, open the terminal 
5) set working directory to where you want to clone the repo.
6) type `git clone` and paste the url from step 3 and press enter.



# Credits: 


https://fail0verflow.com/media/files/ppc_750cl.pdf following this spec for each command (starts at page 353)

and https://www.nxp.com/docs/en/user-guide/MPCFPE_AD_R1.pdf this to help understand compare register better