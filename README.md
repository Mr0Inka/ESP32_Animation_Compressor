# ESP32 Animation Compressor 🎨

Converts PNG image sequences into heavily compressed data for displaying animations on ESP32 microcontrollers with TFT / OLED / AMOLED displays.

- Uses RGB565 color encoding
- RLE (Run-Length Encoding) compression

The example frames are compressed from 9384kb to 302kb (~97%).  
This obviously only works well for UI-like screens with larger single-color areas.

The provided player example displays animations stored as compressed RGB565 and RLE encoded data
