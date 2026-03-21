module.exports = {
  name: 'IMAGE_PROCESSING',
  description: 'Applies convolutions or color inversions on partitioned image byte arrays',
  
  workerFunctionString: `
    function processImageChunk(chunk) {
      const { pixels, operation } = JSON.parse(chunk.payload);
      // pixels: [r, g, b, a, ...]
      const result = new Uint8Array(pixels.length);
      
      for (let i = 0; i < pixels.length; i += 4) {
        if (operation === 'invert') {
          result[i] = 255 - pixels[i];     // R
          result[i+1] = 255 - pixels[i+1]; // G
          result[i+2] = 255 - pixels[i+2]; // B
          result[i+3] = pixels[i+3];       // A
        }
      }
      return Array.from(result);
    }
  `
};
