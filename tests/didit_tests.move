#[test_only]
module didit::didit_tests;

use didit::didit::{Self, Bounty, BountyRegistry, BountyCreator};
use std::string;
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::test_scenario::{Self, Scenario};

public fun test_create_bounty(scenario: &mut Scenario) {
  let admin = @0xA;
  let creator = @0xB;

  // 1. Init
  test_scenario::next_tx(scenario, admin);
  {
    didit::init_for_testing(test_scenario::ctx(scenario));
  };

  // 2. Create Bounty
  test_scenario::next_tx(scenario, creator);
  {
    let mut registry = test_scenario::take_shared<BountyRegistry>(scenario);
    let funding = coin::mint_for_testing<SUI>(100, test_scenario::ctx(scenario));

    let prizes = vector[60, 40]; // 1st: 60, 2nd: 40

    didit::create_bounty(
      &mut registry,
      string::utf8(b"bounty-123"),
      string::utf8(b"Title"),
      string::utf8(b"Desc"),
      funding,
      prizes,
      0,
      test_scenario::ctx(scenario),
    );

    test_scenario::return_shared(registry);
  };
}

#[test]
fun test_flow() {
  let admin = @0xA;
  let creator = @0xB;
  let submitter1 = @0xC;
  let submitter2 = @0xD;
  let voter = @0xE;

  let mut scenario = test_scenario::begin(admin);

  // 1. Setup
  test_create_bounty(&mut scenario);

  // 2. Submit Proofs
  test_scenario::next_tx(&mut scenario, submitter1);
  {
    let mut bounty = test_scenario::take_shared<Bounty>(&scenario);
    didit::submit_bounty_proof(
      &mut bounty,
      string::utf8(b"proof-1"),
      string::utf8(b"url-1"),
      string::utf8(b"meta-1"),
      test_scenario::ctx(&mut scenario),
    );
    test_scenario::return_shared(bounty);
  };

  test_scenario::next_tx(&mut scenario, submitter2);
  {
    let mut bounty = test_scenario::take_shared<Bounty>(&scenario);
    didit::submit_bounty_proof(
      &mut bounty,
      string::utf8(b"proof-2"),
      string::utf8(b"url-2"),
      string::utf8(b"meta-2"),
      test_scenario::ctx(&mut scenario),
    );
    test_scenario::return_shared(bounty);
  };

  // 3. Vote (community action)
  test_scenario::next_tx(&mut scenario, voter);
  {
    let mut bounty = test_scenario::take_shared<Bounty>(&scenario);
    didit::vote_submission(&mut bounty, submitter1, test_scenario::ctx(&mut scenario));
    // change vote to submitter2
    didit::vote_submission(&mut bounty, submitter2, test_scenario::ctx(&mut scenario));
    test_scenario::return_shared(bounty);
  };

  // 4. Award Bounties
  test_scenario::next_tx(&mut scenario, creator);
  {
    let mut bounty = test_scenario::take_shared<Bounty>(&scenario);
    let cap = test_scenario::take_from_sender<BountyCreator>(&scenario);

    // Award 1st place to Submitter 1 (60 SUI)
    didit::award_bounty(
      &mut bounty,
      &cap,
      submitter1,
      0, // index 0
      test_scenario::ctx(&mut scenario),
    );

    // Award 2nd place to Submitter 2 (40 SUI)
    didit::award_bounty(
      &mut bounty,
      &cap,
      submitter2,
      1, // index 1
      test_scenario::ctx(&mut scenario),
    );

    test_scenario::return_shared(bounty);
    test_scenario::return_to_sender(&scenario, cap);
  };

  // 5. Verify Balances
  test_scenario::next_tx(&mut scenario, submitter1);
  {
    let coin = test_scenario::take_from_sender<Coin<SUI>>(&scenario);
    assert!(coin::value(&coin) == 60, 0);
    test_scenario::return_to_sender(&scenario, coin);
  };

  test_scenario::next_tx(&mut scenario, submitter2);
  {
    let coin = test_scenario::take_from_sender<Coin<SUI>>(&scenario);
    assert!(coin::value(&coin) == 40, 1);
    test_scenario::return_to_sender(&scenario, coin);
  };

  test_scenario::end(scenario);
}
