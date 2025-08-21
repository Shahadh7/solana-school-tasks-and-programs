use anchor_lang::prelude::*;
use crate::{state::{Config, Capsule}, errors::ErrorCode, events::CapsuleCreated};

#[derive(Accounts)]
pub struct CreateCapsule<'info> {
    #[account(
        mut,
        seeds = [Config::SEED],
        bump
    )]
    pub config: Account<'info, Config>,
    
    #[account(
        init,
        payer = creator,
        space = Capsule::SPACE,
        seeds = [Capsule::SEED, creator.key().as_ref(), &config.total_capsules.to_le_bytes()],
        bump
    )]
    pub capsule: Account<'info, Capsule>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateCapsule>,
    title: String,
    content: String,
    unlock_date: i64,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let capsule = &mut ctx.accounts.capsule;
    let clock = Clock::get()?;
    
    // Validate inputs
    require!(
        title.len() <= Capsule::MAX_TITLE_LENGTH,
        ErrorCode::TitleTooLong
    );
    
    require!(
        content.len() <= Capsule::MAX_CONTENT_LENGTH,
        ErrorCode::ContentTooLong
    );
    
    require!(
        unlock_date > clock.unix_timestamp,
        ErrorCode::UnlockDateMustBeFuture
    );
    
    // Initialize capsule
    capsule.creator = ctx.accounts.creator.key();
    capsule.id = config.total_capsules;
    capsule.title = title.clone();
    capsule.content = content;
    capsule.unlock_date = unlock_date;
    capsule.is_unlocked = false;
    capsule.mint = None;
    capsule.created_at = clock.unix_timestamp;
    capsule.updated_at = clock.unix_timestamp;
    capsule.bump = ctx.bumps.capsule;
    
    // Update global counter
    config.total_capsules = config.total_capsules.checked_add(1).unwrap();
    
    // Emit event
    emit!(CapsuleCreated {
        capsule: capsule.key(),
        creator: ctx.accounts.creator.key(),
        title,
        unlock_date,
        timestamp: clock.unix_timestamp,
    });
    
    msg!("Capsule created: {}", capsule.key());
    
    Ok(())
}