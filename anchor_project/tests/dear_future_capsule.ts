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
        .createCapsule(title, content, new anchor.BN(futureUnlockDate), null)
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
      expect(capsuleAccount.encryptedUrl).to.be.null;
    });

    it("Should create capsule with encrypted URL successfully", async () => {
      // Get current total capsules count
      const configAccount = await program.account.config.fetch(configPda);
      const capsuleId = configAccount.totalCapsules.toNumber();

      // Derive capsule PDA
      const [capsuleWithUrlPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wallet.publicKey.toBuffer(),
          new anchor.BN(capsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      const encryptedUrl = "https://example.com/encrypted-content";
      const tx = await program.methods
        .createCapsule(title, content, new anchor.BN(futureUnlockDate), encryptedUrl)
        .accounts({
          config: configPda,
          capsule: capsuleWithUrlPda,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Verify capsule was created correctly with encrypted URL
      const capsuleAccount = await program.account.capsule.fetch(capsuleWithUrlPda);
      expect(capsuleAccount.creator.toString()).to.equal(wallet.publicKey.toString());
      expect(capsuleAccount.title).to.equal(title);
      expect(capsuleAccount.encryptedUrl).to.equal(encryptedUrl);
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
          .createCapsule(longTitle, content, new anchor.BN(futureUnlockDate), null)
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
      const longContent = "x".repeat(301); // Max is 300
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
          .createCapsule(title, longContent, new anchor.BN(futureUnlockDate), null)
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

    it("Should fail with encrypted URL too long", async () => {
      const longUrl = "x".repeat(501); // Max is 500
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
          .createCapsule(title, content, new anchor.BN(futureUnlockDate), longUrl)
          .accounts({
            config: configPda,
            capsule: failCapsulePda,
            creator: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have failed");
      } catch (error) {
        expect(error.message).to.include("UrlTooLong");
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
          .createCapsule(title, content, new anchor.BN(pastUnlockDate), null)
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
        .updateCapsule(newContent, null, null, false)
        .accounts({
          capsule: capsulePda,
          owner: wallet.publicKey, // Updated to use owner instead of creator
        })
        .rpc();

      const capsuleAccount = await program.account.capsule.fetch(capsulePda);
      expect(capsuleAccount.content).to.equal(newContent);
    });

    it("Should update encrypted URL successfully", async () => {
      const newEncryptedUrl = "https://example.com/encrypted-content";
      
      await program.methods
        .updateCapsule(null, null, newEncryptedUrl, false)
        .accounts({
          capsule: capsulePda,
          owner: wallet.publicKey, // Updated to use owner instead of creator
        })
        .rpc();

      const capsuleAccount = await program.account.capsule.fetch(capsulePda);
      expect(capsuleAccount.encryptedUrl).to.equal(newEncryptedUrl);
    });

    it("Should remove encrypted URL successfully", async () => {
      
      await program.methods
        .updateCapsule(null, null, null, true)
        .accounts({
          capsule: capsulePda,
          owner: wallet.publicKey, // Updated to use owner instead of creator
        })
        .rpc();

      const capsuleAccount = await program.account.capsule.fetch(capsulePda)
      expect(capsuleAccount.encryptedUrl).to.be.null;
    });

    it("Should extend unlock date successfully", async () => {
      const newUnlockDate = futureUnlockDate + 7200; // 2 hours later
      
      await program.methods
        .updateCapsule(null, new anchor.BN(newUnlockDate), null, false)
        .accounts({
          capsule: capsulePda,
          owner: wallet.publicKey, // Updated to use owner instead of creator
        })
        .rpc();

      const capsuleAccount = await program.account.capsule.fetch(capsulePda);
      expect(capsuleAccount.unlockDate.toNumber()).to.equal(newUnlockDate);
    });

    it("Should fail to shorten unlock date", async () => {
      const shorterDate = futureUnlockDate; // Back to original time
      
      try {
        await program.methods
          .updateCapsule(null, new anchor.BN(shorterDate), null, false)
          .accounts({
            capsule: capsulePda,
            owner: wallet.publicKey, // Updated to use owner instead of creator
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
          .updateCapsule("Malicious update", null, null, false)
          .accounts({
            capsule: capsulePda,
            owner: nonCreator.publicKey, // Updated to use owner instead of creator
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
        .createCapsule("Future Capsule", "This can be unlocked in 30 seconds", new anchor.BN(futureUnlockDate), null)
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
            owner: wallet.publicKey, // Updated to use owner instead of unlocker
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
          owner: wallet.publicKey, // Updated to use owner instead of unlocker
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
          .updateCapsule("Cannot update after unlock", null, null, false)
          .accounts({
            capsule: futureCapsulePda,
            owner: wallet.publicKey, // Updated to use owner instead of creator
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
          owner: wallet.publicKey, // Updated to use owner instead of creator
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
            owner: wallet.publicKey, // Updated to use owner instead of creator
          })
          .rpc();
        expect.fail("Should have failed");
      } catch (error) {
        expect(error.message).to.include("CannotCloseLockedCapsule");
      }
    });

    it("Should fail to close from non-owner", async () => {
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
        .createCapsule("Another Past Capsule", "For closing test", new anchor.BN(futureUnlockDate), null)
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
          owner: wallet.publicKey, // Updated to use owner instead of unlocker
        })
        .rpc();

      // Try to close from non-owner
      const nonOwner = anchor.web3.Keypair.generate();
      const airdropTx = await provider.connection.requestAirdrop(
        nonOwner.publicKey,
        LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropTx);

      try {
        await program.methods
          .closeCapsule()
          .accounts({
            capsule: newCapsulePda,
            owner: nonOwner.publicKey, // Updated to use owner instead of creator
          })
          .signers([nonOwner])
          .rpc();
        expect.fail("Should have failed");
      } catch (error) {
        expect(error.message).to.include("AnchorError caused by account");
      }
    });
  });

  describe("Capsule Transfer", () => {
    let transferCapsulePda: PublicKey;
    let transferCapsuleId: number;
    let newOwner: anchor.web3.Keypair;

    before(async () => {
      // Create a new keypair for the new owner
      newOwner = anchor.web3.Keypair.generate();
      
      // Airdrop SOL to new owner
      const airdropTx = await provider.connection.requestAirdrop(
        newOwner.publicKey,
        LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropTx);

      // Create a capsule for transfer testing
      const configAccount = await program.account.config.fetch(configPda);
      transferCapsuleId = configAccount.totalCapsules.toNumber();
      
      [transferCapsulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wallet.publicKey.toBuffer(),
          new anchor.BN(transferCapsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      await program.methods
        .createCapsule("Transfer Test Capsule", "This capsule will be transferred", new anchor.BN(futureUnlockDate), null)
        .accounts({
          config: configPda,
          capsule: transferCapsulePda,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

    it("Should transfer capsule successfully without mint", async () => {
      await program.methods
        .transferCapsule(null)
        .accounts({
          capsule: transferCapsulePda,
          currentOwner: wallet.publicKey,
          newOwner: newOwner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Verify capsule was transferred
      const capsuleAccount = await program.account.capsule.fetch(transferCapsulePda);
      expect(capsuleAccount.creator.toString()).to.equal(wallet.publicKey.toString()); // Creator remains same
      expect(capsuleAccount.owner.toString()).to.equal(newOwner.publicKey.toString()); // Owner changed
      expect(capsuleAccount.transferredAt).to.not.be.null;
      expect(capsuleAccount.mint).to.be.null;
      expect(capsuleAccount.mintCreator).to.be.null;
    });

    it("Should transfer capsule successfully with mint address", async () => {
      // Create another capsule for this test
      const configAccount = await program.account.config.fetch(configPda);
      const capsuleId = configAccount.totalCapsules.toNumber();
      
      const [mintCapsulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wallet.publicKey.toBuffer(),
          new anchor.BN(capsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      await program.methods
        .createCapsule("Mint Transfer Capsule", "This capsule will be transferred with mint", new anchor.BN(futureUnlockDate), null)
        .accounts({
          config: configPda,
          capsule: mintCapsulePda,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Generate a fake mint address for testing
      const fakeMintAddress = anchor.web3.Keypair.generate().publicKey;

      await program.methods
        .transferCapsule(fakeMintAddress)
        .accounts({
          capsule: mintCapsulePda,
          currentOwner: wallet.publicKey,
          newOwner: newOwner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Verify capsule was transferred with mint info
      const capsuleAccount = await program.account.capsule.fetch(mintCapsulePda);
      expect(capsuleAccount.creator.toString()).to.equal(wallet.publicKey.toString());
      expect(capsuleAccount.owner.toString()).to.equal(newOwner.publicKey.toString());
      expect(capsuleAccount.mint.toString()).to.equal(fakeMintAddress.toString());
      expect(capsuleAccount.mintCreator.toString()).to.equal(wallet.publicKey.toString());
      expect(capsuleAccount.transferredAt).to.not.be.null;
    });

    it("Should fail to transfer to same owner", async () => {
      try {
        await program.methods
          .transferCapsule(null)
          .accounts({
            capsule: transferCapsulePda,
            currentOwner: newOwner.publicKey,
            newOwner: newOwner.publicKey, // Same as current owner
            systemProgram: SystemProgram.programId,
          })
          .signers([newOwner])
          .rpc();
        expect.fail("Should have failed");
      } catch (error) {
        expect(error.message).to.include("CannotTransferToSelf");
      }
    });

    it("Should fail to transfer from non-owner", async () => {
      const nonOwner = anchor.web3.Keypair.generate();
      const airdropTx = await provider.connection.requestAirdrop(
        nonOwner.publicKey,
        LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropTx);

      try {
        await program.methods
          .transferCapsule(null)
          .accounts({
            capsule: transferCapsulePda,
            currentOwner: nonOwner.publicKey, // Not the current owner
            newOwner: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([nonOwner])
          .rpc();
        expect.fail("Should have failed");
      } catch (error) {
        expect(error.message).to.include("NotOwner");
      }
    });

    it("Should allow new owner to update capsule", async () => {
      const newContent = "Updated by new owner";
      
      await program.methods
        .updateCapsule(newContent, null, null, false)
        .accounts({
          capsule: transferCapsulePda,
          owner: newOwner.publicKey, // New owner can update
        })
        .signers([newOwner])
        .rpc();

      const capsuleAccount = await program.account.capsule.fetch(transferCapsulePda);
      expect(capsuleAccount.content).to.equal(newContent);
    });

    it("Should prevent original creator from updating after transfer", async () => {
      try {
        await program.methods
          .updateCapsule("Original creator trying to update", null, null, false)
          .accounts({
            capsule: transferCapsulePda,
            owner: wallet.publicKey, // Original creator, no longer owner
          })
          .rpc();
        expect.fail("Should have failed");
      } catch (error) {
        expect(error.message).to.include("NotOwner");
      }
    });

    it("Should allow new owner to unlock capsule when time comes", async () => {
      // Create a capsule that can be unlocked immediately
      const configAccount = await program.account.config.fetch(configPda);
      const capsuleId = configAccount.totalCapsules.toNumber();
      const pastDate = Math.floor(Date.now() / 1000) + 1; // 1 second from now (minimal future time)
      
      const [unlockableCapsulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wallet.publicKey.toBuffer(),
          new anchor.BN(capsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      await program.methods
        .createCapsule("Unlockable Transfer Capsule", "Can be unlocked soon", new anchor.BN(pastDate), null)
        .accounts({
          config: configPda,
          capsule: unlockableCapsulePda,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Transfer to new owner
      await program.methods
        .transferCapsule(null)
        .accounts({
          capsule: unlockableCapsulePda,
          currentOwner: wallet.publicKey,
          newOwner: newOwner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Wait for unlock time to pass
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      // New owner should be able to unlock
      await program.methods
        .unlockCapsule()
        .accounts({
          capsule: unlockableCapsulePda,
          owner: newOwner.publicKey,
        })
        .signers([newOwner])
        .rpc();

      const capsuleAccount = await program.account.capsule.fetch(unlockableCapsulePda);
      expect(capsuleAccount.isUnlocked).to.be.true;
    });

    it("Should allow new owner to close unlocked capsule", async () => {
      // Use the capsule we just unlocked
      const configAccount = await program.account.config.fetch(configPda);
      const capsuleId = configAccount.totalCapsules.toNumber() - 1; // Last created capsule
      
      const [closableCapsulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wallet.publicKey.toBuffer(),
          new anchor.BN(capsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      const initialBalance = await provider.connection.getBalance(newOwner.publicKey);

      await program.methods
        .closeCapsule()
        .accounts({
          capsule: closableCapsulePda,
          owner: newOwner.publicKey,
        })
        .signers([newOwner])
        .rpc();

      // Verify capsule account is closed
      try {
        await program.account.capsule.fetch(closableCapsulePda);
        expect.fail("Account should be closed");
      } catch (error) {
        expect(error.message).to.include("Account does not exist");
      }

      // Verify rent was reclaimed to new owner
      const finalBalance = await provider.connection.getBalance(newOwner.publicKey);
      expect(finalBalance).to.be.greaterThan(initialBalance);
    });
  });

  describe("Owner vs Creator Access Control", () => {
    let ownershipCapsulePda: PublicKey;
    let thirdParty: anchor.web3.Keypair;

    before(async () => {
      // Create a third party user
      thirdParty = anchor.web3.Keypair.generate();
      const airdropTx = await provider.connection.requestAirdrop(
        thirdParty.publicKey,
        LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropTx);

      // Create a capsule for ownership testing
      const configAccount = await program.account.config.fetch(configPda);
      const capsuleId = configAccount.totalCapsules.toNumber();
      
      [ownershipCapsulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wallet.publicKey.toBuffer(),
          new anchor.BN(capsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      await program.methods
        .createCapsule("Ownership Test", "Testing owner vs creator", new anchor.BN(futureUnlockDate), null)
        .accounts({
          config: configPda,
          capsule: ownershipCapsulePda,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Transfer to third party
      await program.methods
        .transferCapsule(null)
        .accounts({
          capsule: ownershipCapsulePda,
          currentOwner: wallet.publicKey,
          newOwner: thirdParty.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

    it("Should verify creator and owner are different after transfer", async () => {
      const capsuleAccount = await program.account.capsule.fetch(ownershipCapsulePda);
      expect(capsuleAccount.creator.toString()).to.equal(wallet.publicKey.toString());
      expect(capsuleAccount.owner.toString()).to.equal(thirdParty.publicKey.toString());
      expect(capsuleAccount.creator.toString()).to.not.equal(capsuleAccount.owner.toString());
    });

    it("Should only allow owner to update capsule, not creator", async () => {
      // Creator should fail
      try {
        await program.methods
          .updateCapsule("Creator update attempt", null, null, false)
          .accounts({
            capsule: ownershipCapsulePda,
            owner: wallet.publicKey, // Creator trying to update
          })
          .rpc();
        expect.fail("Should have failed");
      } catch (error) {
        expect(error.message).to.include("NotOwner");
      }

      // Owner should succeed
      await program.methods
        .updateCapsule("Owner update success", null, null, false)
        .accounts({
          capsule: ownershipCapsulePda,
          owner: thirdParty.publicKey, // Current owner updating
        })
        .signers([thirdParty])
        .rpc();

      const capsuleAccount = await program.account.capsule.fetch(ownershipCapsulePda);
      expect(capsuleAccount.content).to.equal("Owner update success");
    });

    it("Should only allow owner to unlock capsule, not creator", async () => {
      // Create an unlockable capsule
      const configAccount = await program.account.config.fetch(configPda);
      const capsuleId = configAccount.totalCapsules.toNumber();
      const pastDate = Math.floor(Date.now() / 1000) + 1; // 1 second from now
      
      const [unlockTestCapsulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("capsule"),
          wallet.publicKey.toBuffer(),
          new anchor.BN(capsuleId).toBuffer("le", 8),
        ],
        program.programId
      );

      await program.methods
        .createCapsule("Unlock Test", "For unlock access test", new anchor.BN(pastDate), null)
        .accounts({
          config: configPda,
          capsule: unlockTestCapsulePda,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Transfer to third party
      await program.methods
        .transferCapsule(null)
        .accounts({
          capsule: unlockTestCapsulePda,
          currentOwner: wallet.publicKey,
          newOwner: thirdParty.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Wait for unlock time to pass
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      // Creator should fail to unlock
      try {
        await program.methods
          .unlockCapsule()
          .accounts({
            capsule: unlockTestCapsulePda,
            owner: wallet.publicKey, // Creator trying to unlock
          })
          .rpc();
        expect.fail("Should have failed");
      } catch (error) {
        expect(error.message).to.include("NotOwner");
      }

      // Owner should succeed
      await program.methods
        .unlockCapsule()
        .accounts({
          capsule: unlockTestCapsulePda,
          owner: thirdParty.publicKey, // Current owner unlocking
        })
        .signers([thirdParty])
        .rpc();

      const capsuleAccount = await program.account.capsule.fetch(unlockTestCapsulePda);
      expect(capsuleAccount.isUnlocked).to.be.true;
    });
  });


});
