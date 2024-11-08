# Instructions
Execute following steps:
- Run `npm install`
- Create Solidity image: `docker build -t solidity -f ./dockerfiles/Solidity .`
- Create Cairo image: `docker build -t cairo -f ./dockerfiles/Cairo .`
- Create Zigy image: `docker build -t zig -f ./dockerfiles/Zig .`
- Run this code in the terminal, sog you can get a proof of concept `npx ts-node test.ts`

# How to use
TestExecutor.ts is the main file. Use it in the code as following:
```typescript
try {
    const executionResult = await testExecutor.executeTest(
        //Replace it from what techonology user is trying to learn
        'solidity',
        //Code that user submitted
        useSubmittedCode,
        //Frontend has to send the exercise ID. This must be a string from '1' to the last exercise (For example, '13')
        '1',
    );
} catch (e) {
    console.log('This is because frontend sent an invalid ID');
}
```

# Performance Solidity
I checked performance executing 4 times inside docker and 4 times in my computer and I have the following results (48.64% faster inside docker):

### Docker
EXECUTION TIME: 14519.697548002005 ms.
EXECUTION TIME: 14353.851815998554 ms.
EXECUTION TIME: 15808.941048998386 ms.
EXECUTION TIME: 14468.507693000138 ms.

Average: 14.787 seg

### Own computer
22,25s user 4,31s system 152% cpu 17,424 total
22,09s user 4,31s system 151% cpu 17,418 total
21,81s user 4,34s system 152% cpu 17,125 total
21,77s user 4,34s system 151% cpu 17,234 total


Average: 21.98
