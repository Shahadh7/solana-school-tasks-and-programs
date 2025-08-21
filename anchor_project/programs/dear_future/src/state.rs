use anchor_lang::prelude::*;

/// Global configuration for the Dear Future program

pub const MAX_TITLE_LENGTH: usize = 100;
pub const MAX_CONTENT_LENGTH: usize = 500;

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
    pub creator: Pubkey,
    pub id: u64,
    #[max_len(MAX_TITLE_LENGTH)]
    pub title: String,
    #[max_len(MAX_CONTENT_LENGTH)]
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

    pub fn is_ready_to_unlock(&self, current_time: i64) -> bool {
        current_time >= self.unlock_date
    }

    pub fn can_be_updated(&self) -> bool {
        !self.is_unlocked
    }
}