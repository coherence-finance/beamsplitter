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
      "name": "DEFAULT_TIMEOUT_SLOTS",
      "type": "u16",
      "value": "10"
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
      "value": "100"
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
          "isMut": true,
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
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
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
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
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
          "name": "prismEtf",
          "isMut": false,
          "isSigner": false
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
          "name": "transferredTokens",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "orderer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "orderState",
          "isMut": true,
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
          "name": "beamsplitter",
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
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
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
          "name": "orderer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "prismEtfMint",
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
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
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
          "name": "orderer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "prismEtfMint",
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
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
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
          "name": "orderer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "manager",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "ordererEtfAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "managerEtfAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "ownerEtfAta",
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
          "name": "beamsplitter",
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
      "name": "closePrismEtf",
      "accounts": [
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
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
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
      "args": []
    },
    {
      "name": "closeOrderState",
      "accounts": [
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
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
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
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
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
          "name": "manager",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
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
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
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
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
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
            "name": "referer",
            "type": "publicKey"
          },
          {
            "name": "totalSharedOrderStates",
            "type": "u16"
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
            "name": "length",
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
                100
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
            "name": "orderer",
            "type": "publicKey"
          },
          {
            "name": "timeout",
            "type": "u64"
          },
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
            "name": "length",
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
                100
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
            "name": "defaultManagerFee",
            "type": "u16"
          },
          {
            "name": "referralCut",
            "type": "u16"
          },
          {
            "name": "timeoutSlots",
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
    },
    {
      "name": "BeamsplitterErrors",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "NotMintAuthority"
          },
          {
            "name": "NonZeroSupply"
          },
          {
            "name": "NoSameMintAccounts"
          },
          {
            "name": "EmptyDeposit"
          },
          {
            "name": "SwapTokensCannotMatch"
          },
          {
            "name": "SlippageExceeded"
          },
          {
            "name": "ETFFull"
          },
          {
            "name": "IsFinished"
          },
          {
            "name": "StillPending"
          },
          {
            "name": "IncorrectOrderStatus"
          },
          {
            "name": "IncorrectOrderType"
          },
          {
            "name": "NotEnoughApproved"
          },
          {
            "name": "IndexPassedBound"
          },
          {
            "name": "WrongIndexMint"
          },
          {
            "name": "ScaleFailure"
          },
          {
            "name": "U64Failure"
          },
          {
            "name": "PrismEtfNotFinished"
          },
          {
            "name": "ZeroOrder"
          },
          {
            "name": "ZeroWeight"
          },
          {
            "name": "NotFreezeAuthority"
          },
          {
            "name": "PotentialUnderflow"
          },
          {
            "name": "CouldNotBecomeOrderer"
          }
        ]
      }
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
      "name": "DEFAULT_TIMEOUT_SLOTS",
      "type": "u16",
      "value": "10"
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
      "value": "100"
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
          "isMut": true,
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
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
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
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
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
          "name": "prismEtf",
          "isMut": false,
          "isSigner": false
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
          "name": "transferredTokens",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "orderer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "beamsplitter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "orderState",
          "isMut": true,
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
          "name": "beamsplitter",
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
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
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
          "name": "orderer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "prismEtfMint",
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
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
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
          "name": "orderer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "prismEtfMint",
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
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
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
          "name": "orderer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "manager",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "ordererEtfAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "managerEtfAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "ownerEtfAta",
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
          "name": "beamsplitter",
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
      "name": "closePrismEtf",
      "accounts": [
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
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
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
      "args": []
    },
    {
      "name": "closeOrderState",
      "accounts": [
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
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
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
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
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
          "name": "manager",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
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
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
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
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "prismEtf",
          "isMut": true,
          "isSigner": false
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
            "name": "referer",
            "type": "publicKey"
          },
          {
            "name": "totalSharedOrderStates",
            "type": "u16"
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
            "name": "length",
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
                100
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
            "name": "orderer",
            "type": "publicKey"
          },
          {
            "name": "timeout",
            "type": "u64"
          },
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
            "name": "length",
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
                100
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
            "name": "defaultManagerFee",
            "type": "u16"
          },
          {
            "name": "referralCut",
            "type": "u16"
          },
          {
            "name": "timeoutSlots",
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
    },
    {
      "name": "BeamsplitterErrors",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "NotMintAuthority"
          },
          {
            "name": "NonZeroSupply"
          },
          {
            "name": "NoSameMintAccounts"
          },
          {
            "name": "EmptyDeposit"
          },
          {
            "name": "SwapTokensCannotMatch"
          },
          {
            "name": "SlippageExceeded"
          },
          {
            "name": "ETFFull"
          },
          {
            "name": "IsFinished"
          },
          {
            "name": "StillPending"
          },
          {
            "name": "IncorrectOrderStatus"
          },
          {
            "name": "IncorrectOrderType"
          },
          {
            "name": "NotEnoughApproved"
          },
          {
            "name": "IndexPassedBound"
          },
          {
            "name": "WrongIndexMint"
          },
          {
            "name": "ScaleFailure"
          },
          {
            "name": "U64Failure"
          },
          {
            "name": "PrismEtfNotFinished"
          },
          {
            "name": "ZeroOrder"
          },
          {
            "name": "ZeroWeight"
          },
          {
            "name": "NotFreezeAuthority"
          },
          {
            "name": "PotentialUnderflow"
          },
          {
            "name": "CouldNotBecomeOrderer"
          }
        ]
      }
    }
  ]
};
