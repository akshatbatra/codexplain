import { OpenAI } from 'openai';

const AI_VOICE_URL = 'http://127.0.0.1:3000/aiVoice';

// OpenAI client configuration for IBM Granite model
const openai = new OpenAI({
  baseURL: process.env.IBM_ENDPOINT,
  apiKey: process.env.IBM_KEY
});

// Function to get code explanation from IBM Granite model
async function getCodeExplanation(code: string): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: "ibm/granite-3.3-8b-instruct",
      messages: [
        { role: "system", content: "You are an elaborate code explainer that uses concise, plain, sharp but cohesive narrative English. Return a single valid JSON Response (with properly escaped characters parsable by JSON.parse) with keys being the code token that you are explaining from the given code and explanation as the the value of key. Each line of code may have multiple separate components/tokens to be explained separately under different keys, all code components and explanation pairs should be top level keys without any nesting in the entire JSON. No code token should be missed. All keys in the JSON must exactly match with a code token in the supplied code. You may group some tokens together if it makes more sense, but they should preferably be explained in their own individual mappings. Don't include text like 'this line of code' in the explanations, focus on content. If context isn't sufficient to explain a component/token, then keep your explanation limited and don't try to create context that you don't have. Your output will be read by a text to speech service, include explanation for all components of the code even within a line but choose words in explanation such that they can be easily spoken by a text to speech service. Keep explanation short and concise without compromising on providing a good explanation, include every component/token of code in the JSON, don't cut short the response by omitting code from explanation, have a good amount of key-explanation mapping as per the size of input code but keep the explanation text for each token short and condensed without skipping tokens. If there is a function or method call or object constructor, explain the function/method along with parameters as one component if possible. If a particular general object/method/function is explained before in one of the previous lines or same line, don't explain it again, skip it unless the arguments passed to that general programming component are different, then explain the the new passed arguments a bit." },
        { role: "user", content: `${code}` }
      ]
    });
    console.log(response.choices[0].message.content)
    if (typeof(response.choices[0].message.content) == "string") {
        return JSON.parse(response.choices[0].message.content);
    }
  } catch (error) {
    console.error("Error calling IBM Granite:", error);
    throw error;
  }
}

