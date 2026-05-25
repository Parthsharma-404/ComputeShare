module.exports = {
  name: 'MONTE_CARLO',
  description: 'Runs parallel simulations for probablistic calculation.',
  
  workerFunctionString: `
    function processMonteCarlo(chunk) {
      const { iterations } = JSON.parse(chunk.payload);
      let insideCircle = 0;
      for (let i = 0; i < iterations; i++) {
        const x = Math.random();
        const y = Math.random();
        if (x * x + y * y <= 1) insideCircle++;
      }
      return insideCircle; // to aggregate PI estimation
    }
  `
};
