const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// Convert RGB to RGB565
function toRGB565(r, g, b) {
    const r5 = (r >> 3) & 0x1F;
    const g6 = (g >> 2) & 0x3F;
    const b5 = (b >> 3) & 0x1F;
    return (r5 << 11) | (g6 << 5) | b5;
}

// Compress the data using RLE
function compressImageData(imageData) {
    const compressedData = [];
    let i = 0;

    while (i < imageData.length) {
        const color = imageData[i];
        let count = 1;

        while (i + count < imageData.length && imageData[i + count] === color && count < 4095) {
            count++;
        }

        if (count > 1) {
            compressedData.push(0xf000 | count, color);
            i += count;
        } else {
            compressedData.push(color);
            i++;
        }
    }

    return compressedData;
}

// Read and convert PNG files in the input folder
function convertImagesToRGB565() {
    const inputDir = './frames/';
    const outputFileCompressed = './output/image_compressed.h';
    const outputFileUncompressed = './output/image_uncompressed.h';

    fs.readdir(inputDir, (err, files) => {
        if (err) throw err;

        let imagesData = [];
        let framesNumber = 0;
        let firstImageWidth, firstImageHeight;

        files.forEach((file) => {
            if (file.endsWith('.png')) {
                framesNumber++;
                const filePath = path.join(inputDir, file);

                fs.createReadStream(filePath)
                    .pipe(new PNG())
                    .on('parsed', function () {
                        const width = this.width;
                        const height = this.height;
                        const totalPixels = width * height;
                        const pixels = new Uint16Array(totalPixels);

                        if (!firstImageWidth || !firstImageHeight) {
                            firstImageWidth = width;
                            firstImageHeight = height;
                        }

                        for (let y = 0; y < height; y++) {
                            for (let x = 0; x < width; x++) {
                                const idx = (width * y + x) << 2;
                                const r = this.data[idx];
                                const g = this.data[idx + 1];
                                const b = this.data[idx + 2];
                                pixels[width * y + x] = toRGB565(r, g, b);
                            }
                        }

                        const compressedData = compressImageData(pixels);

                        let uncompressedImageData = '';
                        for (let i = 0; i < pixels.length; i++) {
                            if (i % 10 === 0) uncompressedImageData += '\n  ';
                            uncompressedImageData += `0x${pixels[i].toString(16).padStart(4, '0')}`;
                            if (i < pixels.length - 1) uncompressedImageData += ', ';
                        }

                        let compressedImageData = '';
                        for (let i = 0; i < compressedData.length; i++) {
                            if (i % 10 === 0) compressedImageData += '\n  ';
                            compressedImageData += `0x${compressedData[i].toString(16).padStart(4, '0')}`;
                            if (i < compressedData.length - 1) compressedImageData += ', ';
                        }

                        imagesData.push({ uncompressed: uncompressedImageData, compressed: compressedImageData });

                        if (imagesData.length === framesNumber) {
                            const header = `int framesNumber=${framesNumber}; int aniWidth=${firstImageWidth}; int aniHeight=${firstImageHeight};\n`;

                            const uncompressedOutput = `${header}const unsigned short picture[][${totalPixels}] PROGMEM={${imagesData.map(img => `\n{${img.uncompressed}\n}`).join(',')}};`;
                            fs.writeFileSync(outputFileUncompressed, uncompressedOutput);

                            const compressedOutput = `${header}const unsigned short picture[][${Math.max(...imagesData.map(img => img.compressed.length / 2))}] PROGMEM={${imagesData.map(img => `\n{${img.compressed}\n}`).join(',')}};`;
                            fs.writeFileSync(outputFileCompressed, compressedOutput);

                            const uncompressedSize = Buffer.byteLength(uncompressedOutput, 'utf8') / 1024;
                            const compressedSize = Buffer.byteLength(compressedOutput, 'utf8') / 1024;
                            const reductionPercent = ((uncompressedSize - compressedSize) / uncompressedSize) * 100;

                            console.log(`Converted ${framesNumber} frames. Original file size: ${uncompressedSize.toFixed(2)} kb | Compressed file size: ${compressedSize.toFixed(2)} kb (-${reductionPercent.toFixed(1)}%)`);
                        }
                    });
            }
        });
    });
}

convertImagesToRGB565();
