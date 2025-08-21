import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DearFuture } from "../target/types/dear_future";
import { expect } from "chai";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("Dear Future: Capsules Management ", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DearFuture as Program<DearFuture>;
  const wallet = provider.wallet as anchor.Wallet;

  let configPda: PublicKey;
  let configBump: number;
  let capsulePda: PublicKey;
  let capsuleBump: number;

  let unlockedCapsulePda: PublicKey;
  let unlockedCapsuleID: number;

  //Test data
  const title = "My Future Capsule";
  const content = "This is a message to my future self.";
  const futureUnlockDate = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const pastUnlockDate = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

  before(async () => {
    // Get PDA for config
    [configPda, configBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

  });

  describe("Config Initialization", () => {
    it("Should initialize config successfully", async () => {
      const tx = await program.methods
        .initializeConfig()
        .accounts({
          config: configPda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const configAccount = await program.account.config.fetch(configPda);
      expect(configAccount.authority.toString()).to.equal(wallet.publicKey.toString());
      expect(configAccount.totalCapsules.toNumber()).to.equal(0);
      expect(configAccount.version).to.equal(1);
    });

    it("Should fail to initialize config twice", async () => {
      try {
        await program.methods
          .initializeConfig()
          .accounts({
            config: configPda,
            authority: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have failed");
      } catch (error) {
        expect(error.message).to.include("already in use");
      }
    });
  });

  describe("Capsule Creation", () => {
    it("Should create capsule successfully", async () => {
      // Get current total capsules count
      const configAccount = await program.account.config.fetch(configPda);
      const capsuleId = configAccount.totalCapsules.toNumber();

      // Derive capsule PDA
      [capsulePda, capsuleBump] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wallet.publicKey.toBuffer(),
          new anchor.BN(capsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      const tx = await program.methods
        .createCapsule(title, content, new anchor.BN(futureUnlockDate))
        .accounts({
          config: configPda,
          capsule: capsulePda,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Verify capsule was created correctly
      const capsuleAccount = await program.account.capsule.fetch(capsulePda);
      expect(capsuleAccount.creator.toString()).to.equal(wallet.publicKey.toString());
      expect(capsuleAccount.title).to.equal(title);
      expect(capsuleAccount.content).to.equal(content);
      expect(capsuleAccount.unlockDate.toNumber()).to.equal(futureUnlockDate);
      expect(capsuleAccount.isUnlocked).to.be.false;
      expect(capsuleAccount.mint).to.be.null;
      expect(capsuleAccount.id.toNumber()).to.equal(capsuleId);
      expect(capsuleAccount.bump).to.equal(capsuleBump);

      // Verify config was updated
      const updatedConfig = await program.account.config.fetch(configPda);
      expect(updatedConfig.totalCapsules.toNumber()).to.equal(capsuleId + 1);
    });

    it("Should fail with title too long", async () => {
      const longTitle = "x".repeat(101); // Max is 100
      const configAccount = await program.account.config.fetch(configPda);
      const capsuleId = configAccount.totalCapsules.toNumber();

      const [failCapsulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wallet.publicKey.toBuffer(),
          new anchor.BN(capsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      try {
        await program.methods
          .createCapsule(longTitle, content, new anchor.BN(futureUnlockDate))
          .accounts({
            config: configPda,
            capsule: failCapsulePda,
            creator: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have failed");
      } catch (error) {
        expect(error.message).to.include("TitleTooLong");
      }
    });

    it("Should fail with content too long", async () => {
      const longContent = "x".repeat(501); // Max is 2000
      const configAccount = await program.account.config.fetch(configPda);
      const capsuleId = configAccount.totalCapsules.toNumber();

      const [failCapsulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wallet.publicKey.toBuffer(),
          new anchor.BN(capsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      try {
        await program.methods
          .createCapsule(title, longContent, new anchor.BN(futureUnlockDate))
          .accounts({
            config: configPda,
            capsule: failCapsulePda,
            creator: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have failed");
      } catch (error) {
        expect(error.message).to.include("ContentTooLong");
      }
    });

    it("Should fail with past unlock date", async () => {
      const configAccount = await program.account.config.fetch(configPda);
      const capsuleId = configAccount.totalCapsules.toNumber();

      const [failCapsulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wallet.publicKey.toBuffer(),
          new anchor.BN(capsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      try {
        await program.methods
          .createCapsule(title, content, new anchor.BN(pastUnlockDate))
          .accounts({
            config: configPda,
            capsule: failCapsulePda,
            creator: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have failed");
      } catch (error) {
        expect(error.message).to.include("UnlockDateMustBeFuture");
      }
    });

  });

  describe("Capsule Updates", () => {
    it("Should update capsule content successfully", async () => {
      const newContent = "Updated content for my future self.";
      
      await program.methods
        .updateCapsule(newContent, null)
        .accounts({
          capsule: capsulePda,
          creator: wallet.publicKey,
        })
        .rpc();

      const capsuleAccount = await program.account.capsule.fetch(capsulePda);
      expect(capsuleAccount.content).to.equal(newContent);
    });

    it("Should extend unlock date successfully", async () => {
      const newUnlockDate = futureUnlockDate + 7200; // 2 hours later
      
      await program.methods
        .updateCapsule(null, new anchor.BN(newUnlockDate))
        .accounts({
          capsule: capsulePda,
          creator: wallet.publicKey,
        })
        .rpc();

      const capsuleAccount = await program.account.capsule.fetch(capsulePda);
      expect(capsuleAccount.unlockDate.toNumber()).to.equal(newUnlockDate);
    });

    it("Should fail to shorten unlock date", async () => {
      const shorterDate = futureUnlockDate; // Back to original time
      
      try {
        await program.methods
          .updateCapsule(null, new anchor.BN(shorterDate))
          .accounts({
            capsule: capsulePda,
            creator: wallet.publicKey,
          })
          .rpc();
        expect.fail("Should have failed");
      } catch (error) {
        expect(error.message).to.include("InvalidUnlockDateExtension");
      }
    });

    it("Should fail to update from non-creator", async () => {
      // Create another keypair
      const nonCreator = anchor.web3.Keypair.generate();
      
      // Airdrop SOL to non-creator
      const airdropTx = await provider.connection.requestAirdrop(
        nonCreator.publicKey,
        LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropTx);

      try {
        await program.methods
          .updateCapsule("Malicious update", null)
          .accounts({
            capsule: capsulePda,
            creator: nonCreator.publicKey,
          })
          .signers([nonCreator])
          .rpc();
        expect.fail("Should have failed");
      } catch (error) {
        expect(error.message).to.include("AnchorError caused by account");
      }
    });
  });

  describe("Capsule Unlocking", () => {
    let futureCapsulePda: PublicKey;
    let futureUnlockDate: number;

    before(async () => {
      // Create a capsule with future unlock date (15 seconds from now)
      futureUnlockDate = Math.floor(Date.now() / 1000) + 15; // 15 seconds from now
      
      const configAccount = await program.account.config.fetch(configPda);
      const capsuleId = configAccount.totalCapsules.toNumber();
      
      [futureCapsulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wallet.publicKey.toBuffer(),
          new anchor.BN(capsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      await program.methods
        .createCapsule("Future Capsule", "This can be unlocked in 30 seconds", new anchor.BN(futureUnlockDate))
        .accounts({
          config: configPda,
          capsule: futureCapsulePda,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

    it("Should fail to unlock capsule before time", async () => {
      try {
        await program.methods
          .unlockCapsule()
          .accounts({
            capsule: futureCapsulePda,
            unlocker: wallet.publicKey,
          })
          .rpc();
        expect.fail("Should have failed");
      } catch (error) {
        expect(error.message).to.include("CapsuleNotReadyToUnlock");
      }
    });

    it("Should unlock capsule when time has passed", async () => {
      // Wait for the unlock time to pass (30 seconds + small buffer)
      const waitTime = futureUnlockDate * 1000 - Date.now() + 3000; // Add 3 second buffer
      if (waitTime > 0) {
        console.log(`Waiting ${waitTime}ms for capsule to be unlockable...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      await program.methods
        .unlockCapsule()
        .accounts({
          capsule: futureCapsulePda,
          unlocker: wallet.publicKey,
        })
        .rpc();

      const capsuleAccount = await program.account.capsule.fetch(futureCapsulePda);
      expect(capsuleAccount.isUnlocked).to.be.true;
      unlockedCapsulePda = futureCapsulePda; // Save for later tests
      unlockedCapsuleID = capsuleAccount.id.toNumber();
    });

    it("Should fail to update capsule after unlock", async () => {
      try {
        await program.methods
          .updateCapsule("Cannot update after unlock", null)
          .accounts({
            capsule: futureCapsulePda,
            creator: wallet.publicKey,
          })
          .rpc();
        expect.fail("Should have failed");
      } catch (error) {
        expect(error.message).to.include("CapsuleAlreadyUnlocked");
      }
    });
  });

  describe("Capsule Closing", () => {
    it("Should close unlocked capsule successfully", async () => {
      const initialBalance = await provider.connection.getBalance(wallet.publicKey);
      
      // Get the unlocked capsule PDA that we can close
      const configAccount = await program.account.config.fetch(configPda);
      const capsuleId = unlockedCapsuleID; // The past capsule we created and unlocked
      
      const [unlockedCapsulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wallet.publicKey.toBuffer(),
          new anchor.BN(capsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      await program.methods
        .closeCapsule()
        .accounts({
          capsule: unlockedCapsulePda,
          creator: wallet.publicKey,
        })
        .rpc();

      // Verify capsule account is closed
      try {
        await program.account.capsule.fetch(unlockedCapsulePda);
        expect.fail("Account should be closed");
      } catch (error) {
        expect(error.message).to.include("Account does not exist");
      }

      // Verify rent was reclaimed
      const finalBalance = await provider.connection.getBalance(wallet.publicKey);
      expect(finalBalance).to.be.greaterThan(initialBalance);
    });

    it("Should fail to close locked capsule", async () => {
      try {
        await program.methods
          .closeCapsule()
          .accounts({
            capsule: capsulePda, // This one is still locked
            creator: wallet.publicKey,
          })
          .rpc();
        expect.fail("Should have failed");
      } catch (error) {
        expect(error.message).to.include("CannotCloseLockedCapsule");
      }
    });

    it("Should fail to close from non-creator", async () => {
      // Create and unlock another capsule first
      const configAccount = await program.account.config.fetch(configPda);
      const capsuleId = configAccount.totalCapsules.toNumber();

      // Create a capsule with future unlock date (15 seconds from now)
      let futureUnlockDate = Math.floor(Date.now() / 1000) + 15; // 15 seconds from now

      const [newCapsulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wallet.publicKey.toBuffer(),
          new anchor.BN(capsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      await program.methods
        .createCapsule("Another Past Capsule", "For closing test", new anchor.BN(futureUnlockDate))
        .accounts({
          config: configPda,
          capsule: newCapsulePda,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      // Wait for the unlock time to pass (30 seconds + small buffer)
      const waitTime = futureUnlockDate * 1000 - Date.now() + 3000; // Add 3 second buffer
      if (waitTime > 0) {
        console.log(`Waiting ${waitTime}ms for capsule to be unlockable...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      await program.methods
        .unlockCapsule()
        .accounts({
          capsule: newCapsulePda,
          unlocker: wallet.publicKey,
        })
        .rpc();

      // Try to close from non-creator
      const nonCreator = anchor.web3.Keypair.generate();
      const airdropTx = await provider.connection.requestAirdrop(
        nonCreator.publicKey,
        LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropTx);

      try {
        await program.methods
          .closeCapsule()
          .accounts({
            capsule: newCapsulePda,
            creator: nonCreator.publicKey,
          })
          .signers([nonCreator])
          .rpc();
        expect.fail("Should have failed");
      } catch (error) {
        expect(error.message).to.include("AnchorError caused by account");
      }
    });
  });


});
