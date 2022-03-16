export type CoherenceBeamsplitter = {
  "version": "0.1.0",
  "name": "coherence_beamsplitter",
  "constants": [
    {
      "name": "DEFAULT_CONSTRUCT_BPS",
      "type": "u16",
      "value": "90"
    },
    {
      "name": "DEFAULT_DECONSTRUCT_BPS",
      "type": "u16",
      "value": "0"
    },
    {
      "name": "DEFAULT_MANAGER_BPS",
      "type": "u16",
      "value": "2_000"
    },
    {
      "name": "BASIS_POINT_DECIMALS",
      "type": "u8",
      "value": "4"
    },
    {
      "name": "_PRISM_ETF_SIZE",
      "type": {
        "defined": "usize"
      },
      "value": "size_of :: < PrismEtf > ()"
    },
    {
      "name": "MAX_WEIGHTED_TOKENS",
      "type": {
        "defined": "usize"
      },
      "value": "10"
    }
  ],
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "beamsplitter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "initWeightedTokens",
      "accounts": [
        {
          "name": "weightedTokens",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "initTransferredTokens",
      "accounts": [
        {
          "name": "transferredTokens",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "initPrismEtf",
      "accounts": [
        {
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "weightedTokens",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "prismEtfMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "manager",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "finalizePrismEtf",
      "accounts": [
        {
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "prismEtfMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "manager",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "pushTokens",
      "accounts": [
        {
          "name": "prismEtf",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "weightedTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "prismEtfMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "manager",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newTokens",
          "type": {
            "vec": {
              "defined": "WeightedToken"
            }
          }
        }
      ]
    },
    {
      "name": "initOrderState",
      "accounts": [
        {
          "name": "prismEtfMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "orderState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "transferredTokens",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "orderer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "startOrder",
      "accounts": [
        {
          "name": "prismEtfMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "prismEtf",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "orderState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "weightedTokens",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transferredTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "orderer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "ordererEtfAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "orderType",
          "type": {
            "defined": "OrderType"
          }
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "cohere",
      "accounts": [
        {
          "name": "prismEtfMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "prismEtf",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "orderState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "weightedTokens",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transferredTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "orderer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "transferAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transferMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "ordererTransferAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "beamsplitterTransferAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "index",
          "type": "u16"
        }
      ]
    },
    {
      "name": "decohere",
      "accounts": [
        {
          "name": "prismEtfMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "prismEtf",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "orderState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "weightedTokens",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transferredTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "orderer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "transferAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transferMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "ordererTransferAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "beamsplitterTransferAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "index",
          "type": "u16"
        }
      ]
    },
    {
      "name": "finalizeOrder",
      "accounts": [
        {
          "name": "prismEtfMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "prismEtf",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "orderState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "weightedTokens",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transferredTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "orderer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "ordererEtfAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "manager",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "managerEtfAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "ownerEtfAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "setOwner",
      "accounts": [
        {
          "name": "newOwner",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "setDefaultManagerCut",
      "accounts": [
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newDefaultManagerCut",
          "type": "u16"
        }
      ]
    },
    {
      "name": "setDefaultConstructionBps",
      "accounts": [
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newConstructionBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "setDefaultDeconstructionBps",
      "accounts": [
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newDeconstructionBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "setManager",
      "accounts": [
        {
          "name": "prismEtfMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newManager",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "manager",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "setManagerCut",
      "accounts": [
        {
          "name": "prismEtfMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "manager",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newDefaultManagerCut",
          "type": "u16"
        }
      ]
    },
    {
      "name": "setConstructionBps",
      "accounts": [
        {
          "name": "prismEtfMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newConstructionBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "setDeconstructionBps",
      "accounts": [
        {
          "name": "prismEtfMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newDeconstructionBps",
          "type": "u16"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "prismEtf",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "manager",
            "type": "publicKey"
          },
          {
            "name": "weightedTokens",
            "type": "publicKey"
          },
          {
            "name": "status",
            "type": {
              "defined": "PrismEtfStatus"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "constructionBps",
            "type": "u16"
          },
          {
            "name": "deconstructionBps",
            "type": "u16"
          },
          {
            "name": "managerCut",
            "type": "u16"
          },
          {
            "name": "managerFee",
            "type": "u16"
          },
          {
            "name": "rebalancingMode",
            "type": {
              "defined": "RebalancingMode"
            }
          },
          {
            "name": "autorebalancingSchedule",
            "type": {
              "defined": "AutorebalancingSchedule"
            }
          },
          {
            "name": "managerSchedule",
            "type": {
              "defined": "ManagerSchedule"
            }
          }
        ]
      }
    },
    {
      "name": "weightedTokens",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u16"
          },
          {
            "name": "capacity",
            "type": "u16"
          },
          {
            "name": "weightedTokens",
            "type": {
              "array": [
                {
                  "defined": "WeightedToken"
                },
                10
              ]
            }
          }
        ]
      }
    },
    {
      "name": "orderState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "transferredTokens",
            "type": "publicKey"
          },
          {
            "name": "orderType",
            "type": {
              "defined": "OrderType"
            }
          },
          {
            "name": "status",
            "type": {
              "defined": "OrderStatus"
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "transferredTokens",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u16"
          },
          {
            "name": "capacity",
            "type": "u16"
          },
          {
            "name": "transferredTokens",
            "type": {
              "array": [
                "bool",
                10
              ]
            }
          }
        ]
      }
    },
    {
      "name": "beamsplitter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "defaultConstructionBps",
            "type": "u16"
          },
          {
            "name": "defaultDeconstructionBps",
            "type": "u16"
          },
          {
            "name": "defaultManagerCut",
            "type": "u16"
          },
          {
            "name": "autorebalancer",
            "type": "publicKey"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "WeightedToken",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "weight",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "PrismEtfStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "UNFINISHED"
          },
          {
            "name": "FINISHED"
          }
        ]
      }
    },
    {
      "name": "OrderType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "DECONSTRUCTION"
          },
          {
            "name": "CONSTRUCTION"
          }
        ]
      }
    },
    {
      "name": "OrderStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "PENDING"
          },
          {
            "name": "CANCELLED"
          },
          {
            "name": "SUCCEEDED"
          }
        ]
      }
    },
    {
      "name": "RebalancingMode",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "OFF"
          },
          {
            "name": "MANUAL"
          }
        ]
      }
    },
    {
      "name": "AutorebalancingSchedule",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "NEVER"
          }
        ]
      }
    },
    {
      "name": "ManagerSchedule",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "NEVER"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "NotMintAuthority",
      "msg": "Attempted to register prism etf but Beamsplitter was not mint authority over passed token mint"
    },
    {
      "code": 6001,
      "name": "NonZeroSupply",
      "msg": "Attempted to register prism etf but intial token supply was NOT 0."
    },
    {
      "code": 6002,
      "name": "NoSameMintAccounts",
      "msg": "The to_mint cannot be the same as from_mint"
    },
    {
      "code": 6003,
      "name": "EmptyDeposit",
      "msg": "Deposit was 0 when attempting to buy"
    },
    {
      "code": 6004,
      "name": "SwapTokensCannotMatch",
      "msg": "The tokens being swapped must have different mints"
    },
    {
      "code": 6005,
      "name": "SlippageExceeded",
      "msg": "Slippage tolerance exceeded"
    },
    {
      "code": 6006,
      "name": "ETFFull",
      "msg": "PrismEtf full, cannot add anymore assets"
    },
    {
      "code": 6007,
      "name": "IsFinished",
      "msg": "The ETF is already done being built and cannot be modified further without rebalancing"
    },
    {
      "code": 6008,
      "name": "StillPending",
      "msg": "Attempted to finalize but etf is still pending (some assets not transferred)"
    },
    {
      "code": 6009,
      "name": "IncorrectOrderStatus",
      "msg": "Incorrect Order Status"
    },
    {
      "code": 6010,
      "name": "IncorrectOrderType",
      "msg": "Incorrect Order Type"
    },
    {
      "code": 6011,
      "name": "NotEnoughApproved",
      "msg": "Not enough approved."
    },
    {
      "code": 6012,
      "name": "IndexPassedBound",
      "msg": "Index passed bound"
    },
    {
      "code": 6013,
      "name": "WrongIndexMint",
      "msg": "Wrong asset mint. Mint keys did not match. Try changing index passed."
    },
    {
      "code": 6014,
      "name": "ScaleFailure",
      "msg": "Scaling failed or overflowed."
    },
    {
      "code": 6015,
      "name": "U64Failure",
      "msg": "Decimal to u64 conversion failed or overflowed."
    },
    {
      "code": 6016,
      "name": "PrismEtfNotFinished",
      "msg": "Prism Etf was not done being designed when you tried to start an order."
    },
    {
      "code": 6017,
      "name": "ZeroOrder",
      "msg": "Attempted to start an order of 0"
    },
    {
      "code": 6018,
      "name": "ZeroWeight",
      "msg": "Attempted to set a weight at 0"
    },
    {
      "code": 6019,
      "name": "NotFreezeAuthority",
      "msg": "Attempted to register prism etf but freeze authority exists and it's not Beamsplitter for passed token mint"
    }
  ]
};

