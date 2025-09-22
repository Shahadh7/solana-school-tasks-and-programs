use anchor_lang::prelude::*;
use crate::{state::*, errors::ErrorCode, events::CapsuleCreated};

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
        space = Capsule::INIT_SPACE,
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
    encrypted_url: Option<String>,
) -> Result<()> {
    // Validate inputs first to fail fast
    require!(
        title.len() <= MAX_TITLE_LENGTH,
        ErrorCode::TitleTooLong
    );
    
    require!(
        content.len() <= MAX_CONTENT_LENGTH,
        ErrorCode::ContentTooLong
    );
    
    if let Some(ref url) = encrypted_url {
        require!(
            url.len() <= MAX_URL_LENGTH,
            ErrorCode::UrlTooLong
        );
    }
    
    let clock = Clock::get()?;
    require!(
        unlock_date > clock.unix_timestamp,
        ErrorCode::UnlockDateMustBeFuture
    );
    
    // Initialize capsule directly without intermediate variables
    let capsule = &mut ctx.accounts.capsule;
    capsule.creator = ctx.accounts.creator.key();
    capsule.owner = ctx.accounts.creator.key(); // Initially, creator is the owner
    capsule.id = ctx.accounts.config.total_capsules;
    capsule.title = title;
    capsule.content = content;
    capsule.encrypted_url = encrypted_url;
    capsule.unlock_date = unlock_date;
    capsule.is_unlocked = false;
    capsule.mint = None;
    capsule.mint_creator = None;
    capsule.transferred_at = None;
    capsule.created_at = clock.unix_timestamp;
    capsule.updated_at = clock.unix_timestamp;
    capsule.bump = ctx.bumps.capsule;
    
    // Update global counter
    ctx.accounts.config.total_capsules = ctx.accounts.config.total_capsules.checked_add(1).unwrap();
    
    emit!(CapsuleCreated {
        capsule: capsule.key(),
        creator: ctx.accounts.creator.key(),
        title: capsule.title.clone(),
        unlock_date,
        timestamp: clock.unix_timestamp,
    });
    
    msg!("Capsule created: {}", capsule.key());
    
    Ok(())
}