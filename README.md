# Instructions
Execute following steps:
- Run `npm install`
- Create solidity image: `docker build -t solidity -f ./dockerfiles/Solidity .`
- Run this code in the terminal, so you can get a proof of concept `npx ts-node main.ts`

# Performance
I checked performance executing 4 times inside docker and 4 times in my computer and I have the following results:

### Docker

### Own computer
22,25s user 4,31s system 152% cpu 17,424 total
22,09s user 4,31s system 151% cpu 17,418 total
21,81s user 4,34s system 152% cpu 17,125 total
21,77s user 4,34s system 151% cpu 17,234 total
