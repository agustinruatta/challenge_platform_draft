#!/bin/sh
# Build image
# -t: use special tag so it can be easier to found
# -f: We are going to have lot of Dockerfiles for every language or context
docker build -t solidity -f Solidity .

# Run image
# --rm: remove container once finished
# -d: in order to make it more performant, we're not going to stop container for every request. If you want more security, don't detach it
docker run --rm solidity npx hardhat test
