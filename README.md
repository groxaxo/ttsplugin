
# In-Browser Speech-to-Text and TTS

This is a browser extension that provides in-browser speech-to-text (STT) and text-to-speech (TTS) functionality using the `transformers.js` library. All processing is done locally in your browser, so your data stays private.

## Features

*   **Speech-to-Text:** Record audio from your microphone and have it transcribed to text using the Whisper model.
*   **Text-to-Speech:** Highlight any text on a webpage, right-click, and select "Read Selected Text" to have it read aloud.

## How to Use

*   **Speech-to-Text:**
    1.  Click the extension icon in the toolbar.
    2.  Click "Start Recording" to begin recording audio.
    3.  Click "Stop Recording" when you're finished.
    4.  The transcribed text will appear in the text box.

*   **Text-to-Speech:**
    1.  Highlight any text on a webpage.
    2.  Right-click the highlighted text.
    3.  Select "Read Selected Text" from the context menu.

## Privacy

All STT and TTS processing is done locally in your browser. No data is sent to any external servers.

## Technology

This extension is powered by `transformers.js`, a JavaScript library for running machine learning models directly in the browser. It uses the following models:

*   **Speech-to-Text:** `Xenova/whisper-tiny.en`
*   **Text-to-Speech:** `Xenova/speecht5_tts`


## License

[MIT](https://choosealicense.com/licenses/mit/)

