import { useLogin } from "@privy-io/react-auth";
import { PrivyClient } from "@privy-io/server-auth";
import { GetServerSideProps } from "next";
import Head from "next/head";
import { useState, useEffect } from "react";
import { usePrivy, useWallets, useLogout } from "@privy-io/react-auth";
import Navbar from "../components/Navbar";

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookieAuthToken = req.cookies["privy-token"];

  // If no cookie is found, skip any further checks
  if (!cookieAuthToken) return { props: {} };

  const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;
  const client = new PrivyClient(PRIVY_APP_ID!, PRIVY_APP_SECRET!);

  try {
    const claims = await client.verifyAuthToken(cookieAuthToken);
    // Use this result to pass props to a page for server rendering or to drive redirects!
    // ref https://nextjs.org/docs/pages/api-reference/functions/get-server-side-props
    console.log({ claims });

    return {
      props: {},
      // redirect: { destination: "/dashboard", permanent: false },
    };
  } catch (error) {
    return { props: {} };
  }
};

export default function LoginPage() {
  const { user, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { login } = useLogin({
    // Remove the onComplete redirect to dashboard
  });
  const { logout } = useLogout();

  const [category, setCategory] = useState("");
  const [feedback, setFeedback] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [balance, setBalance] = useState("0");
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasExistingPayment, setHasExistingPayment] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);
  const [isCheckingFeedback, setIsCheckingFeedback] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: "",
    message: "",
    type: "info" as "success" | "error" | "info" | "warning"
  });

  // Recipient wallet address for payments (you can change this)
  const PAYMENT_RECIPIENT = "0x758aE4Ff7acfB8912E4938EC1cdcfb4327F7c397"; // Example address
  const PAYMENT_AMOUNT = "0.01"; // MON amount

  // Update wallet address when user changes
  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      setWalletAddress(user.wallet.address);
      fetchBalance(user.wallet.address);
      checkExistingPayment(user.wallet.address);
      checkExistingFeedback(user.wallet.address);
    } else {
      setWalletAddress("");
      setBalance("0");
      setHasExistingPayment(false);
      setHasSubmittedFeedback(false);
    }
  }, [authenticated, user]);

  // Check if wallet has existing payment
  const checkExistingPayment = async (address: string) => {
    setIsCheckingPayment(true);
    try {
      const response = await fetch('/api/check-payment-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });
      
      if (response.ok) {
        const data = await response.json();
        setHasExistingPayment(data.hasPayment);
      } else {
        console.error('Failed to check payment status');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // Check if wallet has already submitted feedback
  const checkExistingFeedback = async (address: string) => {
    setIsCheckingFeedback(true);
    try {
      const response = await fetch('/api/check-feedback-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });
      
      if (response.ok) {
        const data = await response.json();
        setHasSubmittedFeedback(data.hasSubmittedFeedback);
      } else {
        console.error('Failed to check feedback status');
      }
    } catch (error) {
      console.error('Error checking feedback status:', error);
    } finally {
      setIsCheckingFeedback(false);
    }
  };

  // Fetch MON balance using Monad RPC
  const fetchBalance = async (address: string) => {
    setIsBalanceLoading(true);
    try {
      // Call Monad RPC to get balance
      const response = await fetch('/api/monad-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Convert from wei to MON (18 decimals) and format to 4 decimal places
        const balanceInMON = (parseFloat(data.balance) / Math.pow(10, 18)).toFixed(4);
        setBalance(balanceInMON);
      } else {
        throw new Error('Failed to fetch balance');
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      // Fallback to showing 0 balance if RPC fails
      setBalance("0.0000");
    } finally {
      setIsBalanceLoading(false);
    }
  };

  const handleRefreshBalance = () => {
    if (walletAddress) {
      fetchBalance(walletAddress);
    }
  };

  // Function to show modal instead of alert
  const showModalMessage = (title: string, message: string, type: "success" | "error" | "info" | "warning" = "info") => {
    setModalContent({ title, message, type });
    setShowModal(true);
  };

  // Modal Component
  const Modal = () => {
    if (!showModal) return null;

    const getModalIcon = () => {
      switch (modalContent.type) {
        case "success":
          return (
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          );
        case "error":
          return (
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          );
        case "warning":
          return (
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          );
        default:
          return (
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          );
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-2xl border border-gray-600 max-w-md w-full p-6 shadow-2xl">
          <div className="text-center">
            {getModalIcon()}
            
            <h3 className="text-xl font-semibold text-monad-off-white mb-3">
              {modalContent.title}
            </h3>
            
            <div className="text-gray-300 mb-6 text-sm leading-relaxed whitespace-pre-line">
              {modalContent.message}
            </div>
            
            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-monad-purple hover:bg-opacity-90 text-white py-3 rounded-lg font-medium transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  };
  // Log wallets whenever they change
  useEffect(() => {
    console.log('Wallets:', wallets);
  }, [wallets]);

  const handlePayment = async () => {
    if (!walletAddress || !wallets[0]) return;
    
    // Check if user already has a payment
    if (hasExistingPayment) {
      showModalMessage("Payment Already Made", "You have already made a payment and can submit feedback!", "info");
      return;
    }
    
    setIsPaymentProcessing(true);
    setPaymentStatus("Preparing transaction...");
    
    try {
      // Convert 0.001 MON to wei (18 decimals)
      // const amountInWei = (parseFloat(PAYMENT_AMOUNT) * Math.pow(10, 18)).toString();
      // const amountInWei = `0x${(parseFloat(PAYMENT_AMOUNT) * Math.pow(10, 18)).toString(16)}`;
      const amountInWei = "0x2386f26fc10000"; 
      console.log('Sending transaction...');
      setPaymentStatus("Sending transaction...");
      const selectedWallet = wallets.find(wallet => wallet.address === walletAddress);
      console.log('Selected wallet:', selectedWallet);
      if(!selectedWallet) return
      try {
        await selectedWallet.switchChain(10143);
      } catch (error) {
        console.warn('Chain switch failed:', error);
        // Continue anyway
      }
      const provider = await selectedWallet.getEthereumProvider();
      const gasPrice = await provider.request({
        method: 'eth_gasPrice'
      });
      
      const transactionRequest = {
        from: walletAddress,
        to: PAYMENT_RECIPIENT, // Payment goes to form creator
        value: amountInWei,
        gas: '0x5208', // 21000 gas limit for simple transfer
        gasPrice: gasPrice,
      };
      
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [transactionRequest]
      });
      
      // Record the payment in Supabase as pending
      try {
        await fetch('/api/record-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentHash: txHash,
            walletAddress: walletAddress,
            amount: PAYMENT_AMOUNT,
            status: 'pending'
          })
        });
      } catch (error) {
        console.error('Error recording payment:', error);
        // Continue with transaction even if recording fails
      }
      
      setPaymentStatus("Waiting for confirmation...");
      showModalMessage(
        "Transaction Sent", 
        `Transaction sent! Hash: ${txHash}\n\nWaiting for confirmation...`, 
        "info"
      );

      // Wait for transaction confirmation
      console.log('Waiting for transaction confirmation...');
      
      // Poll for transaction receipt
      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 30; // Wait up to 30 seconds
      
      while (!confirmed && attempts < maxAttempts) {
        setPaymentStatus(`Confirming... (${attempts + 1}/${maxAttempts})`);
        
        try {
          const response = await fetch('/api/check-transaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ txHash })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.confirmed) {
              confirmed = true;
              console.log('Transaction confirmed!', data);
              
              // Update payment status in Supabase
              try {
                await fetch('/api/record-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    paymentHash: txHash,
                    walletAddress: walletAddress,
                    amount: PAYMENT_AMOUNT,
                    status: data.success ? 'confirmed' : 'failed',
                    blockNumber: data.blockNumber,
                    gasUsed: data.gasUsed
                  })
                });
              } catch (error) {
                console.error('Error updating payment status:', error);
              }
              
              if (data.success) {
                setPaymentStatus("Payment successful!");
                setHasExistingPayment(true); // Update local state
                showModalMessage(
                  "Payment Successful!",
                  `Transaction Hash: ${txHash}\nAmount: ${PAYMENT_AMOUNT} MON\nTo: ${PAYMENT_RECIPIENT}\n\nBlock: ${data.blockNumber}\nGas Used: ${data.gasUsed}\n\nYou can now submit feedback!`,
                  "success"
                );
              } else {
                setPaymentStatus("Transaction failed!");
                showModalMessage(
                  "Transaction Failed!",
                  `Hash: ${txHash}\nThe transaction was confirmed but failed during execution.`,
                  "error"
                );
              }
            }
          }
        } catch (error) {
          console.log('Checking confirmation...', attempts + 1);
        }
        
        if (!confirmed) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        }
      }
      
      if (!confirmed) {
        setPaymentStatus("Confirmation timeout");
        showModalMessage(
          "Confirmation Timeout",
          `Transaction sent but confirmation timeout.\nHash: ${txHash}\nPlease check the explorer manually.`,
          "warning"
        );
      }
      
      // Refresh balance after payment (confirmed or not)
      setTimeout(() => fetchBalance(walletAddress), 2000);
      
    } catch (error) {
      console.error('Payment failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPaymentStatus("Payment failed");
      showModalMessage(
        "Payment Failed!",
        `Error: ${errorMessage}\n\nPlease try again.`,
        "error"
      );
    } finally {
      setIsPaymentProcessing(false);
      setTimeout(() => setPaymentStatus(""), 3000); // Clear status after 3 seconds
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) return;
    
    // Check if user has made payment
    if (!hasExistingPayment) {
      showModalMessage("Payment Required", "Please make a payment first to submit feedback.", "warning");
      return;
    }

    // Check if user has already submitted feedback
    if (hasSubmittedFeedback) {
      showModalMessage("Feedback Already Submitted", "You have already submitted feedback. Only one feedback submission per wallet is allowed.", "info");
      return;
    }
    
    setIsSubmittingFeedback(true);
    
    try {
      // Submit feedback to the API
      const response = await fetch('/api/submit-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          feedback: feedback.trim(), 
          category, 
          walletAddress,
          isAnonymous
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Reset form
        setCategory("");
        setFeedback("");
        
        // Update state to reflect that feedback was submitted
        setHasSubmittedFeedback(true);
        
        // Show success message
        showModalMessage(
          "Feedback Submitted", 
          `Feedback submitted anonymously!\n\nFeedback ID: ${data.feedbackId}\n\nThank you for your contribution to Monad.`, 
          "success"
        );
      } else {
        // Handle API errors
        if (response.status === 409) {
          // Already submitted feedback
          setHasSubmittedFeedback(true);
          showModalMessage(
            "Feedback Already Submitted", 
            "You have already submitted feedback. Only one feedback submission per wallet is allowed.", 
            "info"
          );
        } else {
          showModalMessage(
            "Submission Failed", 
            data.error || "Failed to submit feedback. Please try again.", 
            "error"
          );
        }
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showModalMessage(
        "Submission Error", 
        "An unexpected error occurred while submitting feedback. Please try again.", 
        "error"
      );
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  return (
    <>
      <Head>
        <title>Monad FEEDBACK</title>
      </Head>

      <main className="min-h-screen bg-monad-blue flex flex-col items-center justify-center px-4 py-8">
        {/* Modal */}
        <Modal />

        {/* Navbar */}
        <Navbar
          variant="main"
          walletAddress={walletAddress}
          balance={balance}
          isBalanceLoading={isBalanceLoading}
          onRefreshBalance={handleRefreshBalance}
          showDropdown={showDropdown}
          onToggleDropdown={toggleDropdown}
        />

        {/* Main Content */}
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-monad-off-white mb-8 tracking-wider">
          Monad Testnet FEEDBACK
          </h1>
          <p className="text-monad-off-white text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Share your honest thoughts about Monad testnet. Pay once, submit{" "}
            <span className="font-semibold">anonymously</span>. Your identity stays completely private. Earn rewards for valuable feedback!
          </p>
        </div>

        {/* Features */}
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          <div className="flex items-center bg-monad-blue bg-opacity-50 border border-monad-off-white border-opacity-20 rounded-full px-4 py-2">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
            <span className="text-monad-off-white text-sm">Fully Anonymous</span>
          </div>
          <div className="flex items-center bg-monad-blue bg-opacity-50 border border-monad-off-white border-opacity-20 rounded-full px-4 py-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
            <span className="text-monad-off-white text-sm">Spam Protected</span>
          </div>
        </div>

        {/* Feedback Form */}
        <div className="w-full max-w-2xl bg-gray-800 bg-opacity-40 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
          <h2 className="text-2xl font-semibold text-monad-off-white mb-2">Submit Feedback</h2>
          <p className="text-gray-400 text-sm mb-8">
            Connect your wallet to get started
          </p>

          {/* Wallet Connection Status */}
          <div className="flex items-center text-gray-400 text-sm mb-8 p-4 bg-gray-900 bg-opacity-50 rounded-lg">
            <div className={`w-4 h-4 border-2 ${walletAddress ? 'border-green-400' : 'border-gray-500'} rounded-full mr-3 flex items-center justify-center`}>
              <div className={`w-2 h-2 ${walletAddress ? 'bg-green-400' : 'bg-gray-500'} rounded-full`}></div>
            </div>
            {walletAddress ? (
              <div className="flex flex-col space-y-1">
                <span className="text-green-400 flex items-center space-x-5">
                <div>  Wallet connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)} </div>
                  <button
                  onClick={handlePayment}
                  disabled={isPaymentProcessing || parseFloat(balance) < parseFloat(PAYMENT_AMOUNT) || isBalanceLoading || hasExistingPayment || isCheckingPayment}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    hasExistingPayment 
                      ? 'bg-green-600 text-white cursor-default' 
                      : isPaymentProcessing || parseFloat(balance) < parseFloat(PAYMENT_AMOUNT) || isBalanceLoading || isCheckingPayment
                        ? 'bg-gray-600 text-white cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-500 text-white'
                  }`}
                >
                  {isCheckingPayment ? "Checking..." : 
                   hasExistingPayment ? "✓ Paid" : 
                   isPaymentProcessing ? (paymentStatus || "Processing...") : 
                   "Pay 0.05 MON"}
                </button>
                </span>
                {isCheckingPayment || isCheckingFeedback ? (
                  <span className="text-yellow-400 text-xs">
                    {isCheckingPayment && isCheckingFeedback 
                      ? "Checking payment and feedback status..." 
                      : isCheckingPayment 
                        ? "Checking payment status..." 
                        : "Checking feedback status..."}
                  </span>
                ) : hasSubmittedFeedback ? (
                  <span className="text-blue-400 text-xs">✓ Feedback already submitted - One submission per wallet allowed</span>
                ) : hasExistingPayment ? (
                  <span className="text-green-400 text-xs">✓ Payment verified - You can submit feedback</span>
                ) : (
                  <span className="text-orange-400 text-xs">Payment required to submit feedback</span>
                )}
              </div>
            ) : (
              "Connect your wallet to continue. We only use it for payment verification."
            )}
          </div>

          {/* Category Selection */}
          <div className="mb-6">
            <label className="block text-monad-off-white font-medium mb-3">Category</label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-monad-off-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-monad-purple focus:border-transparent"
              >
                <option value="">Select feedback category</option>
                <option value="dev">Dev</option>
                <option value="community">Community</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Feedback Text */}
          <div className="mb-6">
            <label className="block text-monad-off-white font-medium mb-3">Your Feedback</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your honest thoughts about Monad. What's working well? What could be improved? Your feedback will be completely anonymous."
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-monad-off-white placeholder-gray-500 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-monad-purple focus:border-transparent"
              maxLength={1000}
            />
            <div className="text-right text-gray-500 text-sm mt-2">
              {feedback.length}/1000 characters
            </div>
          </div>

          {/* Anonymous Checkbox */}
          <div className="mb-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="sr-only"
              />
              <div className={`relative w-5 h-5 rounded border-2 transition-colors ${
                isAnonymous 
                  ? 'bg-monad-purple border-monad-purple' 
                  : 'bg-transparent border-gray-500'
              }`}>
                {isAnonymous && (
                  <svg 
                    className="absolute inset-0 w-3 h-3 text-white m-auto" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                )}
              </div>
              <span className="ml-3 text-monad-off-white font-medium">
                Submit feedback anonymously
              </span>
            </label>
            <p className="text-gray-400 text-sm mt-2">
              {isAnonymous 
                ? "Your wallet address will not be stored with your feedback" 
                : "Your wallet address will be stored with your feedback for attribution"}
            </p>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmitFeedback}
            disabled={!feedback.trim() || !category || !hasExistingPayment || isSubmittingFeedback || hasSubmittedFeedback}
            className={`w-full py-4 rounded-lg font-medium transition-colors mb-6 ${
              hasSubmittedFeedback
                ? 'bg-blue-600 text-white cursor-default'
                : !hasExistingPayment 
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                  : !feedback.trim() || !category || isSubmittingFeedback
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-monad-purple hover:bg-opacity-90 text-white'
            }`}
          >
            {hasSubmittedFeedback
              ? "✓ Feedback Already Submitted"
              : isSubmittingFeedback 
                ? "Submitting Feedback..." 
                : !hasExistingPayment 
                  ? "Payment Required to Submit Feedback" 
                  : "Submit Anonymous Feedback"}
          </button>

          {/* Privacy Notice */}
          <div className="flex items-center justify-center text-center">
            <div className="flex items-center text-green-400 text-sm">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              {isAnonymous ? "PRIVACY GUARANTEED" : "FEEDBACK WITH ATTRIBUTION"}
            </div>
          </div>
          <p className="text-center text-gray-400 text-xs mt-2 leading-relaxed">
            {isAnonymous 
              ? "Your feedback is stored in an offchain database without your wallet address to ensure complete anonymity. No correlation between your identity and feedback content is possible."
              : "Your feedback will be stored with your wallet address for attribution. Your identity will be visible to administrators viewing the responses."}
          </p>
        </div>
      </main>
    </>
  );
}
