use anchor_lang::prelude::*;

#[event]
pub struct CapsuleCreated {
    pub capsule: Pubkey,
    pub creator: Pubkey,
    pub title: String,
    pub unlock_date: i64,
    pub timestamp: i64,
}

#[event]
pub struct CapsuleUpdated {
    pub capsule: Pubkey,
    pub updater: Pubkey,
    pub new_unlock_date: Option<i64>,
    pub content_updated: bool,
    pub timestamp: i64,
}

#[event]
pub struct CapsuleUnlocked {
    pub capsule: Pubkey,
    pub unlocker: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct CapsuleClosed {
    pub capsule: Pubkey,
    pub closer: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct CapsuleNftMinted {
    pub capsule: Pubkey,
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub name: String,
    pub symbol: String,
    pub timestamp: i64,
}