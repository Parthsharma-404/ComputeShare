module.exports = {
  name: 'PRIME_SEARCH',
  description: 'Finds prime numbers in massive block ranges natively',
  
  workerFunctionString: `
    function processPrimeChunk(chunk) {
      const { start, end } = JSON.parse(chunk.payload);
      const primes = [];
      for (let i = start; i < end; i++) {
        let isPrime = i > 1;
        for (let j = 2; j <= Math.sqrt(i); j++) {
           if (i % j === 0) { isPrime = false; break; }
        }
        if (isPrime) primes.push(i);
      }
      return primes;
    }
  `
};
