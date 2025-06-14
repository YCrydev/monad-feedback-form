import { useState, useEffect } from "react";
import Head from "next/head";
import Navbar from "../components/Navbar";
import { usePrivy, useWallets } from "@privy-io/react-auth";

interface FeedbackResponse {
  id: number;
  feedback: string;
  category: string;
  wallet_address?: string;
  is_anonymous: boolean;
  created_at: string;
}

interface ResponsesData {
  responses: FeedbackResponse[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function ResponsesPage() {
  const { user, authenticated } = usePrivy();
  const { wallets } = useWallets();
  
  const [responsesData, setResponsesData] = useState<ResponsesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [anonymousFilter, setAnonymousFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  
  const [walletAddress, setWalletAddress] = useState("");
  const [balance, setBalance] = useState("0");
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);

  // Update wallet address when user changes
  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      setWalletAddress(user.wallet.address);
      fetchBalance(user.wallet.address);
      checkAdminStatus(user.wallet.address);
    } else {
      setWalletAddress("");
      setBalance("0");
      setIsAdmin(false);
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

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  // Fetch responses data
  const fetchResponses = async (page = 1) => {
    setLoading(true);
    setError("");
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }
      
      if (anonymousFilter !== 'all') {
        params.append('anonymous', anonymousFilter);
      }
      
      const response = await fetch(`/api/get-responses?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setResponsesData(data);
        setCurrentPage(page);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch responses');
      }
    } catch (error) {
      console.error('Error fetching responses:', error);
      setError('Failed to fetch responses');
    } finally {
      setLoading(false);
    }
  };

  // Fetch responses when filters change
  useEffect(() => {
    fetchResponses(1);
  }, [categoryFilter, anonymousFilter]);

  // Initial load
  useEffect(() => {
    fetchResponses();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (responsesData?.totalPages || 1)) {
      fetchResponses(newPage);
    }
  };

  return (
    <>
      <Head>
        <title>Feedback Responses - Monad FEEDBACK</title>
      </Head>

      <main className="min-h-screen bg-monad-blue flex flex-col items-center px-4 py-8">
        {!authenticated ? (
          <div className="text-center">
            <h1 className="text-4xl font-bold text-monad-off-white mb-4">Access Denied</h1>
            <p className="text-gray-300 mb-8">Please connect your wallet to access feedback responses</p>
          </div>
        ) : isCheckingAdmin ? (
          <div className="text-center">
            <h1 className="text-4xl font-bold text-monad-off-white mb-4">Checking Admin Status...</h1>
          </div>
        ) : !isAdmin ? (
          <div className="text-center">
            <h1 className="text-4xl font-bold text-monad-off-white mb-4">Admin Access Required</h1>
            <p className="text-gray-300 mb-8">You need admin privileges to view feedback responses</p>
          </div>
        ) : (
          <>
            {/* Navbar */}
            <Navbar
              variant="main"
              title="Feedback Responses"
              showAdminLink={true}
              showBackLink={true}
              walletAddress={walletAddress}
              balance={balance}
              isBalanceLoading={isBalanceLoading}
              onRefreshBalance={handleRefreshBalance}
              showDropdown={showDropdown}
              onToggleDropdown={toggleDropdown}
            />

            {/* Main Content */}
            <div className="w-full max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-monad-off-white mb-4">
                  Community Feedback
                </h1>
                <p className="text-monad-off-white text-lg max-w-2xl mx-auto">
                  View all feedback submitted by the Monad community
                </p>
              </div>

              {/* Filters */}
              <div className="bg-gray-800 bg-opacity-40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 mb-8">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center space-x-2">
                    <label className="text-monad-off-white font-medium">Category:</label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-monad-off-white text-sm"
                    >
                      <option value="all">All Categories</option>
                      <option value="dev">Dev</option>
                      <option value="community">Community</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <label className="text-monad-off-white font-medium">Type:</label>
                    <select
                      value={anonymousFilter}
                      onChange={(e) => setAnonymousFilter(e.target.value)}
                      className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-monad-off-white text-sm"
                    >
                      <option value="all">All Types</option>
                      <option value="true">Anonymous</option>
                      <option value="false">With Attribution</option>
                    </select>
                  </div>

                  {responsesData && (
                    <div className="text-gray-400 text-sm">
                      Showing {responsesData.responses.length} of {responsesData.total} responses
                    </div>
                  )}
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center">
                    <svg className="animate-spin h-5 w-5 mr-3 text-monad-purple" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <span className="text-monad-off-white">Loading responses...</span>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-4 mb-8">
                  <p className="text-red-300 text-center">{error}</p>
                </div>
              )}

              {/* Responses List */}
              {responsesData && responsesData.responses.length > 0 && (
                <div className="space-y-4 mb-8">
                  {responsesData.responses.map((response) => (
                    <div key={response.id} className="bg-gray-800 bg-opacity-40 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            response.category === 'dev' 
                              ? 'bg-blue-600 text-blue-100' 
                              : 'bg-green-600 text-green-100'
                          }`}>
                            {response.category}
                          </span>
                          
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            response.is_anonymous 
                              ? 'bg-gray-600 text-gray-100' 
                              : 'bg-purple-600 text-purple-100'
                          }`}>
                            {response.is_anonymous ? 'Anonymous' : 'With Attribution'}
                          </span>
                        </div>
                        
                        <span className="text-gray-400 text-sm">
                          {formatDate(response.created_at)}
                        </span>
                      </div>
                      
                      <p className="text-monad-off-white leading-relaxed mb-4">
                        {response.feedback}
                      </p>
                      
                      {!response.is_anonymous && response.wallet_address && (
                        <div className="text-sm text-gray-400">
                          Submitted by: {response.wallet_address.slice(0, 6)}...{response.wallet_address.slice(-4)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* No Responses State */}
              {responsesData && responsesData.responses.length === 0 && !loading && (
                <div className="text-center py-12">
                  <div className="bg-gray-800 bg-opacity-40 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
                    <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-monad-off-white text-lg mb-2">No feedback found</p>
                    <p className="text-gray-400">Try adjusting your filters or check back later</p>
                  </div>
                </div>
              )}

              {/* Pagination */}
              {responsesData && responsesData.totalPages > 1 && (
                <div className="flex justify-center items-center space-x-4">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!responsesData.hasPrev}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      responsesData.hasPrev
                        ? 'bg-monad-purple hover:bg-opacity-90 text-white'
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Previous
                  </button>
                  
                  <span className="text-monad-off-white">
                    Page {currentPage} of {responsesData.totalPages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!responsesData.hasNext}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      responsesData.hasNext
                        ? 'bg-monad-purple hover:bg-opacity-90 text-white'
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
} 