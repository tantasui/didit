module didit::didit;

use std::string::{Self, String};
use sui::balance::Balance;
use sui::coin::{Self, Coin};
use sui::event;
use sui::sui::SUI;
use sui::table::{Self, Table};
use sui::vec_map::{Self, VecMap};

public struct Bounty has key, store {
  id: UID,
  offchain_bounty_id: String,
  title: String,
  description: String,
  balance: Balance<SUI>, // Renamed from reward
  prize_schedule: vector<u64>, // List of prizes for each position
  creator: address,
  created_at: u64,
  submissions: Table<address, BountyProof>,
  winners: VecMap<u64, address>, // Maps position index -> winner address
  no_of_submissions: u64,
  deadline: u64, // Timestamp in ms. 0 means no deadline.
  active: bool,
}

public struct BountyCreated has copy, drop {
  bounty_id: ID,
  creator: address,
  created_at: u64,
  deadline: u64,
  total_prizes: u64,
}

public struct BountyCreator has key, store {
  id: UID,
  address: address,
  created_at: u64,
  image_url: String,
}

public struct BountyProof has key, store {
  id: UID,
  bounty_id: ID,
  offchain_bounty_proof_id: String,
  submitter: address,
  submission_no: u64,
  proof_url: String,
  submitted_at: u64,
}

// Separate struct for user's submission receipt (without UID so it can have copy)
public struct SubmissionReceipt has key, store {
  id: UID,
  bounty_id: ID,
  offchain_bounty_proof_id: String,
  submitter: address,
  submission_no: u64,
  proof_url: String,
  submitted_at: u64,
}

public struct BountyProofSubmitted has copy, drop {
  bounty_id: ID,
  offchain_bounty_id: String,
  submitter: address,
  submission_no: u64,
  submitted_at: u64,
}

public struct BountyAwarded has copy, drop {
  bounty_id: ID,
  winner: address,
  position_index: u64,
  amount: u64,
  awarded_at: u64,
}

public struct BountyRegistry has key, store {
  id: UID,
  no_of_bounties: u64,
  bounties: vector<ID>,
}

#[allow(unused_function)]
fun init(ctx: &mut TxContext) {
  let bounty_registry = BountyRegistry {
    id: object::new(ctx),
    no_of_bounties: 0,
    bounties: vector::empty(),
  };
  transfer::share_object(bounty_registry);
}

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
  let bounty_registry = BountyRegistry {
    id: object::new(ctx),
    no_of_bounties: 0,
    bounties: vector::empty(),
  };
  transfer::share_object(bounty_registry);
}

public fun create_bounty(
  bountyregistry: &mut BountyRegistry,
  offchain_bounty_id: String,
  title: String,
  description: String,
  funding: Coin<SUI>,
  prize_schedule: vector<u64>,
  deadline_ms: u64,
  ctx: &mut TxContext,
) {
  // Validate that funding covers all prizes
  let mut total_required = 0;
  let mut i = 0;
  while (i < prize_schedule.length()) {
    total_required = total_required + prize_schedule[i];
    i = i + 1;
  };
  assert!(funding.value() >= total_required, 0); // Error 0: Insufficient funding

  // If funding is more than required, we keep it in the balance (maybe for tips or future uses? or refund later of remainder)

  let balance = funding.into_balance();

  let bounty = Bounty {
    id: object::new(ctx),
    offchain_bounty_id,
    title,
    description,
    balance,
    prize_schedule,
    creator: ctx.sender(),
    submissions: table::new(ctx),
    winners: vec_map::empty(),
    no_of_submissions: 0,
    created_at: ctx.epoch_timestamp_ms(),
    deadline: deadline_ms,
    active: true,
  };

  event::emit(BountyCreated {
    bounty_id: object::uid_to_inner(&bounty.id),
    creator: ctx.sender(),
    created_at: ctx.epoch_timestamp_ms(),
    deadline: deadline_ms,
    total_prizes: total_required,
  });

  bountyregistry.bounties.push_back(object::uid_to_inner(&bounty.id));
  transfer::share_object(bounty);

  let bounty_creator = BountyCreator {
    id: object::new(ctx),
    address: ctx.sender(),
    created_at: ctx.epoch_timestamp_ms(),
    image_url: string::utf8(b"https://example.com"),
  };
  bountyregistry.no_of_bounties = bountyregistry.no_of_bounties + 1;

  transfer::transfer(bounty_creator, ctx.sender());
}

public fun submit_bounty_proof(
  bounty: &mut Bounty,
  offchain_bounty_proof_id: String,
  proof_url: String,
  ctx: &mut TxContext,
) {
  // Checks
  assert!(bounty.active, 2); // Error 2: Bounty inactive
  assert!(ctx.sender() != bounty.creator, 5); // Error 5: Creator cannot participate
  if (bounty.deadline > 0) {
    assert!(ctx.epoch_timestamp_ms() < bounty.deadline, 6); // Error 6: Deadline passed
  };

  let submission_no = bounty.no_of_submissions + 1;
  let timestamp = ctx.epoch_timestamp_ms();
  let bounty_id = object::uid_to_inner(&bounty.id);
  let submitter = ctx.sender();

  // Create the submission for the bounty table
  let submission = BountyProof {
    id: object::new(ctx),
    bounty_id,
    offchain_bounty_proof_id,
    submitter,
    submission_no,
    proof_url,
    submitted_at: timestamp,
  };

  // Create a receipt for the user
  let receipt = SubmissionReceipt {
    id: object::new(ctx),
    bounty_id,
    offchain_bounty_proof_id,
    submitter,
    submission_no,
    proof_url,
    submitted_at: timestamp,
  };

  bounty.no_of_submissions = bounty.no_of_submissions + 1;
  table::add(&mut bounty.submissions, submitter, submission);

  event::emit(BountyProofSubmitted {
    bounty_id,
    offchain_bounty_id: offchain_bounty_proof_id,
    submitter,
    submission_no,
    submitted_at: timestamp,
  });

  // Transfer the receipt to the user instead of the original submission
  transfer::transfer(receipt, submitter);
}

public fun award_bounty(
  bounty: &mut Bounty,
  cap: &BountyCreator,
  submission_address: address,
  position_index: u64,
  ctx: &mut TxContext,
) {
  // Checks
  assert!(bounty.active, 2); // Error 2: Bounty inactive
  assert!(cap.address == bounty.creator, 1); // Error 1: Unauthorized
  // Verify that the capability matches the sender (extra safety, though cap ownership is enough)
  assert!(cap.address == ctx.sender(), 7); // Error 7: Capability does not belong to sender
  
  assert!(position_index < bounty.prize_schedule.length(), 3); // Error 3: Invalid position
  assert!(!bounty.winners.contains(&position_index), 4); // Error 4: Position already awarded

  // Get reward amount
  let amount = *vector::borrow(&bounty.prize_schedule, position_index);

  // Pay the winner
  let payment = coin::take(&mut bounty.balance, amount, ctx);
  transfer::public_transfer(payment, submission_address);

  // Update state
  bounty.winners.insert(position_index, submission_address);

  // Check if all prizes are awarded
  if (bounty.winners.size() == bounty.prize_schedule.length()) {
    bounty.active = false;
  };

  event::emit(BountyAwarded {
    bounty_id: object::uid_to_inner(&bounty.id),
    winner: submission_address,
    position_index,
    amount,
    awarded_at: ctx.epoch_timestamp_ms(),
  });
}
