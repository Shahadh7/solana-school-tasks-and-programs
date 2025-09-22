use anchor_lang::prelude::*;
use crate::{state::*, errors::ErrorCode, events::CapsuleUpdated};

#[derive(Accounts)]
pub struct UpdateCapsule<'info> {
    #[account(
        mut,
        seeds = [Capsule::SEED, capsule.creator.as_ref(), &capsule.id.to_le_bytes()],
        bump = capsule.bump,
        constraint = capsule.owner == owner.key() @ ErrorCode::NotOwner,
    )]
    pub capsule: Account<'info, Capsule>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
}

pub fn handler(
    ctx: Context<UpdateCapsule>,
    new_content: Option<String>,
    new_unlock_date: Option<i64>,
    new_encrypted_url: Option<String>,
    remove_encrypted_url: bool,
) -> Result<()> {
    let capsule = &mut ctx.accounts.capsule;
    require!(capsule.can_be_updated(), ErrorCode::CapsuleAlreadyUnlocked);
    
    let clock = Clock::get()?;
    let mut content_updated = false;
    let mut url_updated = false;
    
    // Update content if provided
    if let Some(content) = new_content {
        require!(
            content.len() <= MAX_CONTENT_LENGTH,
            ErrorCode::ContentTooLong
        );
        capsule.content = content;
        content_updated = true;
    }
    
    // Update unlock date if provided
    if let Some(unlock_date) = new_unlock_date {
        require!(
            unlock_date > capsule.unlock_date,
            ErrorCode::InvalidUnlockDateExtension
        );
        capsule.unlock_date = unlock_date;
    }
    
    // Handle encrypted URL updates
    if remove_encrypted_url {
        capsule.encrypted_url = None;
        url_updated = true;
    } else if let Some(encrypted_url) = new_encrypted_url {
        require!(
            encrypted_url.len() <= MAX_URL_LENGTH,
            ErrorCode::UrlTooLong
        );
        capsule.encrypted_url = Some(encrypted_url);
        url_updated = true;
    }
    
    capsule.updated_at = clock.unix_timestamp;
    
    emit!(CapsuleUpdated {
        capsule: capsule.key(),
        updater: ctx.accounts.owner.key(),
        new_unlock_date,
        content_updated,
        url_updated,
        timestamp: clock.unix_timestamp,
    });
    
    msg!("Capsule updated: {}", capsule.key());
    
    Ok(())
}