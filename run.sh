#!/bin/bash

cd ~/Programmation/GlitchyVerse

export GOPATH=$(pwd)

go install glitchyverse

./bin/glitchyverse -i :8080 -w ./www --debug

$SHELL # Don't close the terminal if I launch it with a GUI !