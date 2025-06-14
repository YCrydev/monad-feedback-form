import { useLogin } from "@privy-io/react-auth";
import Head from "next/head";
import { useState, useEffect } from "react";
import { usePrivy, useWallets, useLogout } from "@privy-io/react-auth";
import Link from "next/link";
import Navbar from "../components/Navbar";

export default function AdminDashboard() {
  const { user, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { login } = useLogin();

  const [walletAddress, setWalletAddress] = useState("");
  const [balance, setBalance] = useState("0");
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);
  const [isBecomingAdmin, setIsBecomingAdmin] = useState(false);
  const [forms, setForms] = useState<any[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);

  // Form creation state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPaymentAmount, setFormPaymentAmount] = useState("0.01");
  const [questions, setQuestions] = useState<any[]>([]);
  const [isCreatingForm, setIsCreatingForm] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: "",
    message: "",
    type: "info" as "success" | "error" | "info" | "warning"
  });

  const ADMIN_PAYMENT_AMOUNT = "0.001"; // 5 MON to become admin

  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      setWalletAddress(user.wallet.address);
      fetchBalance(user.wallet.address);
      checkAdminStatus(user.wallet.address);
    } else {
      setWalletAddress("");
      setBalance("0");
      setIsAdmin(false);
      setForms([]);
    }
  }, [authenticated, user]);

  useEffect(() => {
    if (isAdmin && walletAddress) {
      loadForms();
    }
  }, [isAdmin, walletAddress]);

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

  const checkAdminStatus = async (address: string) => {
    setIsCheckingAdmin(true);
    try {
      const response = await fetch('/api/admin/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.isAdmin);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    } finally {
      setIsCheckingAdmin(false);
    }
  };

  const loadForms = async () => {
    setIsLoadingForms(true);
    try {
      const response = await fetch('/api/admin/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      });
      
      if (response.ok) {
        const data = await response.json();
        setForms(data.forms);
      }
    } catch (error) {
      console.error('Error loading forms:', error);
    } finally {
      setIsLoadingForms(false);
    }
  };

  const becomeAdmin = async () => {
    if (!walletAddress || !wallets[0]) return;
    
    setIsBecomingAdmin(true);
    
    try {
     const amountInWei = `0x${(parseFloat(ADMIN_PAYMENT_AMOUNT) * Math.pow(10, 18)).toString(16)}`;
      const selectedWallet = wallets.find(wallet => wallet.address === walletAddress);
      if (!selectedWallet) return;
      
      try {
        await selectedWallet.switchChain(10143);
      } catch (error) {
        console.warn('Chain switch failed:', error);
      }
      
      const provider = await selectedWallet.getEthereumProvider();
      const transactionRequest = {
        to: "0x758aE4Ff7acfB8912E4938EC1cdcfb4327F7c397", // Admin payment recipient
        value: amountInWei,
      };
      
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [transactionRequest]
      });
      
      showModalMessage("Transaction Sent", `Admin payment transaction sent!\nHash: ${txHash}\n\nWaiting for confirmation...`, "info");
      
      // Wait for confirmation
      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 30;
      
      while (!confirmed && attempts < maxAttempts) {
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
              
              if (data.success) {
                // Create admin record
                await fetch('/api/admin/create', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    walletAddress,
                    paymentHash: txHash,
                    amount: ADMIN_PAYMENT_AMOUNT
                  })
                });
                
                setIsAdmin(true);
                showModalMessage("Admin Access Granted!", "You are now an admin and can create custom forms!", "success");
              } else {
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
        showModalMessage("Confirmation Timeout", "Transaction sent but confirmation timeout. Please check manually.", "warning");
      }
      
      fetchBalance(walletAddress);
      
    } catch (error) {
      console.error('Admin payment failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showModalMessage("Payment Failed!", `Error: ${errorMessage}`, "error");
    } finally {
      setIsBecomingAdmin(false);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      questionText: "",
      questionType: "text",
      isRequired: false,
      questionOptions: []
    }]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const createForm = async () => {
    if (!formName || !formSlug || !formTitle || questions.length === 0) {
      showModalMessage("Missing Information", "Please fill in all required fields and add at least one question.", "warning");
      return;
    }

    setIsCreatingForm(true);
    
    try {
      const response = await fetch('/api/admin/create-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          slug: formSlug,
          title: formTitle,
          description: formDescription,
          paymentAmount: formPaymentAmount,
          adminWalletAddress: walletAddress,
          questions: questions.map((q, index) => ({ ...q, orderIndex: index })),
          isAnonymous: isAnonymous
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        showModalMessage("Form Created!", `Your form "${formName}" has been created!\nURL: /forms/${formSlug}`, "success");
        
        // Reset form
        setFormName("");
        setFormSlug("");
        setFormTitle("");
        setFormDescription("");
        setFormPaymentAmount("0.01");
        setIsAnonymous(false);
        setQuestions([]);
        setShowCreateForm(false);
        
        // Reload forms
        loadForms();
      } else {
        const error = await response.json();
        showModalMessage("Form Creation Failed", error.error || "Failed to create form", "error");
      }
    } catch (error) {
      console.error('Error creating form:', error);
      showModalMessage("Error", "An unexpected error occurred while creating the form.", "error");
    } finally {
      setIsCreatingForm(false);
    }
  };

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

  return (
    <>
      <Head>
        <title>Admin Dashboard - Monad Feedback</title>
      </Head>

      <main className="min-h-screen bg-monad-blue px-4 py-8">
        <Modal />

        {/* Navbar */}
        <Navbar
          variant="admin"
          title="Admin Dashboard"
          showBackLink={true}
          showAdminLink={false}
          walletAddress={walletAddress}
          balance={balance}
          isBalanceLoading={isBalanceLoading}
          onRefreshBalance={handleRefreshBalance}
          showDropdown={showDropdown}
          onToggleDropdown={toggleDropdown}
        />

        <div className="max-w-4xl mx-auto">
          {!authenticated ? (
            <div className="text-center">
              <h1 className="text-4xl font-bold text-monad-off-white mb-4">Admin Dashboard</h1>
              <p className="text-gray-300 mb-8">Connect your wallet to access admin features</p>
              <button 
                onClick={login}
                className="bg-monad-purple hover:bg-opacity-90 text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                Connect Wallet
              </button>
            </div>
          ) : isCheckingAdmin ? (
            <div className="text-center">
              <h1 className="text-4xl font-bold text-monad-off-white mb-4">Checking Admin Status...</h1>
            </div>
          ) : !isAdmin ? (
            <div className="text-center">
              <h1 className="text-4xl font-bold text-monad-off-white mb-4">Become an Admin</h1>
              <p className="text-gray-300 mb-8">Pay {ADMIN_PAYMENT_AMOUNT} MON to become an admin and create custom feedback forms</p>
              
              <div className="bg-gray-800 bg-opacity-40 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 max-w-md mx-auto">
                <h3 className="text-xl font-semibold text-monad-off-white mb-4">Admin Benefits</h3>
                <ul className="text-gray-300 text-left space-y-2 mb-6">
                  <li>• Create unlimited custom forms</li>
                  <li>• Set custom payment amounts</li>
                  <li>• Add multiple question types</li>
                  <li>• View form responses</li>
                  <li>• Custom form URLs</li>
                </ul>
                
                <button
                  onClick={becomeAdmin}
                  disabled={isBecomingAdmin || parseFloat(balance) < parseFloat(ADMIN_PAYMENT_AMOUNT)}
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    isBecomingAdmin || parseFloat(balance) < parseFloat(ADMIN_PAYMENT_AMOUNT)
                      ? 'bg-gray-600 text-white cursor-not-allowed'
                      : 'bg-monad-purple hover:bg-opacity-90 text-white'
                  }`}
                >
                  {isBecomingAdmin ? "Processing Payment..." : `Pay ${ADMIN_PAYMENT_AMOUNT} MON to Become Admin`}
                </button>
                
                {parseFloat(balance) < parseFloat(ADMIN_PAYMENT_AMOUNT) && (
                  <p className="text-red-400 text-sm mt-2">
                    Insufficient balance. You need {ADMIN_PAYMENT_AMOUNT} MON.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold text-monad-off-white">Your Forms</h1>
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-monad-purple hover:bg-opacity-90 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {showCreateForm ? "Cancel" : "Create New Form"}
                </button>
              </div>

              {/* Create Form Section */}
              {showCreateForm && (
                <div className="bg-gray-800 bg-opacity-40 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 mb-8">
                  <h2 className="text-2xl font-semibold text-monad-off-white mb-6">Create New Form</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-monad-off-white font-medium mb-2">Form Name</label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="My Feedback Form"
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-monad-off-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-monad-purple focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-monad-off-white font-medium mb-2">URL Slug</label>
                      <input
                        type="text"
                        value={formSlug}
                        onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                        placeholder="my-feedback-form"
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-monad-off-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-monad-purple focus:border-transparent"
                      />
                      <p className="text-gray-400 text-xs mt-1">Your form will be at: /forms/{formSlug}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-monad-off-white font-medium mb-2">Form Title</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Share Your Feedback"
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-monad-off-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-monad-purple focus:border-transparent"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-monad-off-white font-medium mb-2">Description</label>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Tell users about your form..."
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-monad-off-white placeholder-gray-500 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-monad-purple focus:border-transparent"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-monad-off-white font-medium mb-2">Payment Amount (MON)</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={formPaymentAmount}
                      onChange={(e) => setFormPaymentAmount(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-monad-off-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-monad-purple focus:border-transparent"
                    />
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-monad-off-white font-medium mb-1">Anonymous Responses</label>
                        <p className="text-gray-400 text-sm">When enabled, responses will be collected without wallet addresses</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAnonymous}
                          onChange={(e) => setIsAnonymous(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-monad-purple peer-focus:ring-opacity-30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-monad-purple"></div>
                      </label>
                    </div>
                  </div>

                  {/* Questions Section */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold text-monad-off-white">Questions</h3>
                      <button
                        onClick={addQuestion}
                        className="bg-monad-purple bg-opacity-80 hover:bg-monad-purple hover:bg-opacity-100 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Add Question
                      </button>
                    </div>

                    {questions.map((question, index) => (
                      <div key={index} className="bg-gray-900 bg-opacity-50 rounded-lg p-4 mb-4">
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-monad-off-white font-medium">Question {index + 1}</span>
                          <button
                            onClick={() => removeQuestion(index)}
                            className="text-monad-purple hover:text-monad-off-white bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-sm transition-colors"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-gray-300 text-sm mb-1">Question Text</label>
                            <input
                              type="text"
                              value={question.questionText}
                              onChange={(e) => updateQuestion(index, 'questionText', e.target.value)}
                              placeholder="Enter your question..."
                              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-monad-off-white text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-gray-300 text-sm mb-1">Question Type</label>
                            <select
                              value={question.questionType}
                              onChange={(e) => {
                                const newType = e.target.value;
                                const updatedQuestions = [...questions];
                                updatedQuestions[index] = { 
                                  ...updatedQuestions[index], 
                                  questionType: newType,
                                  questionOptions: ['select', 'radio', 'checkbox'].includes(newType) ? [''] : []
                                };
                                setQuestions(updatedQuestions);
                              }}
                              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-monad-off-white text-sm"
                            >
                              <option value="text">Short Text</option>
                              <option value="textarea">Long Text</option>
                              <option value="select">Dropdown</option>
                              <option value="radio">Multiple Choice (Max 4)</option>
                              <option value="checkbox">Checkboxes</option>
                            </select>
                          </div>
                        </div>

                        {/* Options for select, radio, and checkbox question types */}
                        {['select', 'radio', 'checkbox'].includes(question.questionType) && (
                          <div className="mb-4">
                            <label className="block text-gray-300 text-sm mb-2">
                              Options {question.questionType === 'radio' && '(Maximum 4)'}
                            </label>
                            <div className="space-y-2">
                              {(question.questionOptions && question.questionOptions.length > 0 ? question.questionOptions : ['']).map((option: string, optionIndex: number) => (
                                <div key={optionIndex} className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => {
                                      const newOptions = [...(question.questionOptions || [''])];
                                      newOptions[optionIndex] = e.target.value;
                                      updateQuestion(index, 'questionOptions', newOptions);
                                    }}
                                    placeholder={`Option ${optionIndex + 1}`}
                                    className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-monad-off-white text-sm"
                                  />
                                  {(question.questionOptions || ['']).length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newOptions = (question.questionOptions || []).filter((_: string, i: number) => i !== optionIndex);
                                        updateQuestion(index, 'questionOptions', newOptions.length > 0 ? newOptions : ['']);
                                      }}
                                      className="text-monad-purple hover:text-monad-off-white bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-sm transition-colors"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              ))}
                              
                              {/* Add option button - limit to 4 for radio */}
                              {(question.questionType !== 'radio' || (question.questionOptions || []).length < 4) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentOptions = question.questionOptions || [''];
                                    const newOptions = [...currentOptions, ''];
                                    updateQuestion(index, 'questionOptions', newOptions);
                                  }}
                                  className="text-monad-purple hover:text-monad-off-white font-medium text-sm transition-colors"
                                >
                                  + Add Option
                                </button>
                              )}
                              
                              {question.questionType === 'radio' && (question.questionOptions || []).length >= 4 && (
                                <p className="text-yellow-400 text-xs">Maximum 4 options for multiple choice questions</p>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={question.isRequired}
                            onChange={(e) => updateQuestion(index, 'isRequired', e.target.checked)}
                            className="mr-2"
                          />
                          <label className="text-gray-300 text-sm">Required</label>
                        </div>
                      </div>
                    ))}

                    {questions.length === 0 && (
                      <p className="text-gray-400 text-center py-8">No questions added yet. Click "Add Question" to get started.</p>
                    )}
                  </div>

                  <button
                    onClick={createForm}
                    disabled={isCreatingForm || !formName || !formSlug || !formTitle || questions.length === 0}
                    className={`w-full py-3 rounded-lg font-medium transition-colors ${
                      isCreatingForm || !formName || !formSlug || !formTitle || questions.length === 0
                        ? 'bg-gray-600 text-white cursor-not-allowed'
                        : 'bg-monad-purple hover:bg-opacity-90 text-white'
                    }`}
                  >
                    {isCreatingForm ? "Creating Form..." : "Create Form"}
                  </button>
                </div>
              )}

              {/* Forms List */}
              <div className="bg-gray-800 bg-opacity-40 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
                <h2 className="text-2xl font-semibold text-monad-off-white mb-6">Your Forms</h2>
                
                {isLoadingForms ? (
                  <p className="text-gray-400 text-center py-8">Loading forms...</p>
                ) : forms.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No forms created yet. Create your first form to get started!</p>
                ) : (
                  <div className="space-y-4">
                    {forms.map((form) => (
                      <div key={form.id} className="bg-gray-900 bg-opacity-50 rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-semibold text-monad-off-white mb-2">{form.title}</h3>
                            <p className="text-gray-300 text-sm mb-2">{form.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-400">
                              <span>Payment: {form.payment_amount} MON</span>
                              <span>Created: {new Date(form.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Link 
                              href={`/forms/${form.slug}`}
                              className="bg-monad-purple bg-opacity-80 hover:bg-monad-purple hover:bg-opacity-100 text-white px-4 py-2 rounded text-sm transition-colors"
                            >
                              View Form
                            </Link>
                            <Link 
                              href={`/admin/forms/${form.id}/responses`}
                              className="bg-monad-purple bg-opacity-60 hover:bg-monad-purple hover:bg-opacity-80 text-white px-4 py-2 rounded text-sm transition-colors"
                            >
                              Responses
                            </Link>
                          </div>
                        </div>
                        
                        <div className="text-gray-400 text-sm">
                          <span className="font-medium">URL:</span> /forms/{form.slug}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
} 