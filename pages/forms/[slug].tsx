import { useLogin } from "@privy-io/react-auth";
import { GetServerSideProps } from "next";
import Head from "next/head";
import { useState, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import Link from "next/link";
import { db } from "../../lib/database";
import Navbar from "../../components/Navbar";

interface FormProps {
  form: any;
  questions: any[];
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const slug = params?.slug as string;

  if (!slug) {
    return { notFound: true };
  }

  try {
    // Get form by slug
    const form = await db.getFormBySlug(slug);
    if (!form) {
      return { notFound: true };
    }

    // Get form questions
    const questions = await db.getFormQuestions(form.id);

    // Convert Date objects to ISO strings for JSON serialization
    const serializedForm = {
      ...form,
      created_at: form.created_at ? new Date(form.created_at).toISOString() : null,
      ...(form.updated_at && { updated_at: new Date(form.updated_at).toISOString() }),
    };

    const serializedQuestions = questions.map(question => {
      const serialized: any = { ...question };
      // Convert any Date fields to ISO strings
      Object.keys(serialized).forEach(key => {
        if (serialized[key] instanceof Date) {
          serialized[key] = serialized[key].toISOString();
        }
      });
      return serialized;
    });

    return {
      props: {
        form: serializedForm,
        questions: serializedQuestions
      }
    };
  } catch (error) {
    console.error('Error fetching form:', error);
    return { notFound: true };
  }
};

export default function CustomFormPage({ form, questions }: FormProps) {
  const { user, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { login } = useLogin();

  const [walletAddress, setWalletAddress] = useState("");
  const [balance, setBalance] = useState("0");
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasPayment, setHasPayment] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [hasSubmittedForm, setHasSubmittedForm] = useState(false);
  const [isCheckingSubmission, setIsCheckingSubmission] = useState(false);

  // Form responses
  const [responses, setResponses] = useState<Record<string, any>>({});

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: "",
    message: "",
    type: "info" as "success" | "error" | "info" | "warning"
  });

  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      setWalletAddress(user.wallet.address);
      fetchBalance(user.wallet.address);
      checkPaymentStatus(user.wallet.address);
      checkSubmissionStatus(user.wallet.address);
    } else {
      setWalletAddress("");
      setBalance("0");
      setHasPayment(false);
      setHasSubmittedForm(false);
    }
  }, [authenticated, user]);

  const fetchBalance = async (address: string) => {
    setIsBalanceLoading(true);
    try {
      const response = await fetch('/api/monad-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      
      if (response.ok) {
        const data = await response.json();
        const balanceInMON = (parseFloat(data.balance) / Math.pow(10, 18)).toFixed(4);
        setBalance(balanceInMON);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
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

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const checkPaymentStatus = async (address: string) => {
    setIsCheckingPayment(true);
    try {
      const response = await fetch('/api/forms/check-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: address,
          formId: form.id,
          paymentAmount: form.payment_amount
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setHasPayment(data.hasPayment);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const checkSubmissionStatus = async (address: string) => {
    setIsCheckingSubmission(true);
    try {
      const response = await fetch('/api/forms/check-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: address,
          formId: form.id
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setHasSubmittedForm(data.hasSubmitted);
      }
    } catch (error) {
      console.error('Error checking submission status:', error);
    } finally {
      setIsCheckingSubmission(false);
    }
  };

  const handlePayment = async () => {
    if (!walletAddress || !wallets[0]) return;
    
    if (hasPayment) {
      showModalMessage("Payment Already Made", "You have already made a payment and can submit responses!", "info");
      return;
    }
    
    setIsPaymentProcessing(true);
    setPaymentStatus("Preparing transaction...");
    
    try {
      // Convert payment amount to wei
      const amountInWei = `0x${(parseFloat(form.payment_amount) * Math.pow(10, 18)).toString(16)}`;
      
      const selectedWallet = wallets.find(wallet => wallet.address === walletAddress);
      if (!selectedWallet) return;
      
      try {
        await selectedWallet.switchChain(10143);
      } catch (error) {
        console.warn('Chain switch failed:', error);
      }
      
      const provider = await selectedWallet.getEthereumProvider();
      
      // Get current gas price for Monad testnet
      const gasPrice = await provider.request({
        method: 'eth_gasPrice'
      });
      
      const transactionRequest = {
        from: walletAddress,
        to: form.admin_wallet_address, // Payment goes to form creator
        value: amountInWei,
        gas: '0x5208', // 21000 gas limit for simple transfer
        gasPrice: gasPrice,
      };
      
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [transactionRequest]
      });
      
      // Record the payment in database as pending with form ID
      try {
        await fetch('/api/forms/record-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentHash: txHash,
            walletAddress: walletAddress,
            amount: form.payment_amount,
            formId: form.id,
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
        `Transaction sent!\nHash: ${txHash}\n\nWaiting for confirmation...`, 
        "info"
      );

      // Wait for confirmation
      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 30;
      
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
              
              // Update payment status in database
              try {
                await fetch('/api/forms/record-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    paymentHash: txHash,
                    walletAddress: walletAddress,
                    amount: form.payment_amount,
                    formId: form.id,
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
                setHasPayment(true);
                showModalMessage(
                  "Payment Successful!",
                  `Payment confirmed!\nAmount: ${form.payment_amount} MON\nYou can now submit your response!`,
                  "success"
                );
              } else {
                setPaymentStatus("Transaction failed!");
                showModalMessage("Transaction Failed!", "The transaction was confirmed but failed during execution.", "error");
              }
            }
          }
        } catch (error) {
          console.log('Checking confirmation...', attempts + 1);
        }
        
        if (!confirmed) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!confirmed) {
        setPaymentStatus("Confirmation timeout");
        showModalMessage("Confirmation Timeout", "Transaction sent but confirmation timeout. Please check manually.", "warning");
      }
      
      fetchBalance(walletAddress);
      
    } catch (error) {
      console.error('Payment failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPaymentStatus("Payment failed");
      showModalMessage("Payment Failed!", `Error: ${errorMessage}`, "error");
    } finally {
      setIsPaymentProcessing(false);
      setTimeout(() => setPaymentStatus(""), 3000);
    }
  };

  const handleSubmitForm = async () => {
    if (!hasPayment) {
      showModalMessage("Payment Required", "Please make a payment first to submit responses.", "warning");
      return;
    }

    if (hasSubmittedForm) {
      showModalMessage("Already Submitted", "You have already submitted a response to this form.", "info");
      return;
    }

    // Validate required fields
    const missingFields = questions.filter(q => q.is_required && !responses[q.id]?.trim());
    if (missingFields.length > 0) {
      showModalMessage("Missing Required Fields", "Please fill in all required fields before submitting.", "warning");
      return;
    }

    setIsSubmittingForm(true);
    
    try {
      const response = await fetch('/api/forms/submit-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: form.id,
          responses,
          walletAddress
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setHasSubmittedForm(true);
        setResponses({});
        showModalMessage(
          "Response Submitted!",
          `Your response has been submitted successfully!\n\nResponse ID: ${data.responseId}\n\nThank you for your feedback!`,
          "success"
        );
      } else {
        const error = await response.json();
        showModalMessage("Submission Failed", error.error || "Failed to submit response", "error");
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      showModalMessage("Submission Error", "An unexpected error occurred while submitting your response.", "error");
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const updateResponse = (questionId: number, value: any) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const showModalMessage = (title: string, message: string, type: "success" | "error" | "info" | "warning" = "info") => {
    setModalContent({ title, message, type });
    setShowModal(true);
  };

  const renderQuestion = (question: any) => {
    const questionId = question.id;
    const value = responses[questionId] || "";

    switch (question.question_type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => updateResponse(questionId, e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-monad-off-white placeholder-gray-500 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-monad-purple focus:border-transparent"
            placeholder="Enter your response..."
          />
        );
      
      case 'select':
        const isCustomSelect = value && !question.question_options?.includes(value) && value !== 'custom_other';
        return (
          <div className="space-y-3">
            <select
              value={isCustomSelect ? 'custom_other' : value}
              onChange={(e) => {
                if (e.target.value === 'custom_other') {
                  updateResponse(questionId, '');
                } else {
                  updateResponse(questionId, e.target.value);
                }
              }}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-monad-off-white focus:outline-none focus:ring-2 focus:ring-monad-purple focus:border-transparent"
            >
              <option value="">Select an option...</option>
              {question.question_options?.map((option: string, index: number) => (
                <option key={index} value={option}>{option}</option>
              ))}
              <option value="custom_other">Other (please specify)</option>
            </select>
            {(value === 'custom_other' || isCustomSelect) && (
              <input
                type="text"
                value={isCustomSelect ? value : ''}
                onChange={(e) => updateResponse(questionId, e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-monad-off-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-monad-purple focus:border-transparent"
                placeholder="Please specify your answer..."
              />
            )}
          </div>
        );
      
      case 'radio':
        // Limit to 4 max options for radio buttons
        const radioOptions = question.question_options?.slice(0, 4) || [];
        const isCustomRadio = value && !radioOptions.includes(value) && value !== 'custom_other';
        
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              {radioOptions.map((option: string, index: number) => (
                <label key={index} className="flex items-center space-x-2 text-monad-off-white">
                  <input
                    type="radio"
                    name={`question_${questionId}`}
                    value={option}
                    checked={value === option}
                    onChange={(e) => updateResponse(questionId, e.target.value)}
                    className="text-monad-purple focus:ring-monad-purple"
                  />
                  <span>{option}</span>
                </label>
              ))}
              <label className="flex items-center space-x-2 text-monad-off-white">
                <input
                  type="radio"
                  name={`question_${questionId}`}
                  value="custom_other"
                  checked={value === 'custom_other' || isCustomRadio}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateResponse(questionId, 'custom_other');
                    }
                  }}
                  className="text-monad-purple focus:ring-monad-purple"
                />
                <span>Other (please specify)</span>
              </label>
            </div>
            {(value === 'custom_other' || isCustomRadio) && (
              <input
                type="text"
                value={isCustomRadio ? value : ''}
                onChange={(e) => updateResponse(questionId, e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-monad-off-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-monad-purple focus:border-transparent ml-6"
                placeholder="Please specify your answer..."
              />
            )}
          </div>
        );
      
      case 'checkbox':
        const checkboxValues = Array.isArray(value) ? value : [];
        
        return (
          <div className="space-y-2">
            {question.question_options?.map((option: string, index: number) => (
              <label key={index} className="flex items-center space-x-2 text-monad-off-white">
                <input
                  type="checkbox"
                  value={option}
                  checked={checkboxValues.includes(option)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateResponse(questionId, [...checkboxValues, option]);
                    } else {
                      updateResponse(questionId, checkboxValues.filter((v: string) => v !== option));
                    }
                  }}
                  className="text-monad-purple focus:ring-monad-purple"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );
      
      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateResponse(questionId, e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-monad-off-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-monad-purple focus:border-transparent"
            placeholder="Enter your response..."
          />
        );
    }
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

  return (
    <>
      <Head>
        <title>{form.title} - Monad Feedback</title>
        <meta name="description" content={form.description || `Submit feedback for ${form.title}`} />
      </Head>

      <main className="min-h-screen bg-monad-blue px-4 py-8">
        <Modal />

        {/* Navbar */}
        <Navbar
          variant="main"
          title={form.title}
          showAdminLink={false}
          showBackLink={true}
          walletAddress={walletAddress}
          balance={balance}
          isBalanceLoading={isBalanceLoading}
          onRefreshBalance={handleRefreshBalance}
          showDropdown={showDropdown}
          onToggleDropdown={toggleDropdown}
        />

        {/* Main Content */}
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-monad-off-white mb-8 tracking-wider">
              {form.title}
            </h1>
            {form.description && (
              <p className="text-monad-off-white text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                {form.description}
              </p>
            )}
          </div>

          {/* Form */}
          <div className="bg-gray-800 bg-opacity-40 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
            <h2 className="text-2xl font-semibold text-monad-off-white mb-2">Submit Your Response</h2>
            <p className="text-gray-400 text-sm mb-8">
              Payment required: {form.payment_amount} MON
            </p>

            {/* Wallet Connection Status */}
            <div className="flex items-center text-gray-400 text-sm mb-8 p-4 bg-gray-900 bg-opacity-50 rounded-lg">
              <div className={`w-4 h-4 border-2 ${walletAddress ? 'border-green-400' : 'border-gray-500'} rounded-full mr-3 flex items-center justify-center`}>
                <div className={`w-2 h-2 ${walletAddress ? 'bg-green-400' : 'bg-gray-500'} rounded-full`}></div>
              </div>
              {walletAddress ? (
                <div className="flex flex-col space-y-1 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-green-400">Wallet connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                    <button
                      onClick={handlePayment}
                      disabled={isPaymentProcessing || parseFloat(balance) < parseFloat(form.payment_amount) || hasPayment || isCheckingPayment}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        hasPayment 
                          ? 'bg-green-600 text-white cursor-default' 
                          : isPaymentProcessing || parseFloat(balance) < parseFloat(form.payment_amount) || isCheckingPayment
                            ? 'bg-gray-600 text-white cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-500 text-white'
                      }`}
                    >
                      {isCheckingPayment ? "Checking..." : 
                       hasPayment ? "✓ Paid" : 
                       isPaymentProcessing ? (paymentStatus || "Processing...") : 
                       `Pay ${form.payment_amount} MON`}
                    </button>
                  </div>
                  {isCheckingPayment || isCheckingSubmission ? (
                    <span className="text-yellow-400 text-xs">
                      {isCheckingPayment && isCheckingSubmission 
                        ? "Checking payment and submission status..." 
                        : isCheckingPayment 
                          ? "Checking payment status..." 
                          : "Checking submission status..."}
                    </span>
                  ) : hasSubmittedForm ? (
                    <span className="text-blue-400 text-xs">✓ Response already submitted</span>
                  ) : hasPayment ? (
                    <span className="text-green-400 text-xs">✓ Payment verified - You can submit your response</span>
                  ) : (
                    <span className="text-orange-400 text-xs">Payment required to submit response</span>
                  )}
                </div>
              ) : (
                "Connect your wallet to continue"
              )}
            </div>

            {/* Questions */}
            {questions.length > 0 && (
              <div className="space-y-6 mb-8">
                {questions.map((question, index) => (
                  <div key={question.id}>
                    <label className="block text-monad-off-white font-medium mb-3">
                      {index + 1}. {question.question_text}
                      {question.is_required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    {renderQuestion(question)}
                  </div>
                ))}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmitForm}
              disabled={!hasPayment || isSubmittingForm || hasSubmittedForm}
              className={`w-full py-4 rounded-lg font-medium transition-colors ${
                hasSubmittedForm
                  ? 'bg-blue-600 text-white cursor-default'
                  : !hasPayment 
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                    : isSubmittingForm
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-monad-purple hover:bg-opacity-90 text-white'
              }`}
            >
              {hasSubmittedForm
                ? "✓ Response Already Submitted"
                : isSubmittingForm 
                  ? "Submitting Response..." 
                  : !hasPayment 
                    ? "Payment Required to Submit Response" 
                    : "Submit Response"}
            </button>

            {/* Privacy Notice */}
            <div className="flex items-center justify-center text-center mt-6">
              <div className="flex items-center text-green-400 text-sm">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                PRIVACY GUARANTEED
              </div>
            </div>
            <p className="text-center text-gray-400 text-xs mt-2 leading-relaxed">
              Your responses are stored anonymously without your wallet address.
            </p>
          </div>
        </div>
      </main>
    </>
  );
} 