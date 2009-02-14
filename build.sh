#!/bin/bash


if [ "$USER" = ypetya ]; then
    cp * /home/ypetya/sshfs/ -r

    /home/ypetya/scripts/pushapp.rb
else
    echo 'Edit your post-commit script for deploy!'
fi
