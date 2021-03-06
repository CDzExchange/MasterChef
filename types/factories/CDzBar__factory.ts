/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { CDzBar, CDzBarInterface } from "../CDzBar";

const _abi = [
  {
    inputs: [
      {
        internalType: "contract CDzToken",
        name: "_cdz",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    inputs: [],
    name: "cdz",
    outputs: [
      {
        internalType: "contract CDzToken",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "safeCDzTransfer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b5060405161063938038061063983398101604081905261002f916100b8565b61003f61003a610064565b610068565b600180546001600160a01b0319166001600160a01b03929092169190911790556100e6565b3390565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b6000602082840312156100c9578081fd5b81516001600160a01b03811681146100df578182fd5b9392505050565b610544806100f56000396000f3fe608060405234801561001057600080fd5b50600436106100575760003560e01c806327887e9d1461005c578063715018a6146100715780638da5cb5b14610079578063ea9d77fb14610097578063f2fde38b1461009f575b600080fd5b61006f61006a366004610405565b6100b2565b005b61006f61029a565b6100816102e5565b60405161008e9190610466565b60405180910390f35b6100816102f4565b61006f6100ad3660046103e4565b610303565b6100ba610374565b6001600160a01b03166100cb6102e5565b6001600160a01b0316146100fa5760405162461bcd60e51b81526004016100f1906104d9565b60405180910390fd5b6001546040516370a0823160e01b81526000916001600160a01b0316906370a082319061012b903090600401610466565b60206040518083038186803b15801561014357600080fd5b505afa158015610157573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061017b919061044e565b90508082111561020f5760015460405163a9059cbb60e01b81526001600160a01b039091169063a9059cbb906101b7908690859060040161047a565b602060405180830381600087803b1580156101d157600080fd5b505af11580156101e5573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610209919061042e565b50610295565b60015460405163a9059cbb60e01b81526001600160a01b039091169063a9059cbb90610241908690869060040161047a565b602060405180830381600087803b15801561025b57600080fd5b505af115801561026f573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610293919061042e565b505b505050565b6102a2610374565b6001600160a01b03166102b36102e5565b6001600160a01b0316146102d95760405162461bcd60e51b81526004016100f1906104d9565b6102e36000610378565b565b6000546001600160a01b031690565b6001546001600160a01b031681565b61030b610374565b6001600160a01b031661031c6102e5565b6001600160a01b0316146103425760405162461bcd60e51b81526004016100f1906104d9565b6001600160a01b0381166103685760405162461bcd60e51b81526004016100f190610493565b61037181610378565b50565b3390565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b80356001600160a01b03811681146103df57600080fd5b919050565b6000602082840312156103f5578081fd5b6103fe826103c8565b9392505050565b60008060408385031215610417578081fd5b610420836103c8565b946020939093013593505050565b60006020828403121561043f578081fd5b815180151581146103fe578182fd5b60006020828403121561045f578081fd5b5051919050565b6001600160a01b0391909116815260200190565b6001600160a01b03929092168252602082015260400190565b60208082526026908201527f4f776e61626c653a206e6577206f776e657220697320746865207a65726f206160408201526564647265737360d01b606082015260800190565b6020808252818101527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e657260408201526060019056fea2646970667358221220330939245c313b514a19a34a8ad1e14e8e67e31288aab24a65ff890b539cfbd064736f6c63430008000033";

export class CDzBar__factory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(
    _cdz: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<CDzBar> {
    return super.deploy(_cdz, overrides || {}) as Promise<CDzBar>;
  }
  getDeployTransaction(
    _cdz: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(_cdz, overrides || {});
  }
  attach(address: string): CDzBar {
    return super.attach(address) as CDzBar;
  }
  connect(signer: Signer): CDzBar__factory {
    return super.connect(signer) as CDzBar__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): CDzBarInterface {
    return new utils.Interface(_abi) as CDzBarInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): CDzBar {
    return new Contract(address, _abi, signerOrProvider) as CDzBar;
  }
}
