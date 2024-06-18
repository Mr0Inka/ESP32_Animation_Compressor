const fs = require('fs');
const path = require('path');

// Decompress RLE encoded data
const decompressImageData = (compressedData, totalPixels) => {
    let decompressedFrames = [];
    let frameIndex = 0;

    while (frameIndex < compressedData.length) {
        let frame = [];
        let dataIndex = 0;

        while (dataIndex < totalPixels) {
            let value = compressedData[frameIndex];

            if ((value & 0xf000) === 0xf000) {  // RLE encoded data
                let count = value & 0x0fff;  // Extract count
                let color = compressedData[frameIndex + 1];  // Get color
                for (let j = 0; j < count && dataIndex < totalPixels; j++) {
                    frame[dataIndex++] = color;
                }
                frameIndex += 2;
            } else {  // Single pixel data
                frame[dataIndex++] = value;
                frameIndex++;
            }
        }

        decompressedFrames.push(frame);
    }

    return decompressedFrames;
}

const inputFilePath = path.join(__dirname, 'output', 'image_compressed.h');
const outputFilePath = path.join(__dirname, 'output', 'image_decompressed.h');

fs.readFile(inputFilePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading file:', err);
        return;
    }

    const regex = /const unsigned short picture\[\]\[\d+\] PROGMEM=\{([\s\S]+?)\};/;
    const match = regex.exec(data);

    if (!match) {
        console.error('Failed to extract image data.');
        return;
    }

    const compressedData = match[1].replace(/[\s{}]/g, '').split(',').map(hex => parseInt(hex, 16));

    // Extract frame details
    const framesNumberMatch = /int framesNumber=(\d+);/.exec(data);
    const aniWidthMatch = /int aniWidth=(\d+);/.exec(data);
    const aniHeightMatch = /int aniHeight=(\d+);/.exec(data);

    const framesNumber = framesNumberMatch ? parseInt(framesNumberMatch[1], 10) : 1;
    const aniWidth = aniWidthMatch ? parseInt(aniWidthMatch[1], 10) : 1;
    const aniHeight = aniHeightMatch ? parseInt(aniHeightMatch[1], 10) : 1;
    const totalPixels = aniWidth * aniHeight;

    const decompressedFrames = decompressImageData(compressedData, totalPixels);

    let output = `int framesNumber=${framesNumber}; int aniWidth=${aniWidth}; int aniHeight=${aniHeight};\n`;
    output += `const unsigned short picture[][${totalPixels}] PROGMEM={\n`;

    for (let frame = 0; frame < framesNumber; frame++) {
        output += '{\n  ';
        for (let i = 0; i < totalPixels; i++) {
            if (typeof decompressedFrames[frame][i] !== 'undefined') {
                output += `0x${decompressedFrames[frame][i].toString(16).padStart(4, '0')}`;
            } else {
                console.error(`Value at index ${i} in frame ${frame} is undefined.`);
                output += '0x0000'; 
            }
            if (i < totalPixels - 1) output += ', ';
            if ((i + 1) % 10 === 0 && i < totalPixels - 1) output += '\n  ';
        }
        output += '\n}';
        if (frame < framesNumber - 1) output += ',\n';
    }

    output += '};';

    fs.writeFile(outputFilePath, output, (err) => {
        if (err) {
            console.error('Error writing file:', err);
            return;
        }
        console.log(`Decompression complete.`);
    });
});
