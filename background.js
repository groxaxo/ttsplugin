import { pipeline, env } from './transformers.js';
env.allowLocalModels = false;

let currentAudio = null;
let mediaSource = null;
let sourceBuffer = null;
let audioQueue = [];
let isSourceOpen = false;
let isMobile = false;

// Platform detection
chrome.runtime.getPlatformInfo().then((info) => {
  isMobile = info.os === "android";
  initializeExtension();
});

function initializeExtension() {
  if (isMobile) {
    // Mobile setup
    chrome.action.setPopup({ popup: "" });
    chrome.action.onClicked.addListener(handleMobileClick);
  } else {
    // Desktop setup
    createContextMenu();
    chrome.runtime.onInstalled.addListener(createContextMenu);
  }
}

function handleMobileClick(tab) {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => window.getSelection().toString()
  }).then((results) => {
    const selectedText = results[0].result;
    if (selectedText) processText(selectedText);
  });
}

// Whisper Transcription Handler
let recognizer = null;

async function transcribe(audio) {
  if (!recognizer) {
    recognizer = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
  }

  const audio_data = new Float32Array(audio);
  const result = await recognizer(audio_data);
  return result.text;
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "transcribeAudio") {
    try {
      // The audio data is received as an ArrayBuffer. We need to convert it to a Float32Array.
      // This requires decoding and resampling, which is best done with an AudioContext.
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const audioBuffer = await audioContext.decodeAudioData(message.audio);
      const float32Array = audioBuffer.getChannelData(0);

      const text = await transcribe(float32Array);
      chrome.runtime.sendMessage({ action: "transcriptionResult", text: text });
    } catch (error) {
      console.error("Error transcribing audio:", error);
      chrome.runtime.sendMessage({ action: "transcriptionResult", text: "Error: Could not transcribe audio." });
    }
  } else if (message.action === "stopPlayback") {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
      console.log("File mode playback stopped.");
    }
    
    // Also handle stopping MediaSource streaming if active
    if (mediaSource && mediaSource.readyState === 'open') {
      try {
        mediaSource.endOfStream();
        mediaSource = null;
        sourceBuffer = null;
        audioQueue = [];
        isSourceOpen = false;
        console.log("Streaming mode playback stopped.");
      } catch (e) {
        console.error("Error stopping MediaSource stream:", e);
      }
    }
  }
});

// Function to create or recreate the context menu
function createContextMenu() {
  // Remove any existing context menu item to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    // Create the "Read Selected Text" context menu item
    chrome.contextMenus.create({
      id: "readText",
      title: "Read Selected Text",
      contexts: ["selection"]
    }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error creating context menu:", chrome.runtime.lastError);
      } else {
        console.log("Context menu created successfully.");
      }
    });
  });
}

// Listener for context menu item click
chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === "readText" && info.selectionText) {
    await processText(info.selectionText);
  }
});

let synthesizer = null;
let speaker_embeddings = null;

async function processText(text) {
    if (!synthesizer) {
        synthesizer = await pipeline('text-to-speech', 'Xenova/speecht5_tts');
        // The speaker embeddings are not part of the model and need to be loaded separately
        const speaker_embeddings_url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/speaker_embeddings.bin';
        const speaker_embeddings_response = await fetch(speaker_embeddings_url);
        speaker_embeddings = new Float32Array(await speaker_embeddings_response.arrayBuffer());
    }

    try {
        const wav = await synthesizer(text, { speaker_embeddings });
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(wav.audio.buffer);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
    } catch (error) {
        console.error("Error processing text for TTS:", error);
    }
}