// Mock execution engine for workers (usually runs on client, but the schema defines it here)
module.exports = {
  name: 'MATH_RANGE',
  description: 'Evaluates algebraic functions over a numeric range',
  
  // Example implementation that a client worker would execute
  workerFunctionString: `
    function processMathChunk(chunk) {
      const data = JSON.parse(chunk.payload);
      let results = [];
      
      // Prevent eval security vulnerability, assume basic JS standard math functions exist
      const fn = new Function('x', 'return ' + data.func);
      
      for (let i = data.start; i < data.end; i += data.step) {
        try {
          results.push(fn(i));
        } catch(e) {
          results.push(null);
        }
      }
      return results;
    }
  `
};
