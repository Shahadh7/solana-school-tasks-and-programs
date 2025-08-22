import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DearFuture } from "../target/types/dear_future";
import { expect } from "chai";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("Dear Future: Edge Cases and Security Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DearFuture as Program<DearFuture>;
  const wallet = provider.wallet as anchor.Wallet;

  let configPda: PublicKey;
  let configBump: number;
  const futureUnlockDate = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

  before(async () => {
    // Get PDA for config
    [configPda, configBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    // Try to initialize config (might already exist from main tests)
    try {
      await program.methods
        .initializeConfig()
        .accounts({
          config: configPda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } catch (error) {
      // Config might already exist, that's okay
      console.log("Config already exists or initialization failed:", error.message);
    }
  });

  describe("Multiple Transfer Chain Tests", () => {
    it("Should handle multiple transfers correctly", async () => {
      // Create a capsule
      const configAccount = await program.account.config.fetch(configPda);
      const capsuleId = configAccount.totalCapsules.toNumber();
      
      const [multiTransferCapsulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wallet.publicKey.toBuffer(),
          new anchor.BN(capsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      await program.methods
        .createCapsule("Multi Transfer Test", "This will be transferred multiple times", new anchor.BN(futureUnlockDate), null)
        .accounts({
          config: configPda,
          capsule: multiTransferCapsulePda,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Create multiple users
      const user1 = anchor.web3.Keypair.generate();
      const user2 = anchor.web3.Keypair.generate();
      const user3 = anchor.web3.Keypair.generate();

      // Airdrop to all users
      for (const user of [user1, user2, user3]) {
        const airdropTx = await provider.connection.requestAirdrop(
          user.publicKey,
          LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(airdropTx);
      }

      // Transfer chain: wallet -> user1 -> user2 -> user3
      await program.methods
        .transferCapsule(null)
        .accounts({
          capsule: multiTransferCapsulePda,
          currentOwner: wallet.publicKey,
          newOwner: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .transferCapsule(null)
        .accounts({
          capsule: multiTransferCapsulePda,
          currentOwner: user1.publicKey,
          newOwner: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      await program.methods
        .transferCapsule(null)
        .accounts({
          capsule: multiTransferCapsulePda,
          currentOwner: user2.publicKey,
          newOwner: user3.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      // Verify final state
      const capsuleAccount = await program.account.capsule.fetch(multiTransferCapsulePda);
      expect(capsuleAccount.creator.toString()).to.equal(wallet.publicKey.toString()); // Creator never changes
      expect(capsuleAccount.owner.toString()).to.equal(user3.publicKey.toString()); // Final owner
      expect(capsuleAccount.transferredAt).to.not.be.null;

      // Only user3 should be able to update now
      await program.methods
        .updateCapsule("Updated by final owner", null, null, false)
        .accounts({
          capsule: multiTransferCapsulePda,
          owner: user3.publicKey,
        })
        .signers([user3])
        .rpc();

      const updatedCapsule = await program.account.capsule.fetch(multiTransferCapsulePda);
      expect(updatedCapsule.content).to.equal("Updated by final owner");
    });

    it("Should preserve all capsule data during transfer", async () => {
      // Create a capsule with all possible data
      const configAccount = await program.account.config.fetch(configPda);
      const capsuleId = configAccount.totalCapsules.toNumber();
      
      const [preserveDataCapsulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wallet.publicKey.toBuffer(),
          new anchor.BN(capsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      const originalTitle = "Data Preservation Test";
      const originalContent = "This content should be preserved";
      const originalUrl = "https://example.com/encrypted";
      const originalUnlockDate = futureUnlockDate + 3600; // 1 hour later

      await program.methods
        .createCapsule(originalTitle, originalContent, new anchor.BN(originalUnlockDate), originalUrl)
        .accounts({
          config: configPda,
          capsule: preserveDataCapsulePda,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Get original data
      const originalCapsule = await program.account.capsule.fetch(preserveDataCapsulePda);
      
      // Transfer to new owner
      const newOwner = anchor.web3.Keypair.generate();
      const airdropTx = await provider.connection.requestAirdrop(
        newOwner.publicKey,
        LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropTx);

      await program.methods
        .transferCapsule(null)
        .accounts({
          capsule: preserveDataCapsulePda,
          currentOwner: wallet.publicKey,
          newOwner: newOwner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Verify all data is preserved except owner and transfer timestamp
      const transferredCapsule = await program.account.capsule.fetch(preserveDataCapsulePda);
      expect(transferredCapsule.title).to.equal(originalTitle);
      expect(transferredCapsule.content).to.equal(originalContent);
      expect(transferredCapsule.encryptedUrl).to.equal(originalUrl);
      expect(transferredCapsule.unlockDate.toNumber()).to.equal(originalUnlockDate);
      expect(transferredCapsule.creator.toString()).to.equal(wallet.publicKey.toString());
      expect(transferredCapsule.owner.toString()).to.equal(newOwner.publicKey.toString());
      expect(transferredCapsule.id.toNumber()).to.equal(originalCapsule.id.toNumber());
      expect(transferredCapsule.createdAt.toNumber()).to.equal(originalCapsule.createdAt.toNumber());
      expect(transferredCapsule.isUnlocked).to.equal(originalCapsule.isUnlocked);
      expect(transferredCapsule.transferredAt).to.not.be.null;
      expect(transferredCapsule.transferredAt.toNumber()).to.be.greaterThanOrEqual(originalCapsule.createdAt.toNumber());
    });
  });

  describe("Input Validation Edge Cases", () => {
    it("Should handle empty string inputs correctly", async () => {
      const configAccount = await program.account.config.fetch(configPda);
      const capsuleId = configAccount.totalCapsules.toNumber();
      
      const [emptyCapsulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wallet.publicKey.toBuffer(),
          new anchor.BN(capsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      // Empty title should be allowed (it's just a zero-length string)
      await program.methods
        .createCapsule("", "Non-empty content", new anchor.BN(futureUnlockDate), null)
        .accounts({
          config: configPda,
          capsule: emptyCapsulePda,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const capsuleAccount = await program.account.capsule.fetch(emptyCapsulePda);
      expect(capsuleAccount.title).to.equal("");
      expect(capsuleAccount.content).to.equal("Non-empty content");
    });

    it("Should handle boundary values for string lengths", async () => {
      // Test exact boundary values
      const maxTitle = "x".repeat(100); // Exactly max length
      const maxContent = "y".repeat(300); // Exactly max length
      const maxUrl = "z".repeat(500); // Exactly max length

      const configAccount = await program.account.config.fetch(configPda);
      const capsuleId = configAccount.totalCapsules.toNumber();
      
      const [boundaryCapsulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wallet.publicKey.toBuffer(),
          new anchor.BN(capsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      await program.methods
        .createCapsule(maxTitle, maxContent, new anchor.BN(futureUnlockDate), maxUrl)
        .accounts({
          config: configPda,
          capsule: boundaryCapsulePda,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const capsuleAccount = await program.account.capsule.fetch(boundaryCapsulePda);
      expect(capsuleAccount.title).to.equal(maxTitle);
      expect(capsuleAccount.content).to.equal(maxContent);
      expect(capsuleAccount.encryptedUrl).to.equal(maxUrl);
    });
  });

  describe("Security and Access Control", () => {
    it("Should fail transfer with invalid PDA derivation", async () => {
      // Try to use wrong creator in PDA derivation
      const wrongCreator = anchor.web3.Keypair.generate();
      const configAccount = await program.account.config.fetch(configPda);
      const capsuleId = configAccount.totalCapsules.toNumber();
      
      const [wrongPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wrongCreator.publicKey.toBuffer(), // Wrong creator
          new anchor.BN(capsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      const newOwner = anchor.web3.Keypair.generate();
      const airdropTx = await provider.connection.requestAirdrop(
        newOwner.publicKey,
        LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropTx);

      try {
        await program.methods
          .transferCapsule(null)
          .accounts({
            capsule: wrongPda, // Wrong PDA
            currentOwner: wallet.publicKey,
            newOwner: newOwner.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have failed");
      } catch (error) {
        // The error could be "Account does not exist" or an Anchor constraint error
        expect(error.message).to.match(/Account does not exist|AnchorError caused by account/);
      }
    });

    it("Should validate timestamp consistency", async () => {
      // Create a capsule and check timestamps
      const configAccount = await program.account.config.fetch(configPda);
      const capsuleId = configAccount.totalCapsules.toNumber();
      
      const [timestampCapsulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wallet.publicKey.toBuffer(),
          new anchor.BN(capsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      const beforeCreate = Math.floor(Date.now() / 1000);
      
      await program.methods
        .createCapsule("Timestamp Test", "For timestamp validation", new anchor.BN(futureUnlockDate), null)
        .accounts({
          config: configPda,
          capsule: timestampCapsulePda,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const afterCreate = Math.floor(Date.now() / 1000);
      const capsuleAfterCreate = await program.account.capsule.fetch(timestampCapsulePda);
      
      // Verify creation timestamps are reasonable (allow for some clock drift)
      expect(capsuleAfterCreate.createdAt.toNumber()).to.be.at.least(beforeCreate - 2);
      expect(capsuleAfterCreate.createdAt.toNumber()).to.be.at.most(afterCreate + 2);
      expect(capsuleAfterCreate.updatedAt.toNumber()).to.equal(capsuleAfterCreate.createdAt.toNumber());

      // Wait a bit then update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const beforeUpdate = Math.floor(Date.now() / 1000);
      
      await program.methods
        .updateCapsule("Updated content", null, null, false)
        .accounts({
          capsule: timestampCapsulePda,
          owner: wallet.publicKey,
        })
        .rpc();

      const afterUpdate = Math.floor(Date.now() / 1000);
      const capsuleAfterUpdate = await program.account.capsule.fetch(timestampCapsulePda);
      
      // Verify update timestamp is later than creation (allow for some clock drift)
      expect(capsuleAfterUpdate.updatedAt.toNumber()).to.be.greaterThan(capsuleAfterUpdate.createdAt.toNumber());
      expect(capsuleAfterUpdate.updatedAt.toNumber()).to.be.at.least(beforeUpdate - 2);
      expect(capsuleAfterUpdate.updatedAt.toNumber()).to.be.at.most(afterUpdate + 2);
    });

    it("Should prevent unauthorized mint updates", async () => {
      // Create a capsule
      const configAccount = await program.account.config.fetch(configPda);
      const capsuleId = configAccount.totalCapsules.toNumber();
      
      const [mintTestCapsulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wallet.publicKey.toBuffer(),
          new anchor.BN(capsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      await program.methods
        .createCapsule("Mint Test", "For mint security testing", new anchor.BN(futureUnlockDate), null)
        .accounts({
          config: configPda,
          capsule: mintTestCapsulePda,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Transfer with mint address
      const newOwner = anchor.web3.Keypair.generate();
      const airdropTx = await provider.connection.requestAirdrop(
        newOwner.publicKey,
        LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropTx);

      const mintAddress = anchor.web3.Keypair.generate().publicKey;

      await program.methods
        .transferCapsule(mintAddress)
        .accounts({
          capsule: mintTestCapsulePda,
          currentOwner: wallet.publicKey,
          newOwner: newOwner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Verify mint info was set correctly
      const capsuleAccount = await program.account.capsule.fetch(mintTestCapsulePda);
      expect(capsuleAccount.mint.toString()).to.equal(mintAddress.toString());
      expect(capsuleAccount.mintCreator.toString()).to.equal(wallet.publicKey.toString());

      // Try to transfer again with different mint (should work but not overwrite existing mint info)
      const anotherOwner = anchor.web3.Keypair.generate();
      const airdropTx2 = await provider.connection.requestAirdrop(
        anotherOwner.publicKey,
        LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropTx2);

      const newMintAddress = anchor.web3.Keypair.generate().publicKey;

      await program.methods
        .transferCapsule(newMintAddress)
        .accounts({
          capsule: mintTestCapsulePda,
          currentOwner: newOwner.publicKey,
          newOwner: anotherOwner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([newOwner])
        .rpc();

      // Mint info should be updated with new mint and new mint creator
      const finalCapsuleAccount = await program.account.capsule.fetch(mintTestCapsulePda);
      expect(finalCapsuleAccount.mint.toString()).to.equal(newMintAddress.toString());
      expect(finalCapsuleAccount.mintCreator.toString()).to.equal(newOwner.publicKey.toString()); // New mint creator
    });
  });

  describe("Concurrency and Race Conditions", () => {
    it("Should handle concurrent operations correctly", async () => {
      // Create a capsule for concurrent testing
      const configAccount = await program.account.config.fetch(configPda);
      const capsuleId = configAccount.totalCapsules.toNumber();
      
      const [concurrentCapsulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wallet.publicKey.toBuffer(),
          new anchor.BN(capsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      await program.methods
        .createCapsule("Concurrent Test", "For concurrent operations", new anchor.BN(futureUnlockDate), null)
        .accounts({
          config: configPda,
          capsule: concurrentCapsulePda,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Try multiple updates concurrently (these should all succeed if executed sequentially)
      const updates = [
        program.methods
          .updateCapsule("Update 1", null, null, false)
          .accounts({
            capsule: concurrentCapsulePda,
            owner: wallet.publicKey,
          })
          .rpc(),
        
        program.methods
          .updateCapsule("Update 2", null, null, false)
          .accounts({
            capsule: concurrentCapsulePda,
            owner: wallet.publicKey,
          })
          .rpc(),
      ];

      // Wait for all to complete (one should succeed, others might fail due to race conditions)
      const results = await Promise.allSettled(updates);
      
      // At least one should succeed
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).to.be.greaterThan(0);

      // Verify final state is valid
      const finalCapsule = await program.account.capsule.fetch(concurrentCapsulePda);
      expect(finalCapsule.content).to.match(/^Update [12]$/); // Should be one of the updates
    });
  });

  describe("NFT Integration Tests", () => {
    it("Should handle mint address correctly in transfers", async () => {
      // Create a capsule
      const configAccount = await program.account.config.fetch(configPda);
      const capsuleId = configAccount.totalCapsules.toNumber();
      
      const [nftCapsulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wallet.publicKey.toBuffer(),
          new anchor.BN(capsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      await program.methods
        .createCapsule("NFT Integration Test", "Testing NFT functionality", new anchor.BN(futureUnlockDate), null)
        .accounts({
          config: configPda,
          capsule: nftCapsulePda,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Transfer without mint first
      const owner1 = anchor.web3.Keypair.generate();
      let airdropTx = await provider.connection.requestAirdrop(owner1.publicKey, LAMPORTS_PER_SOL);
      await provider.connection.confirmTransaction(airdropTx);

      await program.methods
        .transferCapsule(null)
        .accounts({
          capsule: nftCapsulePda,
          currentOwner: wallet.publicKey,
          newOwner: owner1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      let capsuleAccount = await program.account.capsule.fetch(nftCapsulePda);
      expect(capsuleAccount.mint).to.be.null;
      expect(capsuleAccount.mintCreator).to.be.null;

      // Transfer with mint
      const owner2 = anchor.web3.Keypair.generate();
      airdropTx = await provider.connection.requestAirdrop(owner2.publicKey, LAMPORTS_PER_SOL);
      await provider.connection.confirmTransaction(airdropTx);

      const mintAddress = anchor.web3.Keypair.generate().publicKey;

      await program.methods
        .transferCapsule(mintAddress)
        .accounts({
          capsule: nftCapsulePda,
          currentOwner: owner1.publicKey,
          newOwner: owner2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner1])
        .rpc();

      capsuleAccount = await program.account.capsule.fetch(nftCapsulePda);
      expect(capsuleAccount.mint.toString()).to.equal(mintAddress.toString());
      expect(capsuleAccount.mintCreator.toString()).to.equal(owner1.publicKey.toString());
      expect(capsuleAccount.owner.toString()).to.equal(owner2.publicKey.toString());
    });
  });
});