export function getWebviewContent(code: string, serverAddress: string, explanationData?: any): string {
  // Escape code for safe embedding in HTML
  const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Generate random pastel colors for labels
  const generateRandomPastelColor = () => {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 80%)`;
  };
  
  // Create HTML for explanation labels if we have data
  let explanationLabelsHtml = '';
  let audioElementsHtml = '';
  let tokensArray = [];
  
  if (explanationData) {
    let index = 0;
    for (const [token, explanation ] of Object.entries(explanationData)) {
      const color = generateRandomPastelColor();
      const safeToken = token.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeExplanation = (explanation as string).replace(/"/g, '&quot;');
      
      explanationLabelsHtml += `
        <div class="explanation-label" style="background-color: ${color};" data-index="${index}">
          <span class="token-text">${safeToken}</span>
          <span class="explanation-text">${safeExplanation}</span>
        </div>
      `;
      
      // Create audio element for this token without preload="none" for better loading
      audioElementsHtml += `
        <audio id="audio-${index}" class="token-audio" data-index="${index}">
          <source src="${serverAddress}?text=${encodeURIComponent(safeExplanation)}" type="audio/mpeg">
        </audio>
      `;
      
      tokensArray.push({ token: safeToken, explanation: safeExplanation });
      index++;
    }
  }
  
  // Set status message based on whether we have explanation data
  const initialStatusMessage = explanationData 
    ? "Click the labels to hear explanations" 
    : "Analyzing code...";
    
  // Set initial button state based on whether we have explanation data
  const initialButtonState = explanationData ? "" : "disabled";

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CodeXplain</title>
      <style>
          body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              padding: 20px;
              color: var(--vscode-foreground);
              background-color: var(--vscode-editor-background);
              text-align: center;
          }
          .header {
              margin: 0 auto 20px;
              padding-bottom: 15px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }
          .logo {
              font-size: 2.5rem;
              font-weight: 700;
              letter-spacing: -0.5px;
              margin: 0;
              background: linear-gradient(90deg, #6ea8fe, #0d6efd);
              background-clip: text;
              -webkit-background-clip: text;
              color: transparent;
              text-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
          }
          .tagline {
              font-size: 0.85rem;
              opacity: 0.8;
              font-style: italic;
              margin-top: 5px;
          }
          pre {
              background-color: var(--vscode-editor-inactiveSelectionBackground);
              padding: 10px;
              border-radius: 5px;
              overflow-x: auto;
              margin-bottom: 20px;
              text-align: left;
          }
          .button-container {
              display: flex;
              justify-content: center;
              align-items: center;
              margin: 15px 0 25px;
              gap: 15px;
          }
          .svg-button {
              background-color: var(--vscode-button-background);
              color: var(--vscode-button-foreground);
              border: none;
              border-radius: 50%;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: background-color 0.2s;
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
          }
          .svg-button:hover {
              background-color: var(--vscode-button-hoverBackground);
              transform: translateY(-1px);
          }
          .svg-button:disabled {
              opacity: 0.5;
              cursor: not-allowed;
              box-shadow: none;
          }
          #explainBtn {
              width: 64px;
              height: 64px;
          }
          #stopBtn {
              width: 48px;
              height: 48px;
          }
          .svg-button svg {
              fill: currentColor;
          }
          .status {
              margin-top: 20px;
              font-style: italic;
              text-align: center;
          }
          .audio-controls {
              margin-top: 15px;
              width: 100%;
          }
          .explanation-labels {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              justify-content: center;
              margin: 20px 0;
          }
          .explanation-label {
              padding: 8px 12px;
              color: black;
              border-radius: 20px;
              font-size: 0.9rem;
              display: inline-flex;
              align-items: center;
              cursor: pointer;
              transition: all 0.2s;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              position: relative;
          }
          .explanation-label:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          }
          .explanation-label.active {
              outline: 2px solid white;
              outline-offset: 2px;
          }
          .token-text {
              font-weight: bold;
          }
          .explanation-text {
              display: none;
              position: absolute;
              color: white;
              bottom: 100%;
              left: 50%;
              transform: translateX(-50%);
              background-color: var(--vscode-editor-background);
              border: 1px solid var(--vscode-panel-border);
              padding: 8px 12px;
              border-radius: 6px;
              width: 300px;
              text-align: left;
              z-index: 100;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
          .explanation-label:hover .explanation-text {
              display: block;
          }
          .section-title {
              margin-top: 15px;
              margin-bottom: 10px;
              font-size: 1.2rem;
              text-align: left;
          }
          .audio-container {
              display: none;
          }
          .token-audio {
              display: none;
          }
          .debug-info {
              margin-top: 20px;
              padding: 8px;
              border: 1px solid #666;
              background-color: #333;
              color: #eee;
              font-family: monospace;
              white-space: pre-wrap;
              overflow-wrap: break-word;
              max-height: 200px;
              overflow-y: auto;
              display: none;
              text-align: left;
          }
          .reload-button {
              margin-top: 10px;
              padding: 5px 10px;
              background: var(--vscode-button-background);
              color: var(--vscode-button-foreground);
              border: none;
              border-radius: 4px;
              cursor: pointer;
          }
          .reload-button:hover {
              background: var(--vscode-button-hoverBackground);
          }
      </style>
  </head>
  <body>
      <div class="header">
          <h1 class="logo">CodeXplain</h1>
          <p class="tagline">Powered by IBM Granite</p>
      </div>
      
      <!-- Moved buttons to the top -->
      <!-- Commented out play and pause buttons
      <div class="button-container">
          <button id="explainBtn" class="svg-button" title="Explain Code" ${initialButtonState}>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
              </svg>
          </button>
          <button id="stopBtn" class="svg-button" disabled title="Stop Explanation">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
          </button>
      </div>
      -->
      
      <div class="status" id="status">${initialStatusMessage}</div>
      
      <!-- Selected code moved after the buttons -->
      <h3 class="section-title">Selected Code:</h3>
      <pre>${escapedCode}</pre>
      
      <!-- Explanation labels -->
      <div class="explanation-labels">
        ${explanationLabelsHtml}
      </div>
      
      <!-- Hidden audio container for all token audio elements -->
      <div class="audio-container">
        ${audioElementsHtml}
      </div>
      
      ${!explanationData ? '<button id="manualAnalyzeBtn" class="reload-button">Analyze Code</button>' : ''}
      
      <div id="debugInfo" class="debug-info"></div>
      
      <script>
        // Basic elements
        const statusElement = document.getElementById('status');
        const stopBtn = document.getElementById('stopBtn');
        const explainBtn = document.getElementById('explainBtn');
        const debugInfo = document.getElementById('debugInfo');
        const manualAnalyzeBtn = document.getElementById('manualAnalyzeBtn');
        
        // Audio elements
        const audioElements = document.querySelectorAll('.token-audio');
        
        // Token data
        const tokens = ${JSON.stringify(tokensArray)};
        let currentPlayingIndex = -1;
        let isPlaying = false;
        
        // Debug logging
        function debugLog(message) {
          console.log(message);
          if (debugInfo) {
            debugInfo.textContent += "\\n" + message;
            debugInfo.scrollTop = debugInfo.scrollHeight;
          }
        }
        
        // Enable debugging
        debugInfo.style.display = 'block';
        
        // Initialize on page load
        window.onload = function() {
          debugLog("Page loaded");
          
          if (tokens.length > 0) {
            debugLog(\`Found \${tokens.length} tokens to explain\`);
          } else {
            debugLog("No tokens available");
          }
          
          // Force binding click handlers explicitly
          bindClickHandlers();
        };
        
        // Explicitly bind click handlers
        function bindClickHandlers() {
          debugLog("Binding click handlers");
          
          // Play button
          if (explainBtn) {
            explainBtn.onclick = function() {
              debugLog("Play button clicked");
              startPlayback();
            };
          }
          
          // Stop button
          if (stopBtn) {
            stopBtn.onclick = function() {
              debugLog("Stop button clicked");
              stopPlayback();
            };
          }
          
          // Manual analyze button
          if (manualAnalyzeBtn) {
            manualAnalyzeBtn.onclick = function() {
              debugLog("Manual analyze clicked");
              manualAnalyzeBtn.disabled = true;
              manualAnalyzeBtn.textContent = "Analyzing...";
              window.location.reload();
            };
          }
          
          // Label click handlers
          document.querySelectorAll('.explanation-label').forEach(function(label) {
            label.onclick = function() {
              const index = this.getAttribute('data-index');
              debugLog(\`Label clicked: index=\${index}\`);
              
              if (index) {
                playAudio(parseInt(index));
              }
            };
          });
        }
        
        // Update the script section with a simpler approach for sequential audio playback:

        // Function to play the next audio in sequence
        function playNext() {
          // Check if we're still in playing mode
          if (!isPlaying) {
            debugLog("Playback has been stopped, not continuing sequence");
            return;
          }
          
          // Check if we've reached the end
          if (currentPlayingIndex >= tokens.length - 1) {
            debugLog("Playback complete - reached end of tokens");
            stopPlayback();
            statusElement.textContent = "Explanation complete";
            return;
          }
          
          // Increment to next audio
          currentPlayingIndex++;
          
          // Play this audio
          debugLog(\`Playing next audio \${currentPlayingIndex} in sequence\`);
          playAudio(currentPlayingIndex, true);
        }
        
        // Function to play a specific audio without replacing elements
        function playAudio(index, isSequence = false) {
          // Get the audio element
          const audio = document.getElementById(\`audio-\${index}\`);
          
          if (!audio) {
            debugLog(\`Audio element not found for index \${index}\`);
            if (isSequence) {
              setTimeout(playNext, 100);
            }
            return;
          }
          
          debugLog(\`Got audio element for index \${index}\`);
          
          // Reset all highlights
          document.querySelectorAll('.explanation-label').forEach(label => {
            label.classList.remove('active');
          });
          
          // Highlight current label
          const label = document.querySelector(\`.explanation-label[data-index="\${index}"]\`);
          if (label) {
            label.classList.add('active');
            statusElement.textContent = \`Explaining: \${tokens[index]?.token || "unknown"}\`;
          }
          
          // First pause all playing audio
          document.querySelectorAll('audio').forEach(a => {
            try {
              a.pause();
            } catch (e) {
              // Ignore errors when pausing
            }
          });
          
          // Remove existing handlers first
          audio.onended = null;
          audio.onerror = null;
          audio.oncanplaythrough = null;
          
          // Variable to ensure we only trigger next audio once
          let audioCompleted = false;
          
          // Set up the onended handler
          if (isSequence) {
            audio.onended = function() {
              if (audioCompleted) return; // Prevent multiple calls
              
              debugLog(\`Audio \${index} ended naturally, moving to next\`);
              audioCompleted = true;
              
              // Move to next audio after a small delay
              setTimeout(playNext, 500);
            };
          } else {
            audio.onended = function() {
              debugLog(\`Individual audio \${index} ended\`);
              
              // Clear highlight
              if (label) {
                label.classList.remove('active');
              }
              
              statusElement.textContent = "Click the respective labels to hear explanations";
            };
          }
          
          // Error handler
          audio.onerror = function(e) {
            if (audioCompleted) return; // Prevent multiple calls
            
            debugLog(\`Error playing audio \${index}: \${e}\`);
            audioCompleted = true;
            
            if (isSequence) {
              setTimeout(playNext, 100);
            } else {
              statusElement.textContent = "Error playing audio";
              if (label) {
                label.classList.remove('active');
              }
            }
          };
          
          // Safety timeout
          const safetyTimeout = setTimeout(() => {
            if (!audioCompleted && isPlaying && isSequence) {
              debugLog(\`Safety timeout for audio \${index}, moving to next\`);
              audioCompleted = true;
              playNext();
            }
          }, 100000); // 100 second safety timeout
          
          // Now try to play the audio
          try {
            // Reset and prepare for playback
            audio.pause();
            audio.currentTime = 0;
            
            // First load the audio
            audio.load();
            
            debugLog(\`Starting to load audio \${index}\`);
            
            // Play the audio once it can play through
            audio.oncanplaythrough = function() {
              if (audioCompleted) return; // Don't play if we've already moved on
              
              debugLog(\`Audio \${index} can play through, playing now\`);
              
              // Remove the event handler to prevent duplicate calls
              audio.oncanplaythrough = null;
              
              try {
                const playPromise = audio.play();
                
                if (playPromise !== undefined) {
                  playPromise.then(() => {
                    debugLog(\`Audio \${index} started playing successfully\`);
                  }).catch(e => {
                    if (audioCompleted) return;
                    
                    debugLog(\`Error in play promise: \${e}\`);
                    audioCompleted = true;
                    clearTimeout(safetyTimeout);
                    
                    if (isSequence) {
                      setTimeout(playNext, 100);
                    }
                  });
                }
              } catch (e) {
                if (audioCompleted) return;
                
                debugLog(\`Exception playing audio: \${e}\`);
                audioCompleted = true;
                clearTimeout(safetyTimeout);
                
                if (isSequence) {
                  setTimeout(playNext, 100);
                }
              }
            };
            
            // In case oncanplaythrough doesn't fire after a while, try to play anyway
            setTimeout(() => {
              if (!audioCompleted && audio.oncanplaythrough !== null) {
                debugLog(\`oncanplaythrough didn't fire for \${index}, trying to play anyway\`);
                audio.oncanplaythrough = null; // Remove the handler
                
                try {
                  const playPromise = audio.play();
                  
                  if (playPromise !== undefined) {
                    playPromise.then(() => {
                      debugLog(\`Forced play for audio \${index} succeeded\`);
                    }).catch(e => {
                      debugLog(\`Forced play failed: \${e}\`);
                      
                      if (!audioCompleted && isSequence) {
                        audioCompleted = true;
                        clearTimeout(safetyTimeout);
                        setTimeout(playNext, 100);
                      }
                    });
                  }
                } catch (e) {
                  debugLog(\`Exception in forced play: \${e}\`);
                  
                  if (!audioCompleted && isSequence) {
                    audioCompleted = true;
                    clearTimeout(safetyTimeout);
                    setTimeout(playNext, 100);
                  }
                }
              }
            }, 2000); // Wait 2 seconds for oncanplaythrough before forcing play
            
          } catch (e) {
            debugLog(\`General exception in audio playback: \${e}\`);
            
            if (!audioCompleted && isSequence) {
              audioCompleted = true;
              clearTimeout(safetyTimeout);
              setTimeout(playNext, 100);
            }
          }
        }
        
        // Updated startPlayback function - much simpler now
        function startPlayback() {
          debugLog("Starting playback sequence");
          
          // Make sure we have audio elements
          if (tokens.length === 0) {
            statusElement.textContent = "No explanation tokens available";
            return;
          }
          
          // Stop any playing audio
          stopPlayback();
          
          // Reset state
          isPlaying = true;
          currentPlayingIndex = -1;
          
          // Update UI
          explainBtn.disabled = true;
          stopBtn.disabled = false;
          statusElement.textContent = "Starting explanation...";
          
          // Start playback
          debugLog("Initiating playback sequence");
          playNext();
        }
        
        // Updated stopPlayback function
        function stopPlayback() {
          debugLog("Stopping all playback");
          
          // Stop all audio
          document.querySelectorAll('audio').forEach(function(audio) {
            try {
              audio.onended = null; 
              audio.onerror = null;
              audio.oncanplaythrough = null;
              audio.pause();
              audio.currentTime = 0;
            } catch (e) {
              debugLog(\`Error stopping audio: \${e}\`);
            }
          });
          
          // Reset state
          isPlaying = false;
          
          // Reset UI
          document.querySelectorAll('.explanation-label').forEach(label => {
            label.classList.remove('active');
          });
          
          explainBtn.disabled = false;
          stopBtn.disabled = true;
          statusElement.textContent = "Explanation stopped";
        }
        
        // Bind handlers immediately
        bindClickHandlers();
      </script>
  </body>
  </html>`;
}

// Export the OpenAI client and explanation function for use in the extension
export { openai, getCodeExplanation };