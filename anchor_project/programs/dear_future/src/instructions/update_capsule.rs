use anchor_lang::prelude::*;
use crate::{state::Capsule, errors::ErrorCode, events::CapsuleUpdated};

#[derive(Accounts)]
pub struct UpdateCapsule<'info> {
    #[account(
        mut,
        seeds = [Capsule::SEED, creator.key().as_ref(), &capsule.id.to_le_bytes()],
        bump = capsule.bump,
        constraint = capsule.creator == creator.key() @ ErrorCode::UnauthorizedAccess,
    )]
    pub capsule: Account<'info, Capsule>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
}

pub fn handler(
    ctx: Context<UpdateCapsule>,
    new_content: Option<String>,
    new_unlock_date: Option<i64>,
) -> Result<()> {
    let capsule = &mut ctx.accounts.capsule;
    let clock = Clock::get()?;
    
    require!(capsule.can_be_updated(), ErrorCode::CapsuleAlreadyUnlocked);
    
    let mut content_updated = false;
    
    if let Some(content) = new_content {
        require!(
            content.len() <= Capsule::MAX_CONTENT_LENGTH,
            ErrorCode::ContentTooLong
        );
        capsule.content = content;
        content_updated = true;
    }
    
    if let Some(unlock_date) = new_unlock_date {
        require!(
            unlock_date > capsule.unlock_date,
            ErrorCode::InvalidUnlockDateExtension
        );
        capsule.unlock_date = unlock_date;
    }
    
    capsule.updated_at = clock.unix_timestamp;
    
    emit!(CapsuleUpdated {
        capsule: capsule.key(),
        updater: ctx.accounts.creator.key(),
        new_unlock_date,
        content_updated,
        timestamp: clock.unix_timestamp,
    });
    
    msg!("Capsule updated: {}", capsule.key());
    
    Ok(())
}