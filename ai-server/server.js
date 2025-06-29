'use strict'

const sdk = require('microsoft-cognitiveservices-speech-sdk');
const { PassThrough } = require('stream');

// Get Azure credentials from environment variables for security
const SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const SPEECH_REGION = process.env.AZURE_SPEECH_REGION;

module.exports = async function(fastify, opts) {

  // Configure CORS - allow both GET and POST
  fastify.register(require('@fastify/cors'), {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS']  // Allow POST and OPTIONS (for preflight)
  });

  var fs = require('fs'); 
  fastify.get('/', async (request, reply) => {
    const stream = fs.createReadStream('requestVoice.html')
    return reply.type('text/html').send(stream)
  });

  // Shared function to process TTS request
  async function processTtsRequest(text, request, reply) {
    if (!text) {
      reply.code(400).send({ error: 'Missing required text parameter' });
      return;
    }

    // Set up Azure Speech SDK
    const speechConfig = sdk.SpeechConfig.fromSubscription(SPEECH_KEY, SPEECH_REGION);
    
    // Configure speech synthesis options
    speechConfig.speechSynthesisVoiceName = "en-US-EmmaNeural";
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

    // Create our synthesizer
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
    
    // Create a PassThrough stream to pipe the audio data
    const audioStream = new PassThrough();
    
    // Set the appropriate headers for streaming audio
    reply
      .type('audio/mpeg')
      .header('Cache-Control', 'no-cache')
      .header('Transfer-Encoding', 'chunked')
    
    // Send the stream as the response
    reply.send(audioStream);
    
    return new Promise((resolve, reject) => {
      // Use events to handle audio data as it becomes available
      synthesizer.synthesisStarted = (s, e) => {
        console.log("Synthesis started");
      };
      
      // This callback gives us chunks of audio data
      synthesizer.synthesizing = (s, e) => {
        if (e.result.reason === sdk.ResultReason.SynthesizingAudio) {
          // Stream audio chunks as they arrive
          const chunk = Buffer.from(e.result.audioData);
          audioStream.write(chunk);
        }
      };
      
      synthesizer.synthesisCompleted = (s, e) => {
        console.log("Synthesis completed");
        synthesizer.close();
        audioStream.end(); // End the stream properly
        resolve();
      };
      
      synthesizer.synthesisCanceled = (s, e) => {
        console.log(`Synthesis canceled: ${e.errorDetails}`);
        synthesizer.close();
        audioStream.end(); // End the stream even on cancellation
        resolve();
      };
      /*
      // Handle client disconnect
      request.raw.on('close', () => {
        console.log('Client disconnected, stopping synthesis');
        synthesizer.close();
        audioStream.end();
        resolve();
      });
      */
      // Start synthesis
      console.log("text is", text);
      synthesizer.speakTextAsync(text);
    });
  }

  // GET endpoint for TTS
  fastify.get('/aiVoice', async (request, reply) => {
    try {
      const { text } = request.query;
      console.log("GET request with text:", text);
      await processTtsRequest(text, request, reply);
    } catch (error) {
      console.error(`Server error: ${error.message}`);
      reply.code(500).send({ error: 'Failed to generate speech' });
    }
  });

  // POST endpoint for TTS
  fastify.post('/aiVoice', async (request, reply) => {
    try {
      // Extract text from request body (JSON)
      const { text } = request.body;
      console.log("POST request with text:", text);
      await processTtsRequest(text, request, reply);
    } catch (error) {
      console.error(`Server error: ${error.message}`);
      reply.code(500).send({ error: 'Failed to generate speech' });
    }
  });
};

// Add this if you want to run it directly with Node.js
if (require.main === module) {
  const fastify = require('fastify')();
  fastify.register(module.exports);
  
  fastify.listen({ port: 3000, host: '0.0.0.0' }, (err) => {  // Change port to 3000
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log('TTS Server running on http://localhost:3000');
  });
}