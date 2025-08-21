use anchor_lang::prelude::*;

/// Global configuration for the Dear Future program
#[account]
pub struct Config {
    pub authority: Pubkey,
    pub total_capsules: u64,
    pub version: u8,
    pub reserved: [u8; 31],
}

impl Config {
    pub const SEED: &'static [u8] = b"config";
    
    /// Space calculation: 8 (discriminator) + 32 (authority) + 8 (total_capsules) + 1 (version) + 31 (reserved)
    pub const SPACE: usize = 8 + 32 + 8 + 1 + 31;
}


#[account]
pub struct Capsule {
    pub creator: Pubkey,
    pub id: u64,
    pub title: String,
    pub content: String,
    pub unlock_date: i64,
    pub is_unlocked: bool,
    pub mint: Option<Pubkey>,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl Capsule {
    pub const SEED: &'static [u8] = b"capsule";
    pub const SPACE: usize = 8 + 32 + 8 + 4 + 100 + 4 + 500 + 8 + 1 + 1 + 32 + 8 + 8 + 1;
    pub const MAX_TITLE_LENGTH: usize = 100;
    pub const MAX_CONTENT_LENGTH: usize = 500;

    pub fn is_ready_to_unlock(&self, current_time: i64) -> bool {
        current_time >= self.unlock_date
    }

    pub fn can_be_updated(&self) -> bool {
        !self.is_unlocked
    }
}