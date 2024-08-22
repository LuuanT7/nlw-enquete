import z from "zod";
import { prisma } from "../../lib/prisma";
import { randomUUID } from "crypto";
import { FastifyInstance } from "fastify";
import { redis } from "../../lib/redis";
import { voting } from "../../utils/voting-pub-sub";

export async function votePoll(app: FastifyInstance) {
  app.post("/polls/:poll_id/votes", async (request, reply) => {
    const voteOnPollBody = z.object({
      poll_option_id: z.string().uuid(),
    });

    const votePollParamns = z.object({
      poll_id: z.string().uuid(),
    });

    const { poll_id } = votePollParamns.parse(request.params);
    const { poll_option_id } = voteOnPollBody.parse(request.body);

    let { session_id } = request.cookies;

    if (session_id) {
      const userPreviousVoteOnPoll = await prisma.vote.findUnique({
        where: {
          session_id_poll_id: {
            session_id,
            poll_id,
          },
        },
      });
      if (
        userPreviousVoteOnPoll &&
        userPreviousVoteOnPoll.poll_option_id !== poll_option_id
      ) {
        await prisma.vote.delete({
          where: { id: userPreviousVoteOnPoll.id },
        });
        const votes = await redis.zincrby(
          poll_id,
          -1,
          userPreviousVoteOnPoll.poll_option_id
        );
        voting.publish(poll_id, {
          poll_option_id: userPreviousVoteOnPoll.poll_option_id,
          votes: Number(votes),
        });
      } else if (userPreviousVoteOnPoll) {
        return reply.status(400).send("You already voted on this poll.");
      }
    }

    if (!session_id) {
      session_id = randomUUID();

      reply.setCookie("session_id", session_id, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        signed: true, // nao pode trocar o id do cookie manualmente
        httpOnly: true, //somente back end pode ser as infos de cookie
      });
    }

    await prisma.vote.create({
      data: {
        poll_option_id,
        session_id,
        poll_id,
      },
    });

    const votes = await redis.zincrby(poll_id, 1, poll_option_id);
    // primeiro parametro será o local em que o rank será criado
    // segundo parametro será o valor de cada voto, de um em um, ou de dois em dois por exemplo
    // terceiro parametro será o objeto que participará dos ranks, uma das opções de voto no caso

    voting.publish(poll_id, { poll_option_id, votes: Number(votes) });

    return reply.status(201).send();
  });
}
