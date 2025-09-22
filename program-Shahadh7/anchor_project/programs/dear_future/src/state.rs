use anchor_lang::prelude::*;

/// Global configuration for the Dear Future program

pub const MAX_TITLE_LENGTH: usize = 100;
pub const MAX_CONTENT_LENGTH: usize = 300;
pub const MAX_URL_LENGTH: usize = 500;

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,
    pub total_capsules: u64,
    pub version: u8,
    pub reserved: [u8; 31],
}

impl Config {
    pub const SEED: &'static [u8] = b"config";
}

#[account]
#[derive(InitSpace)]
pub struct Capsule {
    // Core fields - packed for efficiency
    pub creator: Pubkey,          // Original creator of the capsule
    pub owner: Pubkey,            // Current owner of the capsule (can be different from creator after transfer)
    pub id: u64,
    pub unlock_date: i64,
    pub created_at: i64,
    pub updated_at: i64,
    pub transferred_at: Option<i64>,  // When the capsule was last transferred
    pub mint: Option<Pubkey>,         // NFT mint address if minted
    pub mint_creator: Option<Pubkey>, // Creator's public key stored when NFT is minted
    pub bump: u8,
    pub is_unlocked: bool,
    
    // String fields with max lengths - these are stored on-chain
    #[max_len(MAX_TITLE_LENGTH)]
    pub title: String,
    #[max_len(MAX_CONTENT_LENGTH)]
    pub content: String,
    #[max_len(MAX_URL_LENGTH)]
    pub encrypted_url: Option<String>,
}

impl Capsule {
    pub const SEED: &'static [u8] = b"capsule";

    #[inline(always)]
    pub fn is_ready_to_unlock(&self, current_time: i64) -> bool {
        current_time >= self.unlock_date
    }

    #[inline(always)]
    pub fn can_be_updated(&self) -> bool {
        !self.is_unlocked
    }

    #[inline(always)]
    pub fn can_be_transferred(&self, caller: &Pubkey) -> bool {
        // Only the current owner can transfer the capsule
        self.owner == *caller
    }

    #[inline(always)]
    pub fn is_owned_by(&self, pubkey: &Pubkey) -> bool {
        self.owner == *pubkey
    }

    pub fn transfer_to(&mut self, new_owner: Pubkey, timestamp: i64) {
        self.owner = new_owner;
        self.transferred_at = Some(timestamp);
        self.updated_at = timestamp;
    }

    pub fn set_mint_info(&mut self, mint: Pubkey, mint_creator: Pubkey, timestamp: i64) {
        self.mint = Some(mint);
        self.mint_creator = Some(mint_creator);
        self.updated_at = timestamp;
    }
}