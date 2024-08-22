import z from "zod";
import { prisma } from "../../lib/prisma";
import { FastifyInstance } from "fastify";
import { redis } from "../../lib/redis";

export async function getPoll(app: FastifyInstance) {
  app.get("/polls/:poll_id", async (request, reply) => {
    const getPollParams = z.object({
      poll_id: z.string().uuid(),
    });

    const { poll_id } = getPollParams.parse(request.params);

    const poll = await prisma.poll.findUnique({
      where: {
        id: poll_id,
      },
      include: {
        options: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!poll) {
      return reply.status(400).send({ message: "Poll not found." });
    }

    const result = await redis.zrange(poll_id, 0, -1, "WITHSCORES");
    // primeiro parametro é a chave de onde será retornado o rank
    // o segundo e o terceiro são as posições em que será obtido os ranks. O 0,-1 quer dizer que pegará todos as opções e ranks. Caso queira pegar top tres por exemplo, ficará 0, 3
    //Ultimo parametro será como ele trará a pontuação, ordenação e tipo de pontos. Se n tiver o withscore ele trará somente as opções, sem os pontos

    // Metodo reduce é um metodo javascript para manipular um array
    // esta função inicia o array como objeto e passa os parametros que será utilizada no objeto
    const votes = result.reduce((obj, line, index) => {
      // o if significa: Se o indice for par ele será o id da opção e o proximo elemento será o score
      if (index % 2 === 0) {
        const score = result[index + 1];
        // mescla o indice par com o impar {id: score}
        Object.assign(obj, { [line]: Number(score) });
      }
      // reduce sempre retornará o objeto
      return obj;
    }, {} as Record<string, number>);

    // Record<string, number> indica que será tranforsmado o array em um objeto com o reduce, onde recebe dois parametros, a chave e o valor
    console.log("score", votes);

    return reply.status(201).send({
      poll: {
        id: poll.id,
        title: poll.title,
        options: poll.options.map((option) => {
          return {
            id: option.id,
            title: option.title,
            score: option.id in votes ? votes[option.id] : 0,
          };
        }),
      },
    });
  });
}
