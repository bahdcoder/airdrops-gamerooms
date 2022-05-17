import Fs from "fs";
import Path from "path";
import {
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { Connection, Keypair } from "@solana/web3.js";

export function getEnv() {
  return {
    clusterUrl:
      "https://black-shy-sound.solana-mainnet.quiknode.pro/7a40627b7c111ebe8366dff3a957407af84f74ca/",
  };
}

export function getWallets() {
  function getKeyBuffer(name: string) {
    return Uint8Array.from(
      JSON.parse(
        Fs.readFileSync(
          Path.resolve(__dirname, "..", "wallets", name)
        ).toString()
      )
    );
  }

  return {
    authority: Keypair.fromSecretKey(getKeyBuffer("authority.json")),
    phaseOne: Keypair.fromSecretKey(
      getKeyBuffer("phase-1-jelly-holders-mint-wl-token.json")
    ),
    phaseTwo: Keypair.fromSecretKey(
      getKeyBuffer("phase-2-sol-holders-mint-wl-token.json")
    ),
    phaseThree: Keypair.fromSecretKey(
      getKeyBuffer("phase-3-sol-mint-wl-token.json")
    ),
  };
}

export function getConnection() {
  const { clusterUrl } = getEnv();

  const connection = new Connection(clusterUrl, {
    commitment: "finalized",
  });

  return {
    connection,
  };
}
