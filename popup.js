document.addEventListener("DOMContentLoaded", () => {
  const recordButton = document.getElementById("recordButton");
  const stopButton = document.getElementById("stopButton");
  const transcribedText = document.getElementById("transcribedText");

  let mediaRecorder;
  let audioChunks = [];
  let isRecording = false;

  recordButton.addEventListener("click", async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
          audioChunks = [];

          // The audio blob is not directly serializable, so we read it into an array buffer
          const audioBuffer = await audioBlob.arrayBuffer();

          // Send the audio buffer to the background script
          chrome.runtime.sendMessage({ action: "transcribeAudio", audio: audioBuffer });
        };
        mediaRecorder.start();
        recordButton.textContent = "Stop Recording";
        isRecording = true;
      } catch (error) {
        console.error("Error accessing microphone:", error);
        alert("Could not access microphone. Please check permissions.");
      }
    } else {
      mediaRecorder.stop();
      recordButton.textContent = "Start Recording";
      isRecording = false;
    }
  });

  stopButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "stopPlayback" });
  });

  // Listen for transcribed text from the background script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "transcriptionResult") {
      transcribedText.value = message.text;
    }
  });
});
