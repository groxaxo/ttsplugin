let apiUrl = "";
let apiKey = "";
let speechSpeed = 1.0;
let voice = "en-Alice_woman";  // Default voice for /v1/audio/speech endpoint
let model = "tts-1";  // Default to tts-1 model
let streamingMode = false;
let currentAudio = null;
let mediaSource = null;
let sourceBuffer = null;
let audioQueue = [];
let isSourceOpen = false;
let isMobile = false;

// Platform detection
browser.runtime.getPlatformInfo().then((info) => {
  isMobile = info.os === "android";
  initializeExtension();
});

function initializeExtension() {
  if (isMobile) {
    // Mobile setup
    browser.browserAction.setPopup({ popup: "" });
    browser.browserAction.onClicked.addListener(handleMobileClick);
  } else {
    // Desktop setup
    createContextMenu();
    browser.runtime.onInstalled.addListener(createContextMenu);
  }
}

function handleMobileClick(tab) {
  browser.tabs.executeScript({
    code: "window.getSelection().toString();"
  }).then((results) => {
    const selectedText = results[0];
    if (selectedText) processText(selectedText);
  });
}

// Load settings from local storage
browser.storage.local.get(["apiUrl", "apiKey", "speechSpeed", "voice", "model", "streamingMode"]).then((data) => {
  apiUrl = data.apiUrl || "http://localhost:5005/v1/audio/speech";
  apiKey = data.apiKey || "not-needed";
  speechSpeed = data.speechSpeed || 1.0;
  voice = data.voice || "en-Alice_woman";
  model = data.model || "tts-1";
  streamingMode = data.streamingMode || false; // Load streaming mode setting
});

// Update settings dynamically when changed
browser.storage.onChanged.addListener((changes) => {
  if (changes.apiUrl) {
    apiUrl = changes.apiUrl.newValue;
  }
  if (changes.apiKey) {
    apiKey = changes.apiKey.newValue;
  }
  if (changes.speechSpeed) {
    speechSpeed = changes.speechSpeed.newValue;
  }
  if (changes.voice) {
    voice = changes.voice.newValue;
  }
  if (changes.model) {
    model = changes.model.newValue;
  }
  if (changes.streamingMode) {
    streamingMode = changes.streamingMode.newValue; // Update streaming mode
  }
});

