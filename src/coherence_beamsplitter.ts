export type CoherenceBeamsplitter = {
  "version": "0.1.0",
  "name": "coherence_beamsplitter",
  "constants": [
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
      "value": "400"
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
          "name": "ordererEtfAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "beamsplitter",
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
          "type": "bool"
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
          "isMut": false,
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
          "type": "u32"
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
          "isMut": false,
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
          "type": "u32"
        }
      ]
    },
    {
      "name": "finalizeOrder",
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
      "args": []
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
            "name": "isFinished",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
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
            "type": "u32"
          },
          {
            "name": "capacity",
            "type": "u32"
          },
          {
            "name": "weightedTokens",
            "type": {
              "array": [
                {
                  "defined": "WeightedToken"
                },
                400
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
            "name": "isConstruction",
            "type": "bool"
          },
          {
            "name": "isPending",
            "type": "bool"
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
            "type": "u32"
          },
          {
            "name": "capacity",
            "type": "u32"
          },
          {
            "name": "transferredTokens",
            "type": {
              "array": [
                "bool",
                400
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
            "type": "u32"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "NotMintAuthority",
      "msg": "Attempted to register prism etf but Beamsplitter was not authority over passed token AND you are not Beamsplitter owner"
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
    }
  ]
};

export const IDL: CoherenceBeamsplitter = {
  "version": "0.1.0",
  "name": "coherence_beamsplitter",
  "constants": [
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
      "value": "400"
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
          "name": "ordererEtfAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "beamsplitter",
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
          "type": "bool"
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
          "isMut": false,
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
          "type": "u32"
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
          "isMut": false,
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
          "type": "u32"
        }
      ]
    },
    {
      "name": "finalizeOrder",
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
      "args": []
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
            "name": "isFinished",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
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
            "type": "u32"
          },
          {
            "name": "capacity",
            "type": "u32"
          },
          {
            "name": "weightedTokens",
            "type": {
              "array": [
                {
                  "defined": "WeightedToken"
                },
                400
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
            "name": "isConstruction",
            "type": "bool"
          },
          {
            "name": "isPending",
            "type": "bool"
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
            "type": "u32"
          },
          {
            "name": "capacity",
            "type": "u32"
          },
          {
            "name": "transferredTokens",
            "type": {
              "array": [
                "bool",
                400
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
            "type": "u32"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "NotMintAuthority",
      "msg": "Attempted to register prism etf but Beamsplitter was not authority over passed token AND you are not Beamsplitter owner"
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
    }
  ]
};
