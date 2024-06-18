#include "rm67162.h"
#include "TFT_eSPI.h"
#include "image.h" // This file contains int framesNumber, int aniWidth, int aniHeight

TFT_eSPI tft;
TFT_eSprite sprite(&tft);

int imageW = 536; // Width of the image
int imageH = 240; // Height of the image

void setup()
{
    sprite.createSprite(imageW, imageH); // Create a sprite with the image dimensions
    sprite.setSwapBytes(true);           // Set byte order if needed
    rm67162_init();                      // Initialize the display
    lcd_setRotation(1);                  // Set rotation if needed
}

void loop()
{
    for (int frame = 0; frame < framesNumber; frame++)
    {
        displayFrame(frame); // Display the current frame
        delay(40);           // Delay for 40ms to achieve 25 fps (1000 ms / 25 = 40 ms)
    }
}

void displayFrame(int frame)
{
    const unsigned short *frameData = picture[frame]; // Get the frame data
    int index = 0;

    for (int y = 0; y < aniHeight; y++)
    {
        for (int x = 0; x < aniWidth;)
        {
            unsigned short value = frameData[index++]; // Read the next value from frame data

            if (value & 0xf000)
            {                                              // Check if the value is RLE encoded
                int count = value & 0x0fff;                // Extract the count (lower 12 bits)
                unsigned short color = frameData[index++]; // Read the color value
                for (int i = 0; i < count; i++)
                { // Draw 'count' pixels with the same color
                    sprite.drawPixel(x++, y, color);
                }
            }
            else
            {                                    // Single pixel value
                sprite.drawPixel(x++, y, value); // Draw one pixel with the specified color
            }
        }
    }

    lcd_PushColors(0, 0, aniWidth, aniHeight, (uint16_t *)sprite.getPointer()); // Push the sprite to the display
}
