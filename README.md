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

This is tiny in comparison to the full instruction set of PPC, but it is sufficient for any small programs and  

# Testing

## register initialisation testing

## basic code testing

## interface interacting testing


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