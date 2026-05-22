import { useState } from 'react';
import { isConnected, requestAccess, getAddress, signTransaction } from '@stellar/freighter-api';
import * as StellarSdk from '@stellar/stellar-sdk';
import './App.css';

function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [targetAddress, setTargetAddress] = useState("");
  const [task, setTask] = useState("");
  const [bounty, setBounty] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 1. THAY MÃ CONTRACT CỦA BẠN VÀO ĐÂY (Lấy từ ảnh Stellar Expert)
  const CONTRACT_ID = "CCFQQES5ENX7LIPEPSUXWVQVU2O7L74CNMGMFQRGTTZJJFNYTVQUPU4P"; 
  
  // Cấu hình mạng Testnet
  const RPC_URL = "https://soroban-testnet.stellar.org";
  const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;

  // --- HÀM 1: KẾT NỐI VÍ ---
  const connectFreighter = async () => {
    try {
      if (!(await isConnected())) return alert("Freighter wallet is not installed!");
      await requestAccess();
      const userInfo = await getAddress();
      setWalletAddress(userInfo.address ? userInfo.address : userInfo);
    } catch (error) {
      console.error(error);
      alert("Failed to connect. Please unlock your wallet!");
    }
  };

  // --- HÀM 2: GIAO TIẾP VỚI BLOCKCHAIN (LÕI CHÍNH) ---
  const callSmartContract = async (functionName, args = []) => {
    try {
      setIsLoading(true);
      // ĐÃ SỬA: Dùng rpc.Server cho phiên bản SDK mới nhất
      const server = new StellarSdk.rpc.Server(RPC_URL); 
      const account = await server.getAccount(walletAddress);
      const contract = new StellarSdk.Contract(CONTRACT_ID);

      // 1. Xây dựng gói giao dịch
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
      .addOperation(contract.call(functionName, ...args))
      .setTimeout(30)
      .build();

      // 2. Mô phỏng để tính toán phí Gas
      const preparedTx = await server.prepareTransaction(tx);

      // 3. Đẩy popup lên bắt người dùng ký bằng ví Freighter
      const { signedTxXdr } = await signTransaction(preparedTx.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      // 4. Gửi giao dịch đã ký lên mạng lưới
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
      const response = await server.sendTransaction(signedTx);
      
      console.log("Transaction details:", response);
      alert(`Thành công! Giao dịch đã được ghi lên chuỗi.\nHash: ${response.hash.substring(0, 10)}...`);
      setIsLoading(false);
      return response;

    } catch (error) {
      console.error("Lỗi giao dịch:", error);
      alert("Giao dịch thất bại! Hãy check F12 Console để xem chi tiết.");
      setIsLoading(false);
    }
  };

  // --- HÀM 3: XỬ LÝ NÚT TẠO KÈO ---
  const handleCreateDare = async () => {
    if (!walletAddress) return alert("Vui lòng kết nối ví trước!");
    if (!targetAddress || !task || !bounty) return alert("Vui lòng nhập đủ thông tin!");

    // Ép kiểu dữ liệu (Data Types) để Soroban hiểu được
    const args = [
      StellarSdk.nativeToScVal(walletAddress, { type: "address" }), // creator
      StellarSdk.nativeToScVal(targetAddress, { type: "address" }), // target
      StellarSdk.nativeToScVal(task, { type: "string" }),           // task
      StellarSdk.nativeToScVal(Number(bounty), { type: "u32" })     // bounty
    ];

    await callSmartContract("create_dare", args);
  };

  // --- HÀM 4: XỬ LÝ NÚT NHẬN THƯỞNG ---
  const handleClaimBounty = async () => {
    if (!walletAddress) return alert("Vui lòng kết nối ví trước!");
    
    // Hàm này chỉ cần địa chỉ của người claim (target)
    const args = [
      StellarSdk.nativeToScVal(walletAddress, { type: "address" })
    ];

    await callSmartContract("claim_bounty", args);
  };

  return (
    <div className="container">
      <h1>🎯 DareDrop</h1>
      <p className="subtitle">Put your crypto where your mouth is.</p>

      <button className={walletAddress ? "btn-connected" : "btn-green"} onClick={connectFreighter}>
        {walletAddress ? "Wallet Linked" : "Connect Freighter"}
      </button>
      <p id="wallet-address">{walletAddress ? `Connected: ${walletAddress.substring(0, 12)}...` : "Status: Offline"}</p>

      <div className="box">
        <h3>1. Issue a Dare</h3>
        <input type="text" placeholder="Target's Wallet (G...)" value={targetAddress} onChange={(e) => setTargetAddress(e.target.value)} />
        <textarea rows="2" placeholder="e.g., Do 50 pushups right now" value={task} onChange={(e) => setTask(e.target.value)}></textarea>
        <input type="number" placeholder="Bounty (XLM)" value={bounty} onChange={(e) => setBounty(e.target.value)} />
        <button className="btn-purple" onClick={handleCreateDare} disabled={isLoading}>
          {isLoading ? "Đang xử lý..." : "Lock Bounty & Dare"}
        </button>
      </div>

      <div className="box success">
        <h3>2. Claim Bounty</h3>
        <p className="hint">Did the dare? Click here to prove it and sweep the funds.</p>
        <button className="btn-green-outline" onClick={handleClaimBounty} disabled={isLoading}>
           {isLoading ? "Đang xác nhận..." : "I Did It! (Claim)"}
        </button>
      </div>
    </div>
  );
}

export default App;