const sharp = require('sharp');

async function readImageMetadata(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width || null,
      height: metadata.height || null
    };
  } catch (error) {
    return {
      width: null,
      height: null
    };
  }
}

module.exports = {
  readImageMetadata
};
