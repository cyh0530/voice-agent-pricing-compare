i'm building a voice agent and deciding if i should use livekit or pipecat. build a website so that i can do detailed pricing comparison between the two.

## Goal

I want to know if I should do pipecat self hosted, pipecat cloud, livekit self hosted, livekit cloud at early stage and at large scale. Such as 1000, 5000, 10k, 50k, 100k mins / month

## Tech stack

- Pure frontend codebase, no backend api logic.
- Use react, vite, tanstack start, shadcn, tailwind to build the website.

## Requirement

- A line chart to compare different options. X axis is the usage minutes per month, y axis is cost.
- a table/column like https://www.apple.com/iphone/compare/ compare page so user can choose what option to use in the line chart comparison. have some rows so user can dropdown select platform (pipecat vs livekit), hosting option (cloud vs self host), pipeline (sts vs stt-llm-tts), stt (deepgram, cartesia, etc), llm, tts,calls (audio only, audio + video), recording (audio only, audio + video)
- some slider to easily know the monthly cost at N minutes, recording (audio only, audio/video, no recording).
  - When hover on each cell, it should show a popover to explain how the the price is calculated
- the pipeline can be either (1) speech to speech model such as open ai realtime or gemini live (2) sst-llm-tts pipeline. Make sure the models are available at livekit and pipecat platform supported officially.
- Each column represent one stack and user can add up to 8 stack to compare at the same time
- The url in the browser will reflect the current comparison so user can easily share to others without the end users changing config again.
- At the end of the table, also have a row as a sidenote to list out the restriction. example - livekit ship plan can only have 2 agent deployments
- For self hosting, we will use the azure stack to host the server, i'm not sure if we should use app services or kubernetes, help me determine which one is more appropriate.
- The app will be hosted as a github page.

## Data

### Livekit

https://livekit.io/pricing

Since livekit uses subscription model, make sure the price calculation consider the best plan to have the lowest cost. Ignore enterprise since there's no data available. Each plan has included usage + pay as you go

Livekit has built in inference cost,
https://livekit.io/pricing/inference

### Pipecat

Use agent-1x for Pipecat Hosting. Daily WebRTC as the transport.

Daily Video has volume discount, make sure the calculation reflects the discount

- https://www.daily.co/pricing/video-sdk/
- https://www.daily.co/pricing/pipecat-cloud/
- https://www.daily.co/pricing/webrtc-infrastructure/

### Provider

For Speech to text, only include assemblyAI, Cartesia, Deepgram, and Elevenlabs for comparison
For llm, only include the latest model from openai and gemini, such as gpt-5.2 and gemini 3.0.
For text to speech, only include cartesia and elevenlabs.
Some provider uses various pricing subscription, make sure to use the best plan option based on the usage to have the lowest cost.

#### Cartesia

https://cartesia.ai/pricing

#### Elevenlabs

https://elevenlabs.io/pricing

#### AssemblyAI

https://www.assemblyai.com/pricing

#### Deepgram

https://deepgram.com/pricing
