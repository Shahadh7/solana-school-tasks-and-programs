use anchor_lang::prelude::*;
use crate::{state::Capsule, errors::ErrorCode, events::CapsuleClosed};

#[derive(Accounts)]
pub struct CloseCapsule<'info> {
    #[account(
        mut,
        seeds = [Capsule::SEED, creator.key().as_ref(), &capsule.id.to_le_bytes()],
        bump = capsule.bump,
        constraint = capsule.creator == creator.key() @ ErrorCode::UnauthorizedAccess,
        close = creator,
    )]
    pub capsule: Account<'info, Capsule>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
}

pub fn handler(ctx: Context<CloseCapsule>) -> Result<()> {
    let capsule = &ctx.accounts.capsule;
    let clock = Clock::get()?;
    
    require!(capsule.is_unlocked, ErrorCode::CannotCloseLockedCapsule);
    
    emit!(CapsuleClosed {
        capsule: capsule.key(),
        closer: ctx.accounts.creator.key(),
        timestamp: clock.unix_timestamp,
    });
    
    msg!("Capsule closed: {}", capsule.key());
    
    Ok(())
}