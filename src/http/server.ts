import fastify from "fastify";

import { createPoll } from "./routes/create-poll";
import { getPoll } from "./routes/get-poll";
import { votePoll } from "./routes/vote-poll";
import cookie from "@fastify/cookie";
import fastifyWebsocket from "@fastify/websocket";
import { pollResult } from "./ws/poll-results";

const app = fastify();

app.register(cookie, {
  secret: "my-secret",
  hook: "onRequest",
  parseOptions: {},
});

app.register(fastifyWebsocket);

app.register(createPoll);
app.register(getPoll);
app.register(votePoll);
app.register(pollResult);

app.listen({ port: 3333 }).then(() => {
  console.log("HTTP Server Running ");
});
