import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Navbar from "../../../../components/Navbar";
import { usePrivy } from "@privy-io/react-auth";

interface FormQuestion {
  id: number;
  form_id: number;
  question_text: string;
  question_type: string;
  question_options?: string[];
  is_required: boolean;
  order_index: number;
}

interface FormResponse {
  id: number;
  form_id: number;
  response_data: Record<string, any>;
  wallet_address: string;
  payment_hash: string;
  submitted_at: string;
}

interface Form {
  id: number;
  name: string;
  slug: string;
  title: string;
  description?: string;
  payment_amount: string;
  admin_wallet_address: string;
  created_at: string;
}

interface ResponsesData {
  form: Form;
  questions: FormQuestion[];
  responses: FormResponse[];
  total: number;
}

export default function FormResponsesPage() {
  const { user, authenticated } = usePrivy();
  const router = useRouter();
  const { id } = router.query;
  
  const [responsesData, setResponsesData] = useState<ResponsesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [walletAddress, setWalletAddress] = useState("");
  const [balance, setBalance] = useState("0");
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Update wallet address when user changes
  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      setWalletAddress(user.wallet.address);
      fetchBalance(user.wallet.address);
    } else {
      setWalletAddress("");
      setBalance("0");
    }
  }, [authenticated, user]);

  // Fetch MON balance
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
      } else {
        setBalance("0.0000");
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

  // Fetch form responses
  const fetchFormResponses = async () => {
    if (!id || !walletAddress) return;
    
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch('/api/admin/form-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          formId: id,
          walletAddress
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setResponsesData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch form responses');
      }
    } catch (error) {
      console.error('Error fetching form responses:', error);
      setError('Failed to fetch form responses');
    } finally {
      setLoading(false);
    }
  };

  // Fetch responses when wallet address and form ID are available
  useEffect(() => {
    if (id && walletAddress) {
      fetchFormResponses();
    }
  }, [id, walletAddress]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderResponseValue = (question: FormQuestion, value: any) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-500 italic">No response</span>;
    }

    switch (question.question_type) {
      case 'checkbox':
        if (Array.isArray(value)) {
          return value.length > 0 ? value.join(', ') : <span className="text-gray-500 italic">None selected</span>;
        }
        return value;
      case 'select':
      case 'radio':
      case 'text':
      case 'textarea':
      default:
        return value.toString();
    }
  };

  if (!authenticated) {
    return (
      <>
        <Head>
          <title>Access Denied - Monad Feedback</title>
        </Head>
        <main className="min-h-screen bg-monad-blue flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-monad-off-white mb-4">Access Denied</h1>
            <p className="text-gray-300 mb-8">Please connect your wallet to access admin features</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{responsesData?.form?.title || 'Form'} Responses - Monad Feedback</title>
      </Head>

      <main className="min-h-screen bg-monad-blue flex flex-col items-center px-4 py-8">
        {/* Navbar */}
        <Navbar
          variant="admin"
          title={responsesData?.form?.title ? `${responsesData.form.title} - Responses` : "Form Responses"}
          showBackLink={true}
          showAdminLink={false}
          walletAddress={walletAddress}
          balance={balance}
          isBalanceLoading={isBalanceLoading}
          onRefreshBalance={handleRefreshBalance}
          showDropdown={showDropdown}
          onToggleDropdown={toggleDropdown}
        />

        {/* Main Content */}
        <div className="w-full max-w-6xl mx-auto">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-flex items-center">
                <svg className="animate-spin h-5 w-5 mr-3 text-monad-purple" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                <span className="text-monad-off-white">Loading form responses...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-4 mb-8">
              <p className="text-red-300 text-center">{error}</p>
              <div className="text-center mt-4">
                <button
                  onClick={() => router.push('/admin')}
                  className="bg-monad-purple hover:bg-opacity-90 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Back to Admin Dashboard
                </button>
              </div>
            </div>
          )}

          {responsesData && (
            <>
              {/* Form Info Header */}
              <div className="bg-gray-800 bg-opacity-40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 mb-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl font-bold text-monad-off-white mb-2">
                      {responsesData.form.title}
                    </h1>
                    {responsesData.form.description && (
                      <p className="text-gray-300 mb-4">{responsesData.form.description}</p>
                    )}
                    <div className="flex items-center space-x-6 text-sm text-gray-400">
                      <span>Payment: {responsesData.form.payment_amount} MON</span>
                      <span>Created: {formatDate(responsesData.form.created_at)}</span>
                      <span>Total Responses: {responsesData.total}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/admin')}
                    className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>

              {/* Responses */}
              {responsesData.responses.length > 0 ? (
                <div className="space-y-6">
                  {responsesData.responses.map((response, index) => (
                    <div key={response.id} className="bg-gray-800 bg-opacity-40 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-semibold text-monad-off-white">
                          Response #{index + 1}
                        </h3>
                        <div className="text-right text-sm text-gray-400">
                          <div>Submitted: {formatDate(response.submitted_at)}</div>
                          <div>Wallet: {response.wallet_address.slice(0, 6)}...{response.wallet_address.slice(-4)}</div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {responsesData.questions.map((question) => (
                          <div key={question.id} className="border-b border-gray-600 pb-4 last:border-b-0">
                            <div className="mb-2">
                              <span className="text-monad-off-white font-medium">
                                {question.question_text}
                                {question.is_required && <span className="text-red-400 ml-1">*</span>}
                              </span>
                              <span className="ml-2 text-xs text-gray-500 capitalize">
                                ({question.question_type})
                              </span>
                            </div>
                            <div className="text-gray-300 bg-gray-900 bg-opacity-50 rounded p-3">
                              {renderResponseValue(question, response.response_data[question.id])}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gray-800 bg-opacity-40 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
                    <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-monad-off-white text-lg mb-2">No responses yet</p>
                    <p className="text-gray-400">Share your form to start collecting responses</p>
                    <div className="mt-4 text-sm text-gray-500">
                      Form URL: <span className="text-monad-purple">/forms/{responsesData.form.slug}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
} 