import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DearFuture } from "../target/types/dear_future";
import { PublicKey, SystemProgram } from "@solana/web3.js";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DearFuture as Program<DearFuture>;
  const wallet = provider.wallet as anchor.Wallet;

  console.log("Program ID:", program.programId.toString());
  console.log("Wallet address:", wallet.publicKey.toString());

  // Get PDA for config
  const [configPda, configBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  console.log("Config PDA:", configPda.toString());
  console.log("Config bump:", configBump);

  try {
    // Check if config already exists
    const existingConfig = await program.account.config.fetch(configPda);
    console.log("Config already exists:", existingConfig);
    console.log("Authority:", existingConfig.authority.toString());
    console.log("Total capsules:", existingConfig.totalCapsules.toNumber());
    console.log("Version:", existingConfig.version);
    return;
  } catch (error) {
    console.log("Config doesn't exist yet, initializing...");
  }

  try {
    // Initialize config
    console.log("Initializing config...");
    const tx = await program.methods
      .initializeConfig()
      .accountsPartial({
        config: configPda,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Config initialized successfully!");
    console.log("Transaction signature:", tx);

    // Fetch and display the initialized config
    const configAccount = await program.account.config.fetch(configPda);
    console.log("\n📋 Config details:");
    console.log("Authority:", configAccount.authority.toString());
    console.log("Total capsules:", configAccount.totalCapsules.toNumber());
    console.log("Version:", configAccount.version);

  } catch (error) {
    console.error("❌ Failed to initialize config:", error);
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
