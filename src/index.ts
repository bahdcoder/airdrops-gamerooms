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

  const tokens = [phaseOne.publicKey, phaseTwo.publicKey, phaseThree.publicKey];
  const wallets: [PublicKey, number][][] = [
    parsePhaseOneWalletsAndAmounts(),
    parsePhaseOneWalletsAndAmounts(),
    parsePhaseThreeWalletsAndAmounts(),
  ];

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    const walletsList = wallets[index];

    logger.info(
      `Begin airdrop of Phase ${index + 1} ${token.toBase58()} to ${
        walletsList.length
      } wallets.`
    );

    for (let index = 0; index < walletsList.length; index++) {
      const [wallet, amount] = walletsList[index];

      const spinner = logger.await(
        `Airdropping ${amount} token${
          amount > 1 ? "s" : ""
        } to ${wallet.toBase58()}`
      );

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

      spinner.stop();
    }
  }
}

main();
