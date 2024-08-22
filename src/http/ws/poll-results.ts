import { FastifyInstance } from "fastify";
import { voting } from "../../utils/voting-pub-sub";
import z from "zod";

// export async function pollResult(app: FastifyInstance) {
//   app.get("/polls/:poll_id/results", { websocket: true }, (connection, req) => {
//     connection.socket.on("message", (message: string) => {
//       connection.socket.send("You sent:" + message);
//       console.log("Aqui");
//     });
//   });
// }

export async function pollResult(app: FastifyInstance) {
  app.get(
    "/polls/:poll_id/results",
    { websocket: true },
    async (socket, req) => {
      const votePollParamns = z.object({
        poll_id: z.string().uuid(),
      });

      const { poll_id } = votePollParamns.parse(req.params);
      voting.subscribe(poll_id, (message) => {
        socket.send(JSON.stringify(message));
      });
      // Quando está rota for chamada, ela increvera apenas nas mensagens publicadas no canal com o ID da enquete (poll_id)
      // Evento para receber mensagens do cliente
      socket.on("message", (message) => {
        socket.send("You sent: " + message);
      });

      // Evento para tratar fechamento da conexão
      //   connection.socket.on("close", (code: number, reason: string) => {
      //     console.log("WebSocket closed with code:", code, "and reason:", reason);
      //   });
    }
  );
}
//Pub/Sub- Publish and Subscribers - Patern muito utilizado em aplicações que lidam com eventos (ações na aplicação).
//
