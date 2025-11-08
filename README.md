
# Custom TTS Reader

TTS implementation for the OpenAI api format. It can probably be used for any OpenAI api compliant service. 
Click 'Read Selected Text' in the context menu after highlighting text.

This addon is for Firefox!



## Installation

On Mozilla Addons:
https://addons.mozilla.org/en-US/firefox/addon/custom-tts-reader/
    
## Description

Do you have your own OpenAI-compatible Speech endpoint running and want to use it in Firefox?
This is a TTS implementation for the OpenAI API format, specifically designed to work with the `/v1/audio/speech` endpoint that returns audio in WAV or Opus format.

Click 'Read Selected Text' in the context menu after highlighting text.

You can change the API URL, API key, speed and voice by clicking the extension icon in the toolbar.
The streaming mode is not working for now since Firefox doesn't support PMC natively.

Since you can host your own speech endpoint, privacy and accessibility are as good as the service you're running.

### Endpoint Configuration

The extension is configured to work with the `/v1/audio/speech` endpoint format:

**Required Parameters:**
- `input`: The text you want to convert to speech
- `voice`: The name of the speaker voice (e.g., "en-Alice_woman")

**Optional Parameters:**
- `model`: The TTS model to use (default: "tts-1")
- `response_format`: Audio format - "wav" (default) or "opus" (recommended for efficiency)
- `speed`: Speech speed multiplier (default: 1.0)

**Example Compatible Services:**
- Kokoro FastAPI: https://github.com/remsky/Kokoro-FastAPI/
- Any OpenAI-compatible TTS endpoint that supports the `/v1/audio/speech` format


Note:
This is just a quick implementation since I couldn't find a similar extension where you could use your own API endpoint anywhere. I am not a developer. The code might be jank, but it works. Feel free to improve it... or not :)


## License

[MIT](https://choosealicense.com/licenses/mit/)

