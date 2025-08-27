import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DearFuture } from "../target/types/dear_future";
import { PublicKey, SystemProgram, Connection, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

async function main() {
  // Set up connection to devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  // Load your wallet keypair - try multiple possible paths
  let walletKeypair: Keypair;
  try {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const keypairPath = path.join(homeDir!, ".config", "solana", "id.json");
    walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(fs.readFileSync(keypairPath, "utf-8")))
    );
  } catch (error) {
    console.error("Failed to load wallet keypair. Please ensure your Solana keypair exists at ~/.config/solana/id.json");
    process.exit(1);
  }
  
  // Set up provider
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(walletKeypair),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);
  
  // Load the program from the deployed IDL
  const programId = new PublicKey("88fRjJ3XvAHH1N6468YQd6xuSiPXUX2kyTeD4d3Yz8ng");
  
  // Load the IDL
  const idlPath = path.join(__dirname, "..", "target", "idl", "dear_future.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  
  // Create program instance - the program ID should be part of the provider
  const program = new Program(idl, provider) as Program<DearFuture>;
  
  console.log("Program ID:", program.programId.toString());
  console.log("Wallet address:", walletKeypair.publicKey.toString());
  
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
        authority: walletKeypair.publicKey,
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