export const IDL: CoherenceBeamsplitter = {
  "version": "0.1.0",
  "name": "coherence_beamsplitter",
  "constants": [
    {
      "name": "DEFAULT_CONSTRUCT_BPS",
      "type": "u16",
      "value": "90"
    },
    {
      "name": "DEFAULT_DECONSTRUCT_BPS",
      "type": "u16",
      "value": "0"
    },
    {
      "name": "DEFAULT_MANAGER_BPS",
      "type": "u16",
      "value": "2_000"
    },
    {
      "name": "BASIS_POINT_DECIMALS",
      "type": "u8",
      "value": "4"
    },
    {
      "name": "_PRISM_ETF_SIZE",
      "type": {
        "defined": "usize"
      },
      "value": "size_of :: < PrismEtf > ()"
    },
    {
      "name": "MAX_WEIGHTED_TOKENS",
      "type": {
        "defined": "usize"
      },
      "value": "10"
    }
  ],
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "beamsplitter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "initWeightedTokens",
      "accounts": [
        {
          "name": "weightedTokens",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "initTransferredTokens",
      "accounts": [
        {
          "name": "transferredTokens",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "initPrismEtf",
      "accounts": [
        {
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "weightedTokens",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "prismEtfMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "manager",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "finalizePrismEtf",
      "accounts": [
        {
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "prismEtfMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "manager",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "pushTokens",
      "accounts": [
        {
          "name": "prismEtf",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "weightedTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "prismEtfMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "manager",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newTokens",
          "type": {
            "vec": {
              "defined": "WeightedToken"
            }
          }
        }
      ]
    },
    {
      "name": "initOrderState",
      "accounts": [
        {
          "name": "prismEtfMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "orderState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "transferredTokens",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "orderer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "startOrder",
      "accounts": [
        {
          "name": "prismEtfMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "prismEtf",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "orderState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "weightedTokens",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transferredTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "orderer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "ordererEtfAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "orderType",
          "type": {
            "defined": "OrderType"
          }
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "cohere",
      "accounts": [
        {
          "name": "prismEtfMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "prismEtf",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "orderState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "weightedTokens",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transferredTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "orderer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "transferAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transferMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "ordererTransferAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "beamsplitterTransferAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "index",
          "type": "u16"
        }
      ]
    },
    {
      "name": "decohere",
      "accounts": [
        {
          "name": "prismEtfMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "prismEtf",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "orderState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "weightedTokens",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transferredTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "orderer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "transferAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transferMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "ordererTransferAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "beamsplitterTransferAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "index",
          "type": "u16"
        }
      ]
    },
    {
      "name": "finalizeOrder",
      "accounts": [
        {
          "name": "prismEtfMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "prismEtf",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "orderState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "weightedTokens",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transferredTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "orderer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "ordererEtfAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "manager",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "managerEtfAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "ownerEtfAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "setOwner",
      "accounts": [
        {
          "name": "newOwner",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "setDefaultManagerCut",
      "accounts": [
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newDefaultManagerCut",
          "type": "u16"
        }
      ]
    },
    {
      "name": "setDefaultConstructionBps",
      "accounts": [
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newConstructionBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "setDefaultDeconstructionBps",
      "accounts": [
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newDeconstructionBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "setManager",
      "accounts": [
        {
          "name": "prismEtfMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newManager",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "manager",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "setManagerCut",
      "accounts": [
        {
          "name": "prismEtfMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "manager",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newDefaultManagerCut",
          "type": "u16"
        }
      ]
    },
    {
      "name": "setConstructionBps",
      "accounts": [
        {
          "name": "prismEtfMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newConstructionBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "setDeconstructionBps",
      "accounts": [
        {
          "name": "prismEtfMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newDeconstructionBps",
          "type": "u16"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "prismEtf",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "manager",
            "type": "publicKey"
          },
          {
            "name": "weightedTokens",
            "type": "publicKey"
          },
          {
            "name": "status",
            "type": {
              "defined": "PrismEtfStatus"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "constructionBps",
            "type": "u16"
          },
          {
            "name": "deconstructionBps",
            "type": "u16"
          },
          {
            "name": "managerCut",
            "type": "u16"
          },
          {
            "name": "managerFee",
            "type": "u16"
          },
          {
            "name": "rebalancingMode",
            "type": {
              "defined": "RebalancingMode"
            }
          },
          {
            "name": "autorebalancingSchedule",
            "type": {
              "defined": "AutorebalancingSchedule"
            }
          },
          {
            "name": "managerSchedule",
            "type": {
              "defined": "ManagerSchedule"
            }
          }
        ]
      }
    },
    {
      "name": "weightedTokens",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u16"
          },
          {
            "name": "capacity",
            "type": "u16"
          },
          {
            "name": "weightedTokens",
            "type": {
              "array": [
                {
                  "defined": "WeightedToken"
                },
                10
              ]
            }
          }
        ]
      }
    },
    {
      "name": "orderState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "transferredTokens",
            "type": "publicKey"
          },
          {
            "name": "orderType",
            "type": {
              "defined": "OrderType"
            }
          },
          {
            "name": "status",
            "type": {
              "defined": "OrderStatus"
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "transferredTokens",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u16"
          },
          {
            "name": "capacity",
            "type": "u16"
          },
          {
            "name": "transferredTokens",
            "type": {
              "array": [
                "bool",
                10
              ]
            }
          }
        ]
      }
    },
    {
      "name": "beamsplitter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "defaultConstructionBps",
            "type": "u16"
          },
          {
            "name": "defaultDeconstructionBps",
            "type": "u16"
          },
          {
            "name": "defaultManagerCut",
            "type": "u16"
          },
          {
            "name": "autorebalancer",
            "type": "publicKey"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "WeightedToken",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "weight",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "PrismEtfStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "UNFINISHED"
          },
          {
            "name": "FINISHED"
          }
        ]
      }
    },
    {
      "name": "OrderType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "DECONSTRUCTION"
          },
          {
            "name": "CONSTRUCTION"
          }
        ]
      }
    },
    {
      "name": "OrderStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "PENDING"
          },
          {
            "name": "CANCELLED"
          },
          {
            "name": "SUCCEEDED"
          }
        ]
      }
    },
    {
      "name": "RebalancingMode",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "OFF"
          },
          {
            "name": "MANUAL"
          }
        ]
      }
    },
    {
      "name": "AutorebalancingSchedule",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "NEVER"
          }
        ]
      }
    },
    {
      "name": "ManagerSchedule",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "NEVER"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "NotMintAuthority",
      "msg": "Attempted to register prism etf but Beamsplitter was not mint authority over passed token mint"
    },
    {
      "code": 6001,
      "name": "NonZeroSupply",
      "msg": "Attempted to register prism etf but intial token supply was NOT 0."
    },
    {
      "code": 6002,
      "name": "NoSameMintAccounts",
      "msg": "The to_mint cannot be the same as from_mint"
    },
    {
      "code": 6003,
      "name": "EmptyDeposit",
      "msg": "Deposit was 0 when attempting to buy"
    },
    {
      "code": 6004,
      "name": "SwapTokensCannotMatch",
      "msg": "The tokens being swapped must have different mints"
    },
    {
      "code": 6005,
      "name": "SlippageExceeded",
      "msg": "Slippage tolerance exceeded"
    },
    {
      "code": 6006,
      "name": "ETFFull",
      "msg": "PrismEtf full, cannot add anymore assets"
    },
    {
      "code": 6007,
      "name": "IsFinished",
      "msg": "The ETF is already done being built and cannot be modified further without rebalancing"
    },
    {
      "code": 6008,
      "name": "StillPending",
      "msg": "Attempted to finalize but etf is still pending (some assets not transferred)"
    },
    {
      "code": 6009,
      "name": "IncorrectOrderStatus",
      "msg": "Incorrect Order Status"
    },
    {
      "code": 6010,
      "name": "IncorrectOrderType",
      "msg": "Incorrect Order Type"
    },
    {
      "code": 6011,
      "name": "NotEnoughApproved",
      "msg": "Not enough approved."
    },
    {
      "code": 6012,
      "name": "IndexPassedBound",
      "msg": "Index passed bound"
    },
    {
      "code": 6013,
      "name": "WrongIndexMint",
      "msg": "Wrong asset mint. Mint keys did not match. Try changing index passed."
    },
    {
      "code": 6014,
      "name": "ScaleFailure",
      "msg": "Scaling failed or overflowed."
    },
    {
      "code": 6015,
      "name": "U64Failure",
      "msg": "Decimal to u64 conversion failed or overflowed."
    },
    {
      "code": 6016,
      "name": "PrismEtfNotFinished",
      "msg": "Prism Etf was not done being designed when you tried to start an order."
    },
    {
      "code": 6017,
      "name": "ZeroOrder",
      "msg": "Attempted to start an order of 0"
    },
    {
      "code": 6018,
      "name": "ZeroWeight",
      "msg": "Attempted to set a weight at 0"
    },
    {
      "code": 6019,
      "name": "NotFreezeAuthority",
      "msg": "Attempted to register prism etf but freeze authority exists and it's not Beamsplitter for passed token mint"
    }
  ]
};