// Stop Playback Handler
browser.runtime.onMessage.addListener((message) => {
  if (message.action === "stopPlayback") {
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
  browser.contextMenus.removeAll(() => {
    // Create the "Read Selected Text" context menu item
    browser.contextMenus.create({
      id: "readText",
      title: "Read Selected Text",
      contexts: ["selection"]
    }, () => {
      if (browser.runtime.lastError) {
        console.error("Error creating context menu:", browser.runtime.lastError);
      } else {
        console.log("Context menu created successfully.");
      }
    });
  });
}

// Create the context menu when the extension is installed or updated
browser.runtime.onInstalled.addListener(() => {
  console.log("Extension installed or updated. Creating context menu...");
  createContextMenu();
});

// Recreate the context menu each time it is opened
browser.contextMenus.onShown.addListener((info) => {
  console.log("Context menu opened. Recreating context menu...");
  createContextMenu();
});

// Listener for context menu item click
browser.contextMenus.onClicked.addListener((info) => {
  console.log("Context menu clicked: ", info);  // Debugging log
  if (info.menuItemId === "readText" && info.selectionText) {
    console.log("Text to read: ", info.selectionText); // Debugging log
    processText(info.selectionText);
  } else {
    console.log("No text selected or menu item ID mismatch.");
  }
});

// Process selected text
function processText(text) {
  if (!apiUrl) {
    console.error("API URL not set.");
    return;
  }

  const payload = {
    model: model,
    input: text,
    voice: voice,
    response_format: "wav", // Default format for /v1/audio/speech endpoint (can also use "opus" for efficiency)
    speed: speechSpeed
  };

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  };

  console.log("Sending request to API URL:", apiUrl);
  console.log("Request payload:", payload);

  if (streamingMode) {
    // Streaming Mode with MediaSource
    try {
      // Clean up any previous playback
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }
      if (mediaSource && mediaSource.readyState === 'open') {
        mediaSource.endOfStream();
      }
      
      // Set up new audio streaming
      mediaSource = new MediaSource();
      audioQueue = [];
      isSourceOpen = false;
      
      // Create audio element
      currentAudio = new Audio();
      currentAudio.src = URL.createObjectURL(mediaSource);
      
      // Handle the sourceopen event
      mediaSource.addEventListener('sourceopen', () => {
        console.log("MediaSource opened");
        isSourceOpen = true;
        
        try {
          // In Safari/Firefox use audio/wav; in Chrome use audio/wav with codecs param
          sourceBuffer = mediaSource.addSourceBuffer('audio/wav');
          
          // Process the queue if we have any chunks waiting
          if (audioQueue.length > 0) {
            processAudioQueue();
          }
          
          // Start the audio playback
          currentAudio.play().catch(e => console.error("Error starting playback:", e));
        } catch (e) {
          console.error("Error setting up MediaSource:", e);
          // Fallback to non-streaming mode
          streamWithFetch();
        }
      });
      
      // Fetch the streaming audio
      streamWithFetch();
      
    } catch (error) {
      console.error("Error setting up streaming:", error);
      alert("Streaming mode failed. Falling back to file mode.");
      streamingMode = false;
      processText(text); // Retry with file mode
    }
  } else {
    // File Mode - unchanged
    fetchAudioFile();
  }
  
  // Function to process the audio queue
  function processAudioQueue() {
    if (!sourceBuffer || !isSourceOpen) return;
    
    if (audioQueue.length > 0 && !sourceBuffer.updating) {
      const chunk = audioQueue.shift();
      try {
        // Only append if we have data
        if (chunk.byteLength > 0) {
          sourceBuffer.appendBuffer(chunk);
        }
      } catch (e) {
        console.error("Error appending buffer:", e);
      }
    }
  }
  
  // Function to stream with fetch
  function streamWithFetch() {
    fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      // Skip WAV header on first chunk (44 bytes)
      let isFirstChunk = true;
      let headerProcessed = false;
      const reader = response.body.getReader();
      
      // Read function that processes each chunk
      function readChunk() {
        reader.read().then(({ done, value }) => {
          if (done) {
            console.log("Stream complete");
            if (mediaSource && mediaSource.readyState === 'open') {
              try {
                mediaSource.endOfStream();
              } catch (e) {
                console.error("Error ending stream:", e);
              }
            }
            return;
          }
          
          if (value) {
            try {
              // For the first chunk, we need to handle the WAV header properly
              if (isFirstChunk && !headerProcessed) {
                isFirstChunk = false;
                headerProcessed = true;
                
                // Store the chunk in the queue to be processed
                if (isSourceOpen && sourceBuffer) {
                  // Append this chunk directly if sourceBuffer is ready
                  if (!sourceBuffer.updating) {
                    sourceBuffer.appendBuffer(value.buffer);
                  } else {
                    audioQueue.push(value.buffer);
                  }
                } else {
                  // Queue for when sourceBuffer becomes available
                  audioQueue.push(value.buffer);
                }
              } else {
                // For subsequent chunks
                if (isSourceOpen && sourceBuffer) {
                  if (!sourceBuffer.updating) {
                    sourceBuffer.appendBuffer(value.buffer);
                  } else {
                    audioQueue.push(value.buffer);
                  }
                } else {
                  audioQueue.push(value.buffer);
                }
              }
              
              // Set up event listener for updateend if not already set
              if (sourceBuffer && !sourceBuffer.onupdateend) {
                sourceBuffer.onupdateend = processAudioQueue;
              }
              
            } catch (e) {
              console.error("Error processing audio chunk:", e);
            }
          }
          
          // Continue reading
          readChunk();
        }).catch(error => {
          console.error("Error reading chunk:", error);
          // Try to end the stream gracefully
          if (mediaSource && mediaSource.readyState === 'open') {
            try {
              mediaSource.endOfStream();
            } catch (e) {
              console.error("Error ending stream after read error:", e);
            }
          }
        });
      }
      
      // Start reading
      readChunk();
    })
    .catch(error => {
      console.error("Error setting up fetch:", error);
      // Fallback to file mode
      streamingMode = false;
      processText(text);
    });
  }
  
  // Function to fetch and play complete audio file
  function fetchAudioFile() {
    fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API request failed with status: ${response.status}`);
        }
        return response.blob();
      })
      .then((audioBlob) => {
        const audioUrl = URL.createObjectURL(audioBlob);
        currentAudio = new Audio(audioUrl);
        currentAudio.play().catch(e => console.error("Error playing audio:", e));
      })
      .catch((error) => {
        console.error("Error calling TTS API:", error);
        alert(`TTS API Error: ${error.message}`);
      });
  }
}