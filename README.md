## CodeXplain

### IMPORTANT
You will need some environment variables (API Keys and endpoint var) to get this extension running locally, if you are a hackathon judge, reach out to me at akshatbatra25@gmail.com and I will be happy to quickly provide you the same.

Description of required environment variables: 

`IBM_ENDPOINT`: API Endpoint URL for IBM Granite 3.3 8B Instruct LLM. (Tip: IBM Granite is also available to use on Nvidia NIM platform apart from IBM Cloud)

`IBM_KEY`: API Key for the IBM LLM.

`AZURE_SPEECH_KEY`: Azure Cognitive Services Speech Key

`AZURE_SPEECH_REGION`: Azure Cognitive Services Region Name

#### Instructions:

1.) In the project root directory, run `npm install`.

2.) Navigate to ai-server folder in your terminal and run `fastify start server.js`.

3.) Navigate to `src/extension.ts` in VS code and press F5 to experience the extension once you have set your own environment variables or the ones received from me.
