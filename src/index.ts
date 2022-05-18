import { createClient } from "redis";
import { logger } from "@poppinss/cliui";
import { PublicKey } from "@solana/web3.js";
import { getConnection, getWallets } from "./helpers";

import whitelist from "./data/whitelist.json";
import tokenPerOwner from "./data/tokenPerOwner.json";
import {
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  transfer,
} from "@solana/spl-token";

const SUCCESS_KEY = "airdrops:success";
const FAILURE_KEY = "airdrops:failures";

function parsePhaseOneWalletsAndAmounts(): [PublicKey, number][] {
  return tokenPerOwner.map((owner) => [
    new PublicKey(owner.owner),
    owner.total,
  ]);
}

function parsePhaseThreeWalletsAndAmounts(): [PublicKey, number][] {
  return whitelist.map((wl) => [new PublicKey(wl.wallet), 1]);
}

async function main() {
  const { authority, phaseOne, phaseTwo, phaseThree } = getWallets();
  const { connection } = getConnection();
  const client = createClient();

  await client.connect();

  const tokens = [phaseOne.publicKey, phaseTwo.publicKey, phaseThree.publicKey];
  const wallets: [PublicKey, number][][] = [
    parsePhaseOneWalletsAndAmounts(),
    parsePhaseOneWalletsAndAmounts(),
    parsePhaseThreeWalletsAndAmounts(),
  ];

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    const walletsList = wallets[index];

    const successfulAirdrops = await client.sMembers(
      `${SUCCESS_KEY}:${token.toBase58()}`
    );

    logger.info(
      `Begin airdrop of Phase ${index + 1} ${token.toBase58()} to ${
        walletsList.length
      } wallets.`
    );

    for (let index = 0; index < walletsList.length; index++) {
      const [wallet, amount] = walletsList[index];

      if (successfulAirdrops.includes(wallet.toBase58())) {
        logger.info(
          `Skipping airdrop of ${amount} tokens to ${wallet.toBase58()}`
        );
        continue;
      }

      const spinner = logger.await(
        `Airdropping ${amount} token${
          amount > 1 ? "s" : ""
        } to ${wallet.toBase58()}`
      );

      try {
        const source = await getAssociatedTokenAddress(
          token,
          authority.publicKey
        );

        const destination = await getOrCreateAssociatedTokenAccount(
          connection,
          authority,
          token,
          wallet
        );

        await transfer(
          connection,
          authority,
          source,
          destination.address,
          authority.publicKey,
          amount
        );

        logger.success(
          `Successfully airdropped ${amount} token${
            amount > 1 ? "s" : ""
          } to ${wallet.toBase58()}`
        );

        await client.sAdd(
          `${SUCCESS_KEY}:${token.toBase58()}`,
          wallet.toBase58()
        );
      } catch (error: any) {
        logger.info(
          `Error airdropping ${amount} to ${wallet.toBase58()}: ${
            error?.message
          } ${error?.toString?.()}`
        );
        await client.sAdd(
          `${FAILURE_KEY}:${token.toBase58()}`,
          wallet.toBase58()
        );
      }

      spinner.stop();
    }
  }

  process.exit(0);
}

main();
