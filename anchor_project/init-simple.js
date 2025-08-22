const { PublicKey } = require("@solana/web3.js");

// Calculate the config PDA for the new program ID
const programId = new PublicKey("4UHykQD4g6ANrhZXYnKtECq9dq4HxV3JbFCkkRE4krX5");
const [configPda, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from("config")],
  programId
);

console.log("New Program ID:", programId.toString());
console.log("Config PDA:", configPda.toString());
console.log("Bump:", bump);
