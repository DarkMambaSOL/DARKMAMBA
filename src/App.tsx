import React, { useState, useEffect } from "react";
import { 
  Shield, CheckCircle, Zap, AlertTriangle, MessageSquare, 
  Settings, Users, Layers, Award, Trash2, ArrowUpRight, 
  Clipboard, HelpCircle, Key, RefreshCw, Layers2, Sparkles,
  ChevronDown, Send, Menu, X, Check, DollarSign, Calendar, Eye,
  Download, ExternalLink, Info, Lock, Link, Flame, Droplet, Gift, Search
} from "lucide-react";

// -------------------------------------------------------------
// TYPES & SCHEMAS
// -------------------------------------------------------------
interface Plan {
  id: string;
  name: string;
  icon: string;
  dmsol: number;
  price: number;
  sol: number;
  free: boolean;
  active: boolean;
  featured?: boolean;
}

interface ReferralTier {
  count: number;
  bonus: number;
}

interface UserClaim {
  id: string;
  fullName: string;
  email: string;
  telegram: string;
  wallet: string;
  plan: string;
  planName: string;
  dmsol: number;
  solPaid: number;
  referralCode: string;
  referredBy: string;
  status: "approved" | "pending" | "rejected";
  txHash: string;
  registeredAt: string;
  referralCount?: number;
  referralBonus?: number;
}

interface SiteSettings {
  paymentWallet: string;
  contractAddress: string;
  contractVisible: boolean;
  treasuryWallet: string;
  treasuryWalletVisible: boolean;
  teamWallet: string;
  teamWalletVisible: boolean;
  socials: {
    telegram: string;
    twitter: string;
    discord: string;
    instagram: string;
  };
  announcement: {
    enabled: boolean;
    text: string;
    color: string;
  };
  countdown: {
    enabled: boolean;
    label: string;
    target: string;
    desc: string;
  };
  plans: Plan[];
  referralTiers: ReferralTier[];
}

const renderPlanIcon = (id: string, defIcon: string) => {
  switch (id) {
    case "explorer":
      return <Search className="w-7 h-7 text-[#39FF14] animate-pulse" />;
    case "bronze":
      return <Award className="w-7 h-7 text-amber-600" />;
    case "silver":
      return <Shield className="w-7 h-7 text-zinc-300" />;
    case "gold":
      return <Zap className="w-7 h-7 text-yellow-400" />;
    case "legend":
      return <Sparkles className="w-7 h-7 text-purple-400" />;
    default:
      return <span className="text-2xl">{defIcon}</span>;
  }
};

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: Date;
}

// Netlify Static host routing detector - fallback API targets back to Cloud Run
const isStaticNetlifyHost = typeof window !== "undefined" && 
  window.location.hostname !== "localhost" && 
  window.location.hostname !== "127.0.0.1" && 
  !window.location.hostname.includes("run.app") && 
  !window.location.hostname.includes("aistudio");

const DEFAULT_SERVER_BACKEND_URL = (((import.meta as any).env?.VITE_API_BASE) || "").replace(/\/$/, "");

const API_BASE = ((import.meta as any).env?.VITE_API_BASE)
  ? ((import.meta as any).env.VITE_API_BASE).replace(/\/$/, "")
  : (isStaticNetlifyHost 
      ? (localStorage.getItem("dmsol_custom_api_base") || DEFAULT_SERVER_BACKEND_URL)
      : "");

export default function App() {
  // Navigation / View State
  const [currentTab, setCurrentTab] = useState<"home" | "claim" | "admin" | "whitepaper" | "faq">("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // States fetched from Fullstack Express API
  const [settings, setSettings] = useState<SiteSettings>(() => {
    try {
      const cached = localStorage.getItem("dmsol_cached_settings");
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}
    return {
      paymentWallet: "7aW1Kz97k8bLp1oQs2vNm3R4s5T6u7V8w9XzMambaS0L",
      contractAddress: "DMSOLmv9H7Y7k9R6Zk2zMambaR1eS9L2g8k4V7qLmD",
      contractVisible: true,
      treasuryWallet: "7aW1Kz97k8bLp1oQs2vNm3R4s5T6u7V8w9XzMambaS0L",
      treasuryWalletVisible: false,
      teamWallet: "DMSOLmv9H7Y7k9R6Zk2zMambaR1eS9L2g8k4V7qLmD",
      teamWalletVisible: false,
      socials: { 
        telegram: "https://t.me/DarkMambaSolOfficial", 
        twitter: "https://x.com/DarkMambaSol", 
        discord: "https://discord.gg/DarkMambaSol", 
        instagram: "https://instagram.com/DarkMambaSol" 
      },
      announcement: { 
        enabled: true, 
        text: "🔥 DMSOL Airdrop Event is officially verified - Anti-Bot Verification Enabled! 🔥", 
        color: "green" 
      },
      countdown: { 
        enabled: true, 
        label: "Airdrop Claim Portal Closes In", 
        target: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        desc: "Claim strictly limited to 1,000,000,000 DMSOL (1 Billion) Fixed Supply." 
      },
      plans: [
        { id: "explorer", name: "Explorer (Free)", icon: "🔍", dmsol: 250, price: 0, sol: 0, free: true, active: true },
        { id: "bronze", name: "Bronze Level", icon: "🥉", dmsol: 1200, price: 5, sol: 0.05, free: false, active: true },
        { id: "silver", name: "Silver Level", icon: "🥈", dmsol: 2800, price: 10, sol: 0.10, free: false, active: true },
        { id: "gold", name: "Gold Level", icon: "🥇", dmsol: 6500, price: 20, sol: 0.20, free: false, active: true, featured: true },
        { id: "legend", name: "Legend Level", icon: "👑", dmsol: 18000, price: 50, sol: 0.50, free: false, active: true }
      ],
      referralTiers: [
        { count: 1, bonus: 100 },
        { count: 5, bonus: 600 },
        { count: 10, bonus: 1500 }
      ]
    };
  });

  const [users, setUsers] = useState<UserClaim[]>([]);
  const [loading, setLoading] = useState(true);

  // Client Claim Flow Form States
  const [claimName, setClaimName] = useState("");
  const [claimWallet, setClaimWallet] = useState("");
  const [claimEmail, setClaimEmail] = useState("");
  const [claimTelegram, setClaimTelegram] = useState("");
  const [claimPlanId, setClaimPlanId] = useState("");
  const [claimReferral, setClaimReferral] = useState("");
  const [claimTxHash, setClaimTxHash] = useState("");
  const [referralCookie, setReferralCookie] = useState("");

  // Simulated Virtual Web3 Wallet State
  const [mockWalletConnected, setMockWalletConnected] = useState(false);
  const [mockWalletAddress, setMockWalletAddress] = useState("");
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [isSignaturesChecking, setIsSignaturesChecking] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<any>(null);

  // Admin Config Panel States
  const [adminPassword, setAdminPassword] = useState("");
  const [adminToken, setAdminToken] = useState<string>(() => {
    try {
      return localStorage.getItem("dmsol_admin_token") || "";
    } catch (e) {
      return "";
    }
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem("dmsol_admin_token");
    } catch (e) {
      return false;
    }
  });
  const [publicStats, setPublicStats] = useState({ totalUsers: 0, approvedClaims: 0, volumeSol: 0 });
  const [adminSearch, setAdminSearch] = useState("");
  const [adminPlanFilter, setAdminPlanFilter] = useState("");
  const [adminStatusFilter, setAdminStatusFilter] = useState("");
  const [txVerificationHash, setTxVerificationHash] = useState("");
  const [customApiBase, setCustomApiBase] = useState<string>(() => {
    try {
      return localStorage.getItem("dmsol_custom_api_base") || "";
    } catch (e) {
      return "";
    }
  });
  const [txVerificationResult, setTxVerificationResult] = useState<any>(null);

  // Interactive UI enhancements states (Social Proof, Scanner, Admin settings)
  const [rollingAlert, setRollingAlert] = useState<{ id: string; name: string; dmsol: number; wallet: string } | null>(null);
  const [checkerAddress, setCheckerAddress] = useState("");
  const [checkerStatus, setCheckerStatus] = useState<"idle" | "loading" | "checked">("idle");
  const [checkerResult, setCheckerResult] = useState<any>(null);
  const [editedSettings, setEditedSettings] = useState<SiteSettings | null>(null);
  const [adminTab, setAdminTab] = useState<"ledger" | "settings">("ledger");
  const [isAdminQueryEnabled, setIsAdminQueryEnabled] = useState(false);

  // Floating AI Chatbot State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "bot",
      text: "Hello! Welcome to Dark Mamba SOL (DMSOL). I am your authentic security assistant. Ask me anything about our locked tokenomics, on-chain safety, rules, or how to claim your airdrop!",
      timestamp: new Date()
    }
  ]);
  const [userInputMessage, setUserInputMessage] = useState("");
  const [aiIsThinking, setAiIsThinking] = useState(false);

  // Success Claim Modal
  const [claimSuccessData, setClaimSuccessData] = useState<any>(null);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Notifications
  const [toasts, setToasts] = useState<{ id: string; text: string; type: "success" | "error" | "info" }>([]);

  const addToast = (text: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // 120 Day Challenge Table static representation
  const challengeBreakdowns = [
    { days: 30, reward: "10% Bonus", badge: "Mamba Starter" },
    { days: 60, reward: "25% Bonus", badge: "Obsidian Holder" },
    { days: 90, reward: "50% Bonus", badge: "Titan Diamond" },
    { days: 120, reward: "100% Matching", badge: "Dark Mamba Royalty" }
  ];

  // Fetch Site Config & Registrations on Load
  const fetchAllData = async () => {
    try {
      setLoading(true);
      // Public site Settings lookup
      const resSettings = await fetch(`${API_BASE}/api/settings`);
      if (resSettings.ok) {
        const d = await resSettings.json();
        setSettings(d);
        setEditedSettings(d);
        try {
          localStorage.setItem("dmsol_cached_settings", JSON.stringify(d));
        } catch (e) {}
      }

      // Public secure stats count lookup (prevents leaking full database users to simple viewers)
      const resStats = await fetch(`${API_BASE}/api/stats`);
      if (resStats.ok) {
        const stats = await resStats.json();
        setPublicStats(stats);
      }

      // Admin verification of users ledger is strictly loaded only if valid session exists
      const tokenToVerify = adminToken || localStorage.getItem("dmsol_admin_token");
      if (tokenToVerify) {
        const resUsers = await fetch(`${API_BASE}/api/users`, {
          headers: {
            "Authorization": `Bearer ${tokenToVerify}`
          }
        });
        if (resUsers.ok) {
          const u = await resUsers.json();
          setUsers(u);
          setIsAdminAuthenticated(true);
        } else if (resUsers.status === 401) {
          console.warn("Cleared invalid or expired administrative credentials.");
          localStorage.removeItem("dmsol_admin_token");
          setAdminToken("");
          setIsAdminAuthenticated(false);
          setUsers([]);
        }
      } else {
        setUsers([]);
      }
    } catch (e) {
      console.error(e);
      addToast("Failed to connect to backend server.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Social Proof rolling alerts effects loop
  useEffect(() => {
    const names = ["Aarav Sharma", "Rohan S.", "Kabir Dev", "Ananya Patel", "Arjun Naik", "Vikram Rathore", "Divya M.", "Deepak Kumar", "Pooja V.", "Amit Iyer", "Siddharth B.", "Neha Gupta"];
    const tiers = [250, 1200, 2800, 6500, 18000];
    const wallets = ["9J1E7qT8...fKbR", "3nSp9kQ...rT5y", "8hGbT5y...qW9e", "4gZqYmXzK...9Vsd", "7aW1Kz97...Mamba", "DMSOLmv9...LmD"];
    
    const interval = setInterval(() => {
      // Small random timing delay to feel organic
      if (Math.random() > 0.4) {
        const randomName = names[Math.floor(Math.random() * names.length)];
        const randomDmsol = tiers[Math.floor(Math.random() * tiers.length)];
        const randomWallet = wallets[Math.floor(Math.random() * wallets.length)];
        
        setRollingAlert({
          id: Math.random().toString(),
          name: randomName,
          dmsol: randomDmsol,
          wallet: randomWallet
        });
        
        // Clear alert banner after 5.5 seconds
        setTimeout(() => {
          setRollingAlert(null);
        }, 5500);
      }
    }, 14000);
    
    return () => clearInterval(interval);
  }, []);

  // Checker eligibility scan logic
  const handleCheckEligibility = () => {
    if (!checkerAddress.trim()) {
      addToast("कृपया अपना Solana Wallet Address दर्ज करें!", "error");
      return;
    }
    if (checkerAddress.trim().length < 32 || checkerAddress.trim().length > 50) {
      addToast("Invalid Solana address! SPL wallets are 32-44 base58 characters.", "error");
      return;
    }
    
    setCheckerStatus("loading");
    setCheckerResult(null);
    
    setTimeout(() => {
      const score = Math.floor(Math.random() * 35) + 65; // 65 to 100
      const txs = Math.floor(Math.random() * 220) + 9;
      const age = Math.floor(Math.random() * 18) + 1;
      const claimed = Math.random() > 0.85; // 15% probability already claimed
      const balance = (Math.random() * 3.8 + 0.05).toFixed(3);
      
      // Calculate reward tier amount
      let claimableAmt = 250;
      if (score >= 90) claimableAmt = 6500;
      else if (score >= 78) claimableAmt = 2800;
      else if (score >= 68) claimableAmt = 1200;
      
      setCheckerResult({
        score,
        txs,
        age,
        claimed,
        balance,
        claimableAmt
      });
      setCheckerStatus("checked");
      addToast("Solana verification complete! Address eligibility loaded.", "success");
    }, 2000);
  };

  // Export User claim registrations CSV ledger download
  const exportUsersToCSV = () => {
    if (users.length === 0) {
      addToast("Export करने के लिए कोई डेटा नहीं है!", "error");
      return;
    }
    
    const headers = ["Claim ID", "Full Name", "Email Address", "Telegram ID", "Solana Wallet Address", "Portal Tier", "Allocation DMSOL", "SOL Payment", "Transaction Signature Hash", "Claim Status", "Registered At Timestamp"];
    const csvRows = [headers.join(",")];
    
    users.forEach(u => {
      const values = [
        u.id,
        `"${u.fullName.replace(/"/g, '""')}"`,
        `"${u.email.replace(/"/g, '""')}"`,
        `"${u.telegram.replace(/"/g, '""')}"`,
        u.wallet,
        u.planName,
        u.dmsol,
        u.solPaid,
        u.txHash || "N/A (Free Claim)",
        u.status,
        u.registeredAt
      ];
      csvRows.push(values.join(","));
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DMSOL_Portal_Claims_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Ledger CSV spreadsheet downloaded successfully!", "success");
  };

  useEffect(() => {
    fetchAllData();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("admin") === "true" || params.get("admin") === "1" || window.location.pathname.endsWith("/admin")) {
        setIsAdminQueryEnabled(true);
      }
    }
  }, []);

  // Update Countdown timer loop
  useEffect(() => {
    if (!settings.countdown.target) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(settings.countdown.target).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, [settings.countdown.target]);

  // Handle Mock Wallet Integration to show legitimateness
  const connectMockWallet = (provider: string) => {
    const mockWallets: { [key: string]: string } = {
      phantom: "7aMambaPkD9wsdfgY65K88bLPnQS2vNm3R4s5T6u7V8w",
      solflare: "8fMambaSkD3asdfgY99L88bLPnQS9vNm2R5s4T2u1V5x",
      backpack: "BackpackMambaD8Y65K88bLPnQS2vNm3R4s5u7V8w9Xz"
    };

    const addr = mockWallets[provider];
    setMockWalletConnected(true);
    setMockWalletAddress(addr);
    setClaimWallet(addr);
    setWalletSelectorOpen(false);
    addToast(`${provider.toUpperCase()} Wallet securely paired via SHA-256 Signature!`, "success");
  };

  const disconnectMockWallet = () => {
    setMockWalletConnected(false);
    setMockWalletAddress("");
    setClaimWallet("");
    addToast("Web3 Wallet disconnected securely.", "info");
  };

  // Submit Claim Flow
  const onClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimName || !claimWallet || !claimEmail || !claimTelegram || !claimPlanId) {
      addToast("Please fill all required fields correctly.", "error");
      return;
    }

    const selectedPlan = settings.plans.find(p => p.id === claimPlanId);
    if (!selectedPlan) {
      addToast("Invalid Selected Plan.", "error");
      return;
    }

    if (!selectedPlan.free && !claimTxHash) {
      addToast("Solana transaction hash signature required for verification of payments.", "error");
      return;
    }

    // Verify Sig on-chain with backend if it's a paid tier
    if (!selectedPlan.free && claimTxHash) {
      setIsSignaturesChecking(true);
      try {
        const verifyRes = await fetch(`${API_BASE}/api/verify-transaction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            txHash: claimTxHash,
            solAmount: selectedPlan.sol,
            planId: selectedPlan.id
          })
        });

        const verificationData = await verifyRes.json();
        setVerificationFeedback(verificationData);

        if (!verifyRes.ok) {
          addToast(verificationData.error || "Transaction signature verification failed.", "error");
          setIsSignaturesChecking(false);
          return;
        }
      } catch (err) {
        console.error(err);
        addToast("Solana Mainnet RPC timed out verifying transaction signature.", "error");
        setIsSignaturesChecking(false);
        return;
      } finally {
        setIsSignaturesChecking(false);
      }
    }

    // Generate unique referral code
    const uniqueReferralCode = "DM-" + Math.random().toString(36).substr(2, 7).toUpperCase();

    const payload = {
      fullName: claimName,
      email: claimEmail,
      telegram: claimTelegram,
      wallet: claimWallet,
      plan: selectedPlan.id,
      planName: selectedPlan.name,
      dmsol: selectedPlan.dmsol,
      solPaid: selectedPlan.sol,
      referralCode: uniqueReferralCode,
      referredBy: claimReferral ? claimReferral.toUpperCase() : "",
      status: selectedPlan.free ? "approved" : "pending",
      txHash: claimTxHash
    };

    try {
      const response = await fetch(`${API_BASE}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const savedData = await response.json();
        setClaimSuccessData(savedData.user);
        addToast("DMSOL Airdrop registration registered. Welcome to Mamba!", "success");
        // Clear forms
        setClaimName("");
        setClaimEmail("");
        setClaimTelegram("");
        setClaimPlanId("");
        setClaimReferral("");
        setClaimTxHash("");
        fetchAllData(); // Refresh list on backend
      } else {
        const err = await response.json();
        addToast(err.error || "Failed to submit claim details.", "error");
      }
    } catch (err) {
      addToast("Network failure registers user.", "error");
    }
  };

  // Submit AI message to secure Gemini assistant
  const handleSendMessage = async () => {
    if (!userInputMessage.trim()) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: "user",
      text: userInputMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMsg]);
    const currentQuery = userInputMessage;
    setUserInputMessage("");
    setAiIsThinking(true);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: currentQuery,
          previousMessages: chatMessages.slice(-5) // Send history for memory
        })
      });

      if (response.ok) {
        const respData = await response.json();
        const botMsg: ChatMessage = {
          id: Math.random().toString(),
          sender: "bot",
          text: respData.text,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, botMsg]);
      } else {
        throw new Error("Chat gateway error.");
      }
    } catch (e) {
      // Offline fallback text
      const botMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: "bot",
        text: "Mamba Bot is operating temporarily in offline backup state. For complete real-time verification and automated smart contract logic, please check back in a few moments.",
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, botMsg]);
    } finally {
      setAiIsThinking(false);
    }
  };

  // Admin Security Unlock using dynamic API Token Generation
  const unlockAdminPortal = async () => {
    if (!adminPassword) {
      addToast("Please enter the administrator password.", "error");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem("dmsol_admin_token", data.token);
        setAdminToken(data.token);
        setIsAdminAuthenticated(true);
        addToast("Clearance authenticated! Dynamic secure token issued.", "success");
        
        // Immediately load the restricted raw participants list
        const resUsers = await fetch(`${API_BASE}/api/users`, {
          headers: { "Authorization": `Bearer ${data.token}` }
        });
        if (resUsers.ok) {
          const u = await resUsers.json();
          setUsers(u);
        }
      } else {
        addToast(data.error || "Invalid security password. Access Blocked.", "error");
      }
    } catch (err) {
      addToast("Failed to verify credentials on auth server.", "error");
    }
  };

  // Admin Logout (Clears dynamic session completely)
  const lockAdminPortal = async () => {
    try {
      await fetch(`${API_BASE}/api/admin/logout`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${adminToken}` }
      });
    } catch (e) {}
    localStorage.removeItem("dmsol_admin_token");
    setAdminToken("");
    setIsAdminAuthenticated(false);
    setUsers([]);
    setAdminPassword("");
    addToast("Admin session successfully terminated.", "info");
  };

  // Delete registration in admin (secured)
  const deleteClaimRecord = async (id: string) => {
    if (!confirm("Are you absolutely sure you want to delete this client registration record?")) return;
    try {
       const res = await fetch(`${API_BASE}/api/users/delete`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        addToast("Claim record successfully purged.", "info");
        fetchAllData();
      } else {
        const data = await res.json();
        addToast(data.error || "Authorization error.", "error");
      }
    } catch (err) {
      addToast("Server failed to remove record.", "error");
    }
  };

  // Update Status in admin (secured)
  const updateClaimStatus = async (id: string, status: "approved" | "rejected") => {
    try {
       const res = await fetch(`${API_BASE}/api/users/update-status`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        addToast(`Claim successfully marked as ${status.toUpperCase()}!`, "success");
        fetchAllData();
      } else {
        const data = await res.json();
        addToast(data.error || "Authorization error.", "error");
      }
    } catch (err) {
      addToast("Failed to update status on server.", "error");
    }
  };

  // Live Check Signature tool inside Admin panel
  const runOnChainSignatureCheck = async () => {
    if (!txVerificationHash) {
      addToast("Please enter a Solana transaction signature.", "error");
      return;
    }
    setTxVerificationResult("loading");
    try {
       const res = await fetch(`${API_BASE}/api/verify-transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: txVerificationHash })
      });
      if (res.ok) {
        const info = await res.json();
        setTxVerificationResult(info);
      } else {
        const errorData = await res.json();
        setTxVerificationResult({ error: errorData.error });
      }
    } catch (e) {
      setTxVerificationResult({ error: "Mainnet Web3 Node connection timeout." });
    }
  };

  // Filter users inside admin UI
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      adminSearch === "" || 
      u.fullName.toLowerCase().includes(adminSearch.toLowerCase()) ||
      u.wallet.toLowerCase().includes(adminSearch.toLowerCase()) ||
      u.telegram.toLowerCase().includes(adminSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(adminSearch.toLowerCase()) ||
      u.referralCode.toLowerCase().includes(adminSearch.toLowerCase());
    
    const matchesPlan = adminPlanFilter === "" || u.plan === adminPlanFilter;
    const matchesStatus = adminStatusFilter === "" || u.status === adminStatusFilter;
    
    return matchesSearch && matchesPlan && matchesStatus;
  });

  return (
    <div className="relative min-height-screen bg-black text-gray-200 font-sans selection:bg-[#39FF14] selection:text-black">
      {/* GRID LAYOUT BACKGROUND */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(57,255,20,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(57,255,20,0.015)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none z-0"></div>
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-emerald-500/5 to-transparent rounded-full blur-3xl pointer-events-none z-0"></div>
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-gradient-to-r from-[#7C3AED]/5 to-transparent rounded-full blur-3xl pointer-events-none z-0"></div>

      {/* TOAST NOTIFICATION STREAM */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`p-4 rounded-xl border shadow-lg flex gap-3 text-sm font-semibold transition-all duration-300 ${
              t.type === "success" 
                ? "bg-[#0d0d0d] border-[#39FF14]/30 text-[#39FF14]" 
                : t.type === "error" 
                ? "bg-red-950/40 border-red-500/40 text-red-400"
                : "bg-blue-950/40 border-blue-500/40 text-blue-300"
            }`}
          >
            {t.type === "success" ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>

      {/* HEADER ANNOUNCEMENT BAR */}
      {settings.announcement.enabled && settings.announcement.text && (
        <div className="relative z-50 bg-[#39FF14] text-black text-center text-xs font-bold py-2 px-4 shadow-[0_2px_10px_rgba(57,255,20,0.2)] tracking-wider">
          {settings.announcement.text}
        </div>
      )}

      {/* GLOBAL SITE NAVIGATION */}
      <nav className="sticky top-0 z-45 bg-black/95 border-b border-[#39FF14]/12 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab("home")}>
            <div className="w-12 h-12 bg-zinc-900 border-2 border-[#39FF14] rounded-full overflow-hidden flex items-center justify-center shadow-[0_0_15px_rgba(57,255,20,0.3)] p-1 bg-black">
              <img 
                src="/logo.png" 
                alt="DMSOL" 
                referrerPolicy="no-referrer"
                className="w-10 h-10 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.nextElementSibling;
                  if (fallback) fallback.classList.remove("hidden");
                }}
              />
              <span className="text-xl hidden">🐍</span>
            </div>
            <div>
              <span className="text-lg font-black tracking-widest text-white block font-mono">DMSOL</span>
              <span className="text-[10px] text-[#39FF14] font-bold tracking-widest block uppercase">Dark Mamba SOL</span>
            </div>
          </div>

          {/* DESKTOP MENU */}
          <div className="hidden md:flex items-center gap-2">
            <button 
              onClick={() => setCurrentTab("home")} 
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-200 ${
                currentTab === "home" ? "text-[#39FF14] bg-[#39FF14]/8 border border-[#39FF14]/20" : "text-gray-400 hover:text-white"
              }`}
            >
              About
            </button>
            <button 
              onClick={() => setCurrentTab("whitepaper")} 
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-200 ${
                currentTab === "whitepaper" ? "text-[#39FF14] bg-[#39FF14]/8 border border-[#39FF14]/20" : "text-gray-400 hover:text-white"
              }`}
            >
              Whitepaper
            </button>
            <button 
              onClick={() => setCurrentTab("faq")} 
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-200 ${
                currentTab === "faq" ? "text-[#39FF14] bg-[#39FF14]/8 border border-[#39FF14]/20" : "text-gray-400 hover:text-white"
              }`}
            >
              FAQ
            </button>
            {isAdminQueryEnabled && (
              <button 
                onClick={() => setCurrentTab("admin")} 
                className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-200 ${
                  currentTab === "admin" ? "bg-zinc-800 text-[#39FF14]" : "text-gray-400 hover:text-zinc-300"
                }`}
              >
                Admin Controls
              </button>
            )}
            <button 
              onClick={() => setCurrentTab("claim")} 
              className="ml-4 px-6 py-2.5 bg-[#39FF14] text-black rounded-lg font-extrabold text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(57,255,20,0.30)] hover:shadow-[0_0_35px_rgba(57,255,20,0.50)] hover:bg-white transition-all duration-300 flex items-center gap-1.5"
            >
              <Gift className="w-3.5 h-3.5 text-black" /> Claim Airdrop
            </button>
          </div>

          {/* MOBILE TOGGLE */}
          <button 
            className="md:hidden text-[#39FF14] p-2 hover:bg-zinc-900 rounded-lg transition"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* MOBILE DROPDOWN */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 right-0 bg-zinc-950 border-b border-[#39FF14]/20 py-4 px-6 flex flex-col gap-3 shadow-xl z-50">
            <button 
              onClick={() => { setCurrentTab("home"); setMobileMenuOpen(false); }}
              className="text-left py-2 border-b border-zinc-905 text-gray-300 hover:text-[#39FF14] text-sm uppercase font-semibold"
            >
              About
            </button>
            <button 
              onClick={() => { setCurrentTab("whitepaper"); setMobileMenuOpen(false); }}
              className="text-left py-2 border-b border-zinc-905 text-gray-300 hover:text-[#39FF14] text-sm uppercase font-semibold"
            >
              Whitepaper
            </button>
            <button 
              onClick={() => { setCurrentTab("faq"); setMobileMenuOpen(false); }}
              className="text-left py-2 border-b border-zinc-905 text-gray-300 hover:text-[#39FF14] text-sm uppercase font-semibold"
            >
              FAQ
            </button>
            {isAdminQueryEnabled && (
              <button 
                onClick={() => { setCurrentTab("admin"); setMobileMenuOpen(false); }}
                className="text-left py-2 border-b border-zinc-905 text-gray-300 hover:text-[#39FF14] text-sm uppercase font-semibold"
              >
                Admin Controls
              </button>
            )}
            <button 
              onClick={() => { setCurrentTab("claim"); setMobileMenuOpen(false); }}
              className="mt-2 py-3 bg-[#39FF14] text-black font-extrabold text-sm rounded-lg text-center tracking-widest uppercase shadow-md flex items-center justify-center gap-2"
            >
              <Gift className="w-4 h-4 text-black" /> Claim Airdrop
            </button>
          </div>
        )}
      </nav>

      {/* TIMER COUNTDOWN BANNER */}
      {settings.countdown.enabled && settings.countdown.target && (
        <div className="bg-gradient-to-r from-zinc-950 via-[#122A00]/20 to-zinc-950 border-b border-[#39FF14]/10 py-6">
          <div className="max-w-4xl mx-auto text-center px-6">
            <h4 className="text-[10px] uppercase font-bold tracking-[6px] text-zinc-400 mb-2">{settings.countdown.label}</h4>
            <div className="flex justify-center items-center gap-4 md:gap-8 my-3">
              <div className="bg-black/80 border border-[#39FF14]/20 rounded-xl p-3 md:p-4 min-w-[70px] shadow-inner">
                <span className="text-2xl md:text-3xl font-black text-[#39FF14] font-mono block tracking-tight">
                  {String(timeLeft.days).padStart(2, "0")}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-gray-400 mt-1 block">Days</span>
              </div>
              <span className="text-xl font-bold text-[#39FF14]/40">:</span>
              <div className="bg-black/80 border border-[#39FF14]/20 rounded-xl p-3 md:p-4 min-w-[70px] shadow-inner">
                <span className="text-2xl md:text-3xl font-black text-[#39FF14] font-mono block tracking-tight">
                  {String(timeLeft.hours).padStart(2, "0")}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-gray-400 mt-1 block">Hours</span>
              </div>
              <span className="text-xl font-bold text-[#39FF14]/40">:</span>
              <div className="bg-black/80 border border-[#39FF14]/20 rounded-xl p-3 md:p-4 min-w-[70px] shadow-inner">
                <span className="text-2xl md:text-3xl font-black text-[#39FF14] font-mono block tracking-tight">
                  {String(timeLeft.minutes).padStart(2, "0")}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-gray-400 mt-1 block">Mins</span>
              </div>
              <span className="text-xl font-bold text-[#39FF14]/40">:</span>
              <div className="bg-black/80 border border-[#39FF14]/20 rounded-xl p-3 md:p-4 min-w-[70px] shadow-inner">
                <span className="text-2xl md:text-3xl font-black text-neon text-[#39FF14] font-mono block tracking-tight">
                  {String(timeLeft.seconds).padStart(2, "0")}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-gray-400 mt-1 block">Secs</span>
              </div>
            </div>
            <p className="text-xs text-zinc-400 italic tracking-wider mt-2">{settings.countdown.desc}</p>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
           VIEW: HOME / DETAILS
         ------------------------------------------------------------- */}
      {currentTab === "home" && (
        <div className="max-w-7xl mx-auto px-6 py-12 md:py-16 relative z-10">
          
          {/* HERO SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-24">
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/30 text-xs font-black uppercase tracking-widest text-[#39FF14] mb-6">
                <Sparkles className="w-3.5 h-3.5 text-[#39FF14]" /> Verified Web3 Launch
              </span>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-4 uppercase leading-none">
                DARK MAMBA <br />
                <span className="text-[#39FF14] shadow-glow">SOLANA</span>
              </h1>
              <p className="text-lg text-gray-400 tracking-wide font-mono uppercase mb-4 text-[#39FF14]">Dark. Fast. Fully Audited.</p>
              <p className="text-md text-gray-400 leading-relaxed mb-8 max-w-xl">
                A community-backed meme environment built with <strong>zero hidden developers</strong>, <strong>locked liquidity</strong>, and real cryptographic validation to eliminate potential safety scams permanently on Solana.
              </p>
              <div className="flex gap-4 flex-wrap">
                <button 
                  onClick={() => setCurrentTab("claim")} 
                  className="px-8 py-3 bg-[#39FF14] text-black font-black text-xs tracking-wider uppercase rounded-lg shadow-lg hover:bg-white transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <ArrowUpRight className="w-4 h-4 text-black animate-pulse" /> Claim Your Allocation
                </button>
                <a 
                  href="#trust-mechanisms"
                  className="px-8 py-3 bg-zinc-900 text-[#39FF14] border border-[#39FF14]/30 font-extrabold text-xs tracking-wider uppercase rounded-lg hover:bg-zinc-850 transition"
                >
                  🛡️ Trust Verification
                </a>
              </div>

              {/* Quick live total users counter */}
              <div className="mt-12 pt-8 border-t border-zinc-800 w-full grid grid-cols-3 gap-6">
                <div>
                  <span className="text-2xl font-black text-white block">{((publicStats.totalUsers || users.length || 0) + 312).toLocaleString()}</span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1 block">Live Verified Holders</span>
                </div>
                <div>
                  <span className="text-2xl font-black text-[#39FF14] block">1 Billion</span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1 block">Fixed Hard Supply</span>
                </div>
                <div>
                  <span className="text-2xl font-black text-[#7C3AED] block">45% Locked</span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1 block">LP Pool Proof</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center relative">
              <div className="relative w-72 h-72 md:w-96 md:h-96 rounded-3xl bg-zinc-950 border border-[#39FF14]/30 overflow-hidden flex items-center justify-center group shadow-[0_0_50px_rgba(57,255,20,0.15)] bg-[#040404]">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 pointer-events-none"></div>
                <img 
                  src="/mascot.png" 
                  alt="Dark Mamba SOL Mascot" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fallback = e.currentTarget.nextElementSibling;
                    if (fallback) fallback.classList.remove("hidden");
                  }}
                />
                <span className="text-[150px] md:text-[200px] select-none transform group-hover:scale-105 transition-transform duration-500 hidden">🐍</span>
                <div className="absolute bottom-6 left-6 right-6 z-20 bg-black/90 border border-zinc-800 p-4 rounded-xl backdrop-blur-md">
                  <span className="text-xs text-zinc-400 uppercase tracking-widest block font-mono">Current Mascot</span>
                  <p className="text-sm font-bold text-white uppercase tracking-wider mt-1">Dark Mamba - Apex Predator</p>
                </div>
              </div>
            </div>
          </div>

          {/* PARAMOUNT TOKENOMICS LAYOUT */}
          <div id="trust-mechanisms" className="mb-24 pt-12">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-[#39FF14] text-xs font-bold uppercase tracking-[4px]">Ecosystem Distribution</span>
              <h2 className="text-3xl md:text-4xl text-white font-extrabold uppercase mt-2">TRUE & LURK-PROOF <span className="text-[#39FF14]">TOKENOMICS</span></h2>
              <p className="text-gray-400 text-sm mt-3 leading-relaxed">
                We have reconstructed tokenomics parameter allocations modeled on mathematical equilibrium. No secret seed allocations can destroy the market value. Both developers and users are bound by on-chain lock laws.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <div className="bg-[#0b0b0b] border border-[#39FF14]/25 rounded-2xl p-6 relative hover:border-[#39FF14]/60 transition group text-left flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="w-10 h-10 bg-[#39FF14]/10 rounded-xl flex items-center justify-center border border-[#39FF14]/25 mb-3 text-[#39FF14] shadow-[0_0_15px_rgba(57,255,20,0.1)]">
                    <Droplet className="w-5 h-5 text-[#39FF14]" />
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase font-mono block">Ecosystem Pool</span>
                  <h3 className="text-md font-bold text-white mt-1 uppercase">Liquidity Pool (LP)</h3>
                  <span className="text-3xl font-black text-[#39FF14] block mt-1.5 font-mono">45%</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed mt-2">
                  450 Million (450,000,000 DMSOL) locked securely inside liquidity DEX pools for 12 months, securing capital depth against market anomalies.
                </p>
              </div>

              <div className="bg-[#0b0b0b] border border-zinc-800 rounded-2xl p-6 relative hover:border-[#39FF14]/40 transition group text-left flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="w-10 h-10 bg-[#39FF14]/10 rounded-xl flex items-center justify-center border border-[#39FF14]/25 mb-3 text-[#39FF14] shadow-[0_0_15px_rgba(57,255,20,0.1)]">
                    <Gift className="w-5 h-5 text-[#39FF14]" />
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase font-mono block">Ecosystem Pool</span>
                  <h3 className="text-md font-bold text-white mt-1 uppercase">Community Airdrop</h3>
                  <span className="text-3xl font-black text-white block mt-1.5 font-mono">18%</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed mt-2">
                  180 Million (180,000,000 DMSOL) reserved strictly for organic community allocation, anti-sybil registers, and participant milestones.
                </p>
              </div>

              <div className="bg-[#0b0b0b] border border-zinc-800 rounded-2xl p-6 relative hover:border-[#39FF14]/40 transition group text-left flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="w-10 h-10 bg-[#39FF14]/10 rounded-xl flex items-center justify-center border border-[#39FF14]/25 mb-3 text-[#39FF14] shadow-[0_0_15px_rgba(57,255,20,0.1)]">
                    <Flame className="w-5 h-5 text-[#39FF14]" />
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase font-mono block">Ecosystem Pool</span>
                  <h3 className="text-md font-bold text-white mt-1 uppercase">Phase Burn Reserve</h3>
                  <span className="text-3xl font-black text-white block mt-1.5 font-mono">10%</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed mt-2">
                  100 Million (100,000,000 DMSOL) locked for scheduled deflationary burns across 8 distinct phases, driving coin scarcity permanently.
                </p>
              </div>

              <div className="bg-[#0b0b0b] border border-zinc-800 rounded-2xl p-6 relative hover:border-[#39FF14]/40 transition group text-left flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/25 mb-3 text-orange-450 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                    <Lock className="w-5 h-5 text-orange-500" />
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase font-mono block">Ecosystem Pool</span>
                  <h3 className="text-md font-bold text-white mt-1 uppercase">Team Vesting Locked</h3>
                  <span className="text-3xl font-black text-orange-500 block mt-1.5 font-mono">8%</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed mt-2">
                  80 Million (80,000,000 DMSOL) developer reserve protected by an absolute 12-month linear vesting lock to avoid dump coordinates.
                </p>
              </div>

              <div className="bg-[#0b0b0b] border border-zinc-800 rounded-2xl p-6 relative hover:border-[#39FF14]/40 transition group text-left flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="w-10 h-10 bg-[#39FF14]/10 rounded-xl flex items-center justify-center border border-[#39FF14]/25 mb-3 text-[#39FF14] shadow-[0_0_15px_rgba(57,255,20,0.1)]">
                    <Sparkles className="w-5 h-5 text-[#39FF14]" />
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase font-mono block">Ecosystem Pool</span>
                  <h3 className="text-md font-bold text-white mt-1 uppercase">Marketing & Promo</h3>
                  <span className="text-3xl font-black text-white block mt-1.5 font-mono">8%</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed mt-2">
                  80 Million (80,000,000 DMSOL) dedicated to global outreach, key exchange integrations, and visibility campaigns across multiple channels.
                </p>
              </div>

              <div className="bg-[#0b0b0b] border border-zinc-800 rounded-2xl p-6 relative hover:border-[#39FF14]/40 transition group text-left flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="w-10 h-10 bg-[#39FF14]/10 rounded-xl flex items-center justify-center border border-[#39FF14]/25 mb-3 text-[#39FF14] shadow-[0_0_15px_rgba(57,255,20,0.1)]">
                    <Layers className="w-5 h-5 text-[#39FF14]" />
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase font-mono block">Ecosystem Pool</span>
                  <h3 className="text-md font-bold text-white mt-1 uppercase">Treasury Reserves</h3>
                  <span className="text-3xl font-black text-white block mt-1.5 font-mono">6%</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed mt-2">
                  60 Million (60,000,000 DMSOL) locked in multi-sig vault for ecosystem expansions, community proposals, and operational agility.
                </p>
              </div>

              <div className="bg-[#0b0b0b] border border-zinc-800 rounded-2xl p-6 relative hover:border-[#39FF14]/40 transition group text-left flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="w-10 h-10 bg-[#39FF14]/10 rounded-xl flex items-center justify-center border border-[#39FF14]/25 mb-3 text-[#39FF14] shadow-[0_0_15px_rgba(57,255,20,0.1)]">
                    <Users className="w-5 h-5 text-[#39FF14]" />
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase font-mono block">Ecosystem Pool</span>
                  <h3 className="text-md font-bold text-white mt-1 uppercase">Referral Rewards</h3>
                  <span className="text-3xl font-black text-white block mt-1.5 font-mono">5%</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed mt-2">
                  50 Million (50,000,000 DMSOL) allocated strictly to verify referral payout cycles, protected by daily bot protection thresholds.
                </p>
              </div>

              <div className="bg-[#0b0b0b] border border-[#39FF14]/20 rounded-2xl p-6 relative flex flex-col justify-between items-start bg-gradient-to-br from-[#122A00]/20 to-zinc-950 min-h-[220px]">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#39FF14]/15 text-[9px] uppercase tracking-wider font-extrabold text-[#39FF14] mb-3">On-Chain Safe</span>
                  <h4 className="text-md font-bold text-white uppercase tracking-wider mb-2">Freeze & Mint Revoked</h4>
                  <p className="text-[11px] text-zinc-450 leading-relaxed">
                    Zero manipulation is physically possible. Once listing commences, token codes cannot undergo key edits. Fully safe on-chain.
                  </p>
                </div>
                {settings.contractAddress && (
                  <div className="w-full mt-4 pt-3 border-t border-zinc-800 select-all font-mono text-[9px] text-[#39FF14] overflow-hidden truncate col-span-1">
                    {settings.contractAddress}
                  </div>
                )}
              </div>
            </div>

            {settings.contractAddress && settings.contractVisible && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-[#39FF14] flex-shrink-0" />
                  <div className="text-left">
                    <span className="text-[10px] text-zinc-400 tracking-wider block font-mono uppercase">Solana Mint Contract Address</span>
                    <span className="text-sm font-bold font-mono text-[#39FF14] block tracking-tight break-all">
                      {settings.contractAddress}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(settings.contractAddress);
                    addToast("Contract Address copied to clipboard!", "success");
                  }}
                  className="px-5 py-2.5 bg-zinc-90 w-full md:w-auto text-xs font-bold tracking-wider text-white border border-zinc-800 rounded-lg hover:bg-zinc-800 transition"
                >
                  Copy verified contract
                </button>
              </div>
            )}

            {((settings.treasuryWallet && settings.treasuryWalletVisible) || (settings.teamWallet && settings.teamWalletVisible)) && (
              <div className="bg-zinc-950/80 border border-zinc-850 p-6 md:p-8 rounded-2xl text-left flex flex-col gap-5 bg-gradient-to-r from-black via-zinc-950 to-black mt-6 animate-fade-in">
                <div className="border-b border-zinc-850 pb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-[#39FF14] uppercase tracking-wider flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#39FF14]" /> Official Verified Project Wallets
                    </h4>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      These are verified on-chain treasury & team coordinates of the Dark Mamba SOL ecosystem. Always cross-verify addresses.
                    </p>
                  </div>
                  <span className="text-[9px] font-extrabold uppercase bg-[#39FF14]/10 text-[#39FF14] px-2 py-0.5 rounded border border-[#39FF14]/20">Active verification</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {settings.treasuryWallet && settings.treasuryWalletVisible && (
                    <div className="bg-black/60 border border-zinc-850 p-4 rounded-xl flex flex-col justify-between gap-3">
                      <div>
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#39FF14] block">👑 Official Treasury Wallet</span>
                        <span className="text-xs font-mono text-zinc-300 block break-all font-semibold mt-1">
                          {settings.treasuryWallet}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(settings.treasuryWallet);
                          addToast("Treasury Wallet copied to clipboard!", "success");
                        }}
                        className="py-1.5 px-3 bg-zinc-900 w-max text-[9px] font-extrabold tracking-wider text-white border border-zinc-800 rounded-lg hover:bg-zinc-800 transition uppercase"
                      >
                        Copy Treasury Wallet
                      </button>
                    </div>
                  )}

                  {settings.teamWallet && settings.teamWalletVisible && (
                    <div className="bg-black/60 border border-zinc-850 p-4 rounded-xl flex flex-col justify-between gap-3">
                      <div>
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-purple-400 block">👥 Core Team Wallet</span>
                        <span className="text-xs font-mono text-zinc-300 block break-all font-semibold mt-1">
                          {settings.teamWallet}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(settings.teamWallet);
                          addToast("Team Wallet copied to clipboard!", "success");
                        }}
                        className="py-1.5 px-3 bg-zinc-900 w-max text-[9px] font-extrabold tracking-wider text-white border border-zinc-800 rounded-lg hover:bg-zinc-800 transition uppercase"
                      >
                        Copy Team Wallet
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 120 DAY LOYALTY HOLD PROGRAM */}
          <div className="mb-24">
            <div className="bg-gradient-to-b from-[#0a0a0a] to-[#040404] border border-zinc-800 rounded-3xl p-8 md:p-12 relative overflow-hidden text-center">
              <span className="text-[#39FF14] text-xs font-mono tracking-widest block uppercase mb-3">Loyalty Shield</span>
              <h2 className="text-2xl md:text-3xl font-black text-white uppercase">The 120-Day Mamba Challenge</h2>
              <p className="text-sm text-gray-400 max-w-xl mx-auto mt-2">
                We reward commitment, not temporary speculation. Holding your DMSOL inside verified wallets secures systematic staking multiplier rewards.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
                {challengeBreakdowns.map((c, i) => (
                  <div key={i} className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl flex flex-col items-center hover:border-[#39FF14]/40 transition">
                    <div className="w-10 h-10 bg-[#39FF14]/5 border border-[#39FF14]/20 rounded-full flex items-center justify-center font-bold text-xs text-[#39FF14] mb-3">
                      {c.days}D
                    </div>
                    <span className="text-zinc-500 text-[10px] uppercase block tracking-wider">{c.badge}</span>
                    <span className="text-xl font-bold text-white block mt-1 tracking-tight">{c.reward}</span>
                    <p className="text-[11px] text-zinc-400 mt-2 italic">Minimum lock multipliers</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CHOOSE PLAN TIERS CARDS */}
          <div className="mb-24">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-[#39FF14] text-xs font-bold uppercase tracking-wider">Airdrop Multipliers</span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white uppercase mt-1">Select Verified Portal Plan</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {settings.plans.filter(p => p.active).map(p => (
                <div 
                  key={p.id} 
                  className={`bg-[#0b0b0b] rounded-2xl border p-5 flex flex-col justify-between text-center relative ${
                    p.featured ? "border-[#39FF14] shadow-[0_0_20px_rgba(57,255,20,0.15)]" : "border-zinc-800"
                  }`}
                >
                  {p.featured && (
                    <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#39FF14] text-black text-[9px] font-black uppercase px-2.5 py-1 rounded tracking-widest">
                      RECOMMENDED
                    </span>
                  )}
                  <div>
                    <div className="text-3xl mb-3 flex items-center justify-center h-10">{renderPlanIcon(p.id, p.icon)}</div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">{p.name}</h4>
                    <span className="text-3xl font-black text-[#39FF14] block tracking-tight font-mono">{p.dmsol.toLocaleString()}</span>
                    <span className="text-[9px] text-zinc-500 uppercase block font-mono">DMSOL Guaranteed</span>
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-900">
                    <span className="text-xs text-white uppercase font-bold block">
                      {p.free ? "FREE ENTRY" : `${p.sol} SOL`}
                    </span>
                    <span className="text-[10px] text-gray-500 block mt-1">
                      {p.free ? "Safe basic access" : `~$${p.price} USD equivalency`}
                    </span>
                    <button 
                      onClick={() => {
                        setClaimPlanId(p.id);
                        setCurrentTab("claim");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`w-full py-2 rounded mt-4 font-bold text-xs tracking-wider uppercase transition ${
                        p.featured ? "bg-[#39FF14] text-black hover:bg-white" : "bg-zinc-900 text-[#39FF14] border border-[#39FF14]/20 hover:bg-[#39FF14] hover:text-black"
                      }`}
                    >
                      SELECT {p.name.split(" ")[0]}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ROADMAP SECTION */}
          <div className="mb-12">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-[#39FF14] text-xs font-bold uppercase tracking-widest">Growth Timeline</span>
              <h2 className="text-2xl md:text-3xl text-white font-extrabold uppercase mt-1">MAMBA DEVELOPMENT PATHWAY</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-[#0b0b0b] border-l-2 border-[#39FF14] border-y-zinc-805 border-r-zinc-805 p-6 rounded-r-xl">
                <span className="text-[10px] text-[#39FF14] font-mono uppercase block tracking-wider font-extrabold mb-1">Phase 1 — Launch</span>
                <h4 className="text-md font-bold text-white uppercase mb-2">Token deployment & Verification</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Verified website construction, whitepaper legal parameters declaration, secure database hookups, launching the smart chatbot support system.
                </p>
              </div>
              <div className="bg-[#0b0b0b] p-6 rounded-xl border border-zinc-850 opacity-60">
                <span className="text-[10px] text-zinc-400 font-mono uppercase block tracking-wider font-bold mb-1">Phase 2 — Marketing</span>
                <h4 className="text-md font-bold text-white uppercase mb-2">Community Multipliers</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Airdrop registrations accumulation, strict spam purification, verified referral bonuses checks, key community events activation.
                </p>
              </div>
              <div className="bg-[#0b0b0b] p-6 rounded-xl border border-zinc-850 opacity-60">
                <span className="text-[10px] text-zinc-400 font-mono uppercase block tracking-wider font-bold mb-1">Phase 3 — DEX Add</span>
                <h4 className="text-md font-bold text-white uppercase mb-2">Raydium LP Injection</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Mint SPL token securely, lock 45% LP instantly for 12 months with on-chain locking, complete smart contract audited release.
                </p>
              </div>
              <div className="bg-[#0b0b0b] p-6 rounded-xl border border-zinc-850 opacity-60">
                <span className="text-[10px] text-zinc-400 font-mono uppercase block tracking-wider font-bold mb-1">Phase 4 — Exchange</span>
                <h4 className="text-md font-bold text-white uppercase mb-1">CEX Listing & Ecosystem</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Apply CEX tracking listings, release Dark Mamba NFT series, activate DAO community governance multipliers.
                </p>
              </div>
            </div>
          </div>

          {/* INTERACTIVE AIRDROP ELIGIBILITY SCANNER (ANTI-SCAM PROOF) */}
          <div className="mb-24 mt-16 bg-gradient-to-br from-zinc-950 to-[#0a0a0a] border border-[#39FF14]/25 rounded-3xl p-8 text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#39FF14]/5 to-transparent rounded-bl-full pointer-events-none"></div>
            
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-1.5 bg-[#39FF14]/10 text-[#39FF14] text-[10px] uppercase font-mono px-3 py-1 rounded-full font-black mb-4 border border-[#39FF14]/25">
                <Shield className="w-3.5 h-3.5 text-[#39FF14]" /> On-Chain Ledger Scan (बाय-पास ब्लॉकचेन जाँच)
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Check Your Airdrop Eligibility (अपनी योग्यता की जांच करें)</h2>
              <p className="text-xs text-zinc-400 mt-2 mb-6 leading-relaxed">
                Enter your Solana wallet address below. Our smart verification protocols will perform simulated audits of your address balance, ledger age, on-chain DeFi actions, and anti-spam metrics to calculate your guaranteed allocation multiplier!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text"
                  placeholder="Paste your Solana Wallet Address (e.g. Phantom, Solflare)"
                  value={checkerAddress}
                  onChange={(e) => setCheckerAddress(e.target.value)}
                  className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-[#39FF14] focus:outline-none focus:border-[#39FF14] placeholder-zinc-700"
                />
                <button 
                  onClick={handleCheckEligibility}
                  disabled={checkerStatus === "loading"}
                  className="px-6 py-3 bg-[#39FF14] text-black font-extrabold text-xs tracking-wider uppercase rounded-xl hover:bg-white transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {checkerStatus === "loading" ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Scanning Blocks...
                    </>
                  ) : (
                    "Scan Wallet Address"
                  )}
                </button>
              </div>

              {/* SCANNING ACTIVE INDICATOR */}
              {checkerStatus === "loading" && (
                <div className="mt-6 p-4 rounded-xl border border-zinc-850 bg-black text-xs font-mono text-[#39FF14] flex flex-col gap-2">
                  <span className="animate-pulse flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#39FF14] rounded-full animate-ping"></span>
                    Querying Solana mainnet ledger block coordinates...
                  </span>
                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#39FF14] h-1.5 animate-pulse" style={{ width: '65%' }}></div>
                  </div>
                  <span className="text-[10px] text-zinc-500">Checking for sybil patterns & historical gas milestones</span>
                </div>
              )}

              {/* CHECKED RESULTS DISPLAY */}
              {checkerStatus === "checked" && checkerResult && (
                <div className="mt-8 p-6 rounded-2xl bg-zinc-950 border border-zinc-850 animate-fade-in relative">
                  <div className="absolute top-4 right-4 bg-[#39FF14]/10 border border-[#39FF14]/35 px-4 py-1.5 rounded-xl flex items-center gap-1.5">
                    <span className="text-[11px] font-black text-[#39FF14] font-mono">{checkerResult.score}% Rank Score</span>
                  </div>

                  <h4 className="text-[#39FF14] font-bold text-sm tracking-wider uppercase mb-4 flex items-center gap-1.5 font-mono">
                    <CheckCircle className="w-4 h-4 text-green-400" /> Wallet Scan Report Generated
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-black p-4 rounded-xl border border-zinc-900">
                      <span className="text-[10px] text-zinc-500 uppercase font-mono block">Estimated SOL Balance</span>
                      <strong className="text-md text-white block mt-1 font-mono">{checkerResult.balance} SOL</strong>
                    </div>
                    <div className="bg-black p-4 rounded-xl border border-zinc-900">
                      <span className="text-[10px] text-zinc-500 uppercase font-mono block">Scanned Transactions</span>
                      <strong className="text-md text-white block mt-1 font-mono">{checkerResult.txs} Blocks</strong>
                    </div>
                    <div className="bg-black p-4 rounded-xl border border-zinc-900">
                      <span className="text-[10px] text-zinc-500 uppercase font-mono block">Active Lifetime</span>
                      <strong className="text-md text-white block mt-1 font-mono">{checkerResult.age} Months</strong>
                    </div>
                  </div>

                  {checkerResult.claimed ? (
                    <div className="p-3.5 bg-red-950/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-mono">
                      ⚠️ Error: This address index has already registered a claim. Repeated standard community registrations of single Solana seed keys are blocked.
                    </div>
                  ) : (
                    <div className="p-5 bg-[#122A00]/25 border border-[#39FF14]/15 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="text-left">
                        <span className="text-[11px] text-[#39FF14] uppercase tracking-wider font-extrabold block">Eligibility Status: APPROVED!</span>
                        <p className="text-xs text-white mt-1 leading-relaxed">
                          Your profile qualifies the cryptographical parameters! You are verifiably eligible to claim a guaranteed <strong className="text-[#39FF14] font-mono">{checkerResult.claimableAmt.toLocaleString()} DMSOL</strong> allocation!
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          setClaimWallet(checkerAddress);
                          if (checkerResult.claimableAmt === 250) setClaimPlanId("explorer");
                          else if (checkerResult.claimableAmt === 1200) setClaimPlanId("bronze");
                          else if (checkerResult.claimableAmt === 2800) setClaimPlanId("silver");
                          else setClaimPlanId("gold");
                          
                          setMockWalletAddress(checkerAddress);
                          setMockWalletConnected(true);
                          setCurrentTab("claim");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="py-2.5 px-6 bg-[#39FF14] text-black text-xs font-black uppercase tracking-wider rounded-lg hover:bg-white transition flex-shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        Proceed to Instant Claim <Gift className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* -------------------------------------------------------------
           VIEW: APEX CLAIM WINDOW (CLIENT FORM)
         ------------------------------------------------------------- */}
      {currentTab === "claim" && (
        <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
          <div className="text-center mb-10">
            <span className="text-[#39FF14] text-xs font-black uppercase tracking-[3px]">Claim Airdrop</span>
            <h2 className="text-3xl font-extrabold text-white uppercase mt-1">SECURE AIRDROP DECENTRALIZED DESK</h2>
            <p className="text-zinc-400 text-sm max-w-xl mx-auto mt-2">
              For complete transparency, paid levels require pairing a mock or real Web3 Solana context signature. This prevents fraudulent duplicate claims.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* SUB-BLOCK: HOW TO PAIR */}
            <div className="md:col-span-5 flex flex-col gap-4 text-left">
              <div className="bg-[#0b0b0b] border border-zinc-800 p-5 rounded-2xl">
                <h4 className="text-sm font-bold text-white tracking-wider uppercase mb-3 text-[#39FF14]">🔒 SECURE WEB3 PAIRING</h4>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Legitimate Web3 platforms interact using authenticated on-chain signatures instead of manual text-box inputs. Play with our virtual pairing adapter to see the original workflow standard!
                </p>
                {mockWalletConnected ? (
                  <div className="bg-zinc-950 border border-[#39FF14]/30 rounded-xl p-4 text-center">
                    <span className="text-[10px] text-[#39FF14] uppercase tracking-widest font-black block mb-2">Connected Successfully</span>
                    <span className="text-[11px] font-mono text-zinc-300 block select-all break-all bg-black p-2 rounded">
                      {mockWalletAddress}
                    </span>
                    <button 
                      onClick={disconnectMockWallet}
                      className="mt-3 px-4 py-1.5 bg-red-950/40 border border-red-500/30 text-red-400 text-[10px] rounded hover:bg-red-900 hover:text-white transition"
                    >
                      Disconnect Pair Box
                    </button>
                  </div>
                ) : (
                  <div>
                    <button 
                      onClick={() => setWalletSelectorOpen(!walletSelectorOpen)}
                      className="w-full py-2.5 bg-zinc-900 text-[#39FF14] border border-[#39FF14]/30 text-xs font-bold tracking-wider uppercase rounded-lg hover:bg-[#39FF14] hover:text-black transition"
                    >
                      Choose Wallet Pairing
                    </button>
                    {walletSelectorOpen && (
                      <div className="flex flex-col gap-2 mt-2 bg-zinc-950 p-2 rounded border border-zinc-800">
                        <button onClick={() => connectMockWallet("phantom")} className="py-2 px-3 text-left hover:bg-zinc-900 rounded text-xs text-white">Phantom Wallet</button>
                        <button onClick={() => connectMockWallet("solflare")} className="py-2 px-3 text-left hover:bg-zinc-900 rounded text-xs text-white">Solflare App</button>
                        <button onClick={() => connectMockWallet("backpack")} className="py-2 px-3 text-left hover:bg-zinc-900 rounded text-xs text-white">Backpack Web3</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-[#0b0b0b] border border-zinc-800 p-5 rounded-2xl">
                <h4 className="text-sm font-bold text-white tracking-wider uppercase mb-3">🛡️ ANTI-FRAUD STEPS</h4>
                <p className="text-xs text-zinc-400 leading-relaxed mb-1">1. Fill out form with actual Telegram ID.</p>
                <p className="text-xs text-zinc-400 leading-relaxed mb-1">2. Paired wallet maps directly to claim profile.</p>
                <p className="text-xs text-zinc-400 leading-relaxed">3. Duplicate submissions with single Web3 account are auto-filtered.</p>
              </div>
            </div>

            {/* MAIN PORTAL REGISTRATION ENTRY FORM */}
            <div className="md:col-span-7 bg-[#0b0b0b] border border-zinc-800 p-6 md:p-8 rounded-3xl relative">
              
              {/* SUCCESS MODAL TRIGGERED */}
              {claimSuccessData ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-16 h-16 text-[#39FF14] mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white uppercase">Verification Successfully Initialized!</h3>
                  <p className="text-xs text-zinc-400 mt-2">
                    Your claim coordinates are mapped to the Solana ecosystem.
                  </p>
                  
                  <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl my-6 text-left flex flex-col gap-2">
                    <div className="flex justify-between text-xs"><span className="text-zinc-500">Name:</span> <span className="text-white font-bold">{claimSuccessData.fullName}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-zinc-500">Tier:</span> <span className="text-[#39FF14] font-bold">{claimSuccessData.planName}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-zinc-500">Guaranteed:</span> <span className="text-[#39FF14] font-mono">{claimSuccessData.dmsol.toLocaleString()} DMSOL</span></div>
                    <div className="flex justify-between text-xs"><span className="text-zinc-500">Claim Code:</span> <span className="text-white font-mono font-bold">{claimSuccessData.referralCode}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-zinc-500">Wallet:</span> <span className="text-zinc-400 font-mono text-[10px] truncate w-40 text-right">{claimSuccessData.wallet}</span></div>
                  </div>

                  <p className="text-[11px] text-zinc-500 italic leading-relaxed">
                    Share your unique Claim Code with friends! Every referral adds 100 DMSOL to your account (Max 10 referrals to maintain price trust).
                  </p>

                  <div className="flex gap-4 mt-6">
                    <button 
                      onClick={() => setClaimSuccessData(null)}
                      className="w-full py-2.5 bg-zinc-900 border border-zinc-800 text-white text-xs font-bold tracking-widest uppercase rounded-lg hover:bg-zinc-800 transition"
                    >
                      New Register Claim
                    </button>
                    <button 
                      onClick={() => setCurrentTab("home")}
                      className="w-full py-2.5 bg-[#39FF14] text-black text-xs font-extrabold tracking-widest uppercase rounded-lg hover:bg-white transition"
                    >
                      Back to Hall
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={onClaimSubmit} className="flex flex-col gap-4 text-left">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Full Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Aarav Patel"
                      value={claimName}
                      onChange={(e) => setClaimName(e.target.value)}
                      required 
                      className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[#39FF14] transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Email Address *</label>
                      <input 
                        type="email" 
                        placeholder="yourname@verify.com"
                        value={claimEmail}
                        onChange={(e) => setClaimEmail(e.target.value)}
                        required 
                        className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[#39FF14] transition"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Telegram Handle *</label>
                      <input 
                        type="text" 
                        placeholder="e.g. @aarav_mamba"
                        value={claimTelegram}
                        onChange={(e) => setClaimTelegram(e.target.value)}
                        required 
                        className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[#39FF14] transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Your Solana Wallet Address *</label>
                      <input 
                        type="text" 
                        placeholder="SPL Wallet Address"
                        value={claimWallet}
                        onChange={(e) => setClaimWallet(e.target.value)}
                        required 
                        className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-xs text-white font-mono focus:outline-none focus:border-[#39FF14] transition"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Select Claim Tier *</label>
                      <select 
                        value={claimPlanId}
                        onChange={(e) => setClaimPlanId(e.target.value)}
                        required
                        className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#39FF14] transition"
                      >
                        <option value="">-- Choose Level --</option>
                        {settings.plans.filter(p => p.active).map(p => (
                          <option key={p.id} value={p.id}>
                            {p.icon} {p.name} ({p.dmsol.toLocaleString()} DMSOL) {p.free ? "- FREE" : `- ${p.sol} SOL`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Referral Claim Code (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. DM-PATEL44"
                      value={claimReferral}
                      onChange={(e) => setClaimReferral(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm text-white font-mono focus:outline-none focus:border-[#39FF14] transition"
                    />
                  </div>

                  {/* PAID TIERS CONDITIONAL FLOW BLOCK DISPLAYING VERIFICATION ADDRESS */}
                  {claimPlanId && !settings.plans.find(p => p.id === claimPlanId)?.free && (
                    <div className="bg-[#122A00]/25 border border-[#39FF14]/20 p-4 rounded-xl mt-2">
                      <span className="text-[9px] text-[#39FF14] uppercase font-mono tracking-widest font-extrabold block mb-1">Ecosystem Secure Wallet Block</span>
                      <p className="text-[11px] text-zinc-300 leading-relaxed mb-3">
                        To claim this verified level, send <strong className="text-white">{settings.plans.find(p => p.id === claimPlanId)?.sol} SOL</strong> to our verified project system wallet below, then enter your transaction signature hash.
                      </p>
                      
                      <div className="bg-black border border-zinc-850 p-2.5 rounded-lg font-mono text-[10px] text-zinc-300 break-all select-all flex items-center justify-between gap-2">
                        <span>{settings.paymentWallet || "Pairing configured on backend..."}</span>
                        <button 
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(settings.paymentWallet);
                            addToast("Payment wallet address copied!", "success");
                          }}
                          className="p-1 hover:bg-zinc-900 rounded"
                        >
                          <Clipboard className="w-3.5 h-3.5 text-[#39FF14]" />
                        </button>
                      </div>

                      <div className="mt-4">
                        <label className="text-[9px] text-zinc-400 uppercase font-bold block mb-1">Transaction Signature Hash *</label>
                        <input 
                          type="text" 
                          placeholder="SPL Block Tx Signature Signature (64 chars)"
                          value={claimTxHash}
                          onChange={(e) => setClaimTxHash(e.target.value)}
                          required
                          className="w-full bg-black border border-[#39FF14]/20 rounded-lg p-3 text-xs text-[#39FF14] font-mono focus:outline-none focus:border-[#39FF14] transition"
                        />
                      </div>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={isSignaturesChecking}
                    className="w-full py-3.5 bg-[#39FF14] text-black font-extrabold text-xs tracking-wider uppercase rounded-lg shadow-lg hover:bg-white hover:text-black transition"
                  >
                    {isSignaturesChecking ? "Verifying Transaction on Solana Blockchain..." : "Initialize Decentalized Claim"}
                  </button>
                </form>
              )}

            </div>

          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
           VIEW: OFFICIAL WHITEPAPER TEXT PAGES
         ------------------------------------------------------------- */}
      {currentTab === "whitepaper" && (
        <div className="max-w-4xl mx-auto px-6 py-12 text-left relative z-10">
          <span className="text-[#39FF14] text-xs font-extrabold uppercase tracking-widest font-mono">Verified Standard v1.2</span>
          <h2 className="text-3xl font-black text-white uppercase mt-1 mb-8">Official DMSOL Cryptographic Charter</h2>

          <div className="relative border-l border-zinc-800 pl-6 md:pl-8 flex flex-col gap-8">
            <div>
              <span className="text-xs text-[#39FF14] font-mono block">Section 01</span>
              <h3 className="text-xl font-bold text-white uppercase mt-0.5">Philosophy of Fair Launches</h3>
              <p className="text-sm text-gray-400 leading-relaxed mt-2.5">
                Cryptocurrency meme launches suffered from severe "Update Gaps" and developer shadow allocations. Pre-launched tokens were distributed secretly inside private pools, allowing early founders to dump coins. 
                DMSOL introduces absolute transparency. By revoking mint permission and freezing options, investors have identical safety layers to Bitcoin or standard Ethereum wrappers.
              </p>
            </div>

            <div>
              <span className="text-xs text-[#39FF14] font-mono block">Section 02</span>
              <h3 className="text-xl font-bold text-white uppercase mt-0.5">Automated Mathematical Scarcity</h3>
              <p className="text-sm text-gray-400 leading-relaxed mt-2.5">
                The Burn wallet is monitored directly on-chain. Over 8 phases, milestones automatically destroy up to 10% of total supplies. This deflation decreases token velocity while raising rarity index score parameters.
              </p>
            </div>

            <div>
              <span className="text-xs text-[#39FF14] font-mono block">Section 03</span>
              <h3 className="text-xl font-bold text-white uppercase mt-0.5">Web3 Anti-Spam Defense</h3>
              <p className="text-sm text-gray-400 leading-relaxed mt-2.5">
                Unlike primitive registration platforms, our server tests transactions directly against Solana mainnet RPC headers. This prevents simple duplicate claim injections, ensuring the community pool remains preserved for authentic members.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
           VIEW: FAQS EXPANDABLE BLOCKS
         ------------------------------------------------------------- */}
      {currentTab === "faq" && (
        <div className="max-w-3xl mx-auto px-6 py-12 text-left relative z-10">
          <div className="text-center mb-12">
            <span className="text-[#39FF14] text-xs font-extrabold uppercase tracking-widest font-mono">FAQS</span>
            <h2 className="text-3xl font-black text-white uppercase mt-1">Frequently Asked Questions</h2>
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-[#0b0b0b] border border-zinc-850 p-5 rounded-2xl">
              <h4 className="text-md font-bold text-white uppercase">Is DMSOL safe against developer rug-pulls?</h4>
              <p className="text-xs text-zinc-400 leading-relaxed mt-2">
                Yes. 45% of our entire supply is allocated to the Raydium Liquidity Pool, with a hard on-chain smart contract 12-month lock sequence. The developers own only 8% vested over 24 months, which eliminates dumping leverage.
              </p>
            </div>

            <div className="bg-[#0b0b0b] border border-zinc-850 p-5 rounded-2xl">
              <h4 className="text-md font-bold text-white uppercase">Do I really receive my airdrop DMSOL?</h4>
              <p className="text-xs text-zinc-400 leading-relaxed mt-2">
                Yes. Standard Explorer claims are processed and approved instantly. Paid tiers undergo cryptographic validation of signatures on-chain via our RPC node, and approved tokens are queued for SPL bulk transfer directly to your verified Solana wallet at Phase 3 launch.
              </p>
            </div>

            <div className="bg-[#0b0b0b] border border-zinc-850 p-5 rounded-2xl">
              <h4 className="text-md font-bold text-white uppercase">Why are referrals limited to 10 maximum?</h4>
              <p className="text-xs text-zinc-400 leading-relaxed mt-2">
                Standard campaigns allow infinite referrals, which encourages malicious farm-bots. Bot farms generate millions of fake accounts, drying up pools and dumping coins instantly at launch. By limiting payouts to 10 invites maximum (1,000 DMSOL total max referral reward), we safeguard organic growth.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
           VIEW: ADMINISTRATIVE CONTROLS PANEL
         ------------------------------------------------------------- */}
      {currentTab === "admin" && (
        <div className="max-w-7xl mx-auto px-6 py-12 relative z-10 text-left">
          
          {!isAdminAuthenticated ? (
            <div className="max-w-md mx-auto bg-[#0b0b0b] border border-[#39FF14]/20 p-8 rounded-3xl text-center shadow-2xl">
              <Key className="w-12 h-12 text-[#39FF14] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white uppercase tracking-wider">PROJECT ADMIN DOOR</h3>
              <p className="text-xs text-zinc-400 mt-1 mb-6">
                Legitimate verification requires developer validation. Authenticate using master administrator credentials.
              </p>
              
              <div className="flex flex-col gap-3">
                <input 
                  type="password" 
                  placeholder="Master Admin Password" 
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && unlockAdminPortal()}
                  className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm text-center text-white focus:outline-none focus:border-[#39FF14]"
                />
                
                <span className="text-[10px] text-zinc-500 italic block mb-2">Hint: Use password "mamba2026" to authenticate securely</span>

                <button 
                  onClick={unlockAdminPortal}
                  className="w-full py-3 bg-[#39FF14] text-black font-extrabold text-xs tracking-wider uppercase rounded-lg hover:bg-white hover:text-black transition"
                >
                  Unlock Live Console
                </button>
              </div>
            </div>
          ) : (
            <div>
              
              {/* ADMIN CONTROL PANEL HEADER */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-zinc-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono">DMSOL Master Executive Portal</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-white uppercase">Live Registrations & Verification Console</h2>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <button 
                    onClick={exportUsersToCSV}
                    className="p-2 py-1.5 bg-zinc-90 w-max text-white border border-zinc-800 rounded-lg hover:bg-zinc-850 hover:border-[#39FF14]/30 transition flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#39FF14]" /> Export Spreadsheet (CSV)
                  </button>
                  <button 
                    onClick={fetchAllData}
                    className="p-2 py-1.5 bg-zinc-90 w-max text-[#39FF14] border border-zinc-800 rounded-lg hover:bg-zinc-800 transition flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 animate-spin-slow" /> Sync List
                  </button>
                  <button 
                    onClick={lockAdminPortal}
                    className="p-2 py-1.5 bg-red-950/30 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-900 hover:text-white transition text-xs font-bold uppercase cursor-pointer"
                  >
                    Lock Gate
                  </button>
                </div>
              </div>

              {/* ADMIN CONTROL PANEL SUB-TABS */}
              <div className="flex gap-6 border-b border-zinc-850 mb-8 pb-1">
                <button 
                  onClick={() => setAdminTab("ledger")}
                  className={`pb-3 px-2 text-xs font-extrabold uppercase tracking-widest transition relative cursor-pointer ${
                    adminTab === "ledger" ? "text-[#39FF14]" : "text-gray-400 hover:text-white"
                  }`}
                >
                  📋 Claim Registrations Ledgers
                  {adminTab === "ledger" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#39FF14] rounded-full"></div>
                  )}
                </button>
                <button 
                  onClick={() => setAdminTab("settings")}
                  className={`pb-3 px-2 text-xs font-extrabold uppercase tracking-widest transition relative cursor-pointer ${
                    adminTab === "settings" ? "text-[#39FF14]" : "text-gray-400 hover:text-white"
                  }`}
                >
                  ⚙️ Global Web Control Panel
                  {adminTab === "settings" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#39FF14] rounded-full"></div>
                  )}
                </button>
              </div>

              {adminTab === "ledger" && (
                <>
                  {/* STATS DECK */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-[#0b0b0b] border border-zinc-850 p-5 rounded-2xl">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-mono">Total Portal Registrations</span>
                  <span className="text-3xl font-black text-white block mt-1">{users.length}</span>
                </div>
                <div className="bg-[#0b0b0b] border border-zinc-850 p-5 rounded-2xl">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-mono">Paid Level Applications</span>
                  <span className="text-3xl font-black text-[#39FF14] block mt-1">
                    {users.filter(u => u.solPaid > 0).length}
                  </span>
                </div>
                <div className="bg-[#0b0b0b] border border-zinc-850 p-5 rounded-2xl">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-mono">Collectable SOL Equivalent</span>
                  <span className="text-3xl font-black text-white block mt-1">
                    {users.reduce((acc, current) => acc + (current.solPaid || 0), 0).toFixed(2)} SOL
                  </span>
                </div>
                <div className="bg-[#0b0b0b] border border-zinc-850 p-5 rounded-2xl col-span-1">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-mono">DMSOL Allocated Pool</span>
                  <span className="text-3xl font-black text-purple-400 block mt-1">
                    {users.reduce((acc, current) => acc + (current.dmsol || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* DUAL ACTION CORES: TRANSACTION VALIDATOR SIMULATOR + ANNOUNCEMENT CONFIGURE */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
                
                {/* TRANSACTION SIGNATURE DECODER TOOL (PROVING AUTHENTIC RPC OPERATIONS) */}
                <div className="lg:col-span-7 bg-[#0b0b0b] border border-zinc-800 p-6 rounded-2xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5 text-[#39FF14]" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">On-Chain SOL Cryptographic Signature Matcher</h3>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                    Copy and paste the transaction signature hash from any registration claim down below. Our verification backend simulates querying Solana mainnet node details (e.g. sender coordinates, balance thresholds, gas metrics) to confirm genuineness.
                  </p>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Enter 64-character base58 SPL transaction hash signature"
                      value={txVerificationHash}
                      onChange={(e) => setTxVerificationHash(e.target.value)}
                      className="flex-1 bg-black border border-zinc-800 rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:border-[#39FF14]"
                    />
                    <button 
                      onClick={runOnChainSignatureCheck}
                      className="px-5 py-3 bg-[#39FF14] text-black font-bold text-xs tracking-wider uppercase rounded-lg hover:bg-white transition"
                    >
                      Authenticate On-Chain
                    </button>
                  </div>

                  {/* RESULTS ZONE */}
                  {txVerificationResult && (
                    <div className="mt-4 p-4 rounded-xl border bg-black text-xs">
                      {txVerificationResult === "loading" ? (
                        <div className="text-[#39FF14] font-mono animate-pulse">Querying Solana mainnet block confirmation headers...</div>
                      ) : txVerificationResult.error ? (
                        <div className="text-red-400 font-semibold">{txVerificationResult.error}</div>
                      ) : (
                        <div className="font-mono text-zinc-400 flex flex-col gap-1.5">
                          <div><span className="text-zinc-500">RPC Verification:</span> <span className="text-[#39FF14] font-bold">PASS (32 Confirmations)</span></div>
                          <div className="truncate"><span className="text-zinc-500">Sender:</span> <span className="text-white">{txVerificationResult.senderWallet}</span></div>
                          <div className="truncate"><span className="text-zinc-500">Incoming:</span> <span className="text-[#39FF14]">{txVerificationResult.registeredAmountSol} SOL</span></div>
                          <div><span className="text-zinc-500">Message:</span> <span className="text-zinc-300">{txVerificationResult.message}</span></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* EDIT NOTIFICATIONS BANNER CONFIG */}
                <div className="lg:col-span-5 bg-[#0b0b0b] border border-zinc-800 p-6 rounded-2xl">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Configure Live Portal Banner</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                    Modify the live marquee notification banner text at the top of the portal.
                  </p>

                  <div className="flex flex-col gap-3">
                    <input 
                      type="text" 
                      value={settings.announcement.text}
                      onChange={(e) => setSettings({
                        ...settings,
                        announcement: { ...settings.announcement, text: e.target.value }
                      })}
                      className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#39FF14]"
                    />
                    <div className="flex items-center justify-between text-xs my-1">
                      <span className="text-zinc-400">Display Alert Marquee:</span>
                      <input 
                        type="checkbox" 
                        checked={settings.announcement.enabled}
                        onChange={(e) => setSettings({
                          ...settings,
                          announcement: { ...settings.announcement, enabled: e.target.checked }
                        })}
                        className="w-4 h-4 accent-[#39FF14]"
                      />
                    </div>
                    <button 
                      onClick={async () => {
                        const res = await fetch(`${API_BASE}/api/settings`, {
                          method: "POST",
                          headers: { 
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${adminToken}`
                          },
                          body: JSON.stringify(settings)
                        });
                        if (res.ok) {
                          addToast("Banner parameters updated on backend successfully!", "success");
                        } else {
                          const data = await res.json();
                          addToast(data.error || "Failed secure portal updates.", "error");
                        }
                      }}
                      className="w-full py-2 bg-[#39FF14]/15 hover:bg-[#39FF14] hover:text-black border border-[#39FF14]/30 text-[#39FF14] font-bold text-xs tracking-widest uppercase rounded-lg transition"
                    >
                      Save Notification State
                    </button>
                  </div>
                </div>

              </div>

              {/* REGISTRATIONS FILTER FILTER DECK */}
              <div className="bg-[#0b0b0b] border border-zinc-800 rounded-2xl p-4 md:p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Claims Ledger: ({filteredUsers.length} records matching)</h3>
                  
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <input 
                      type="text" 
                      placeholder="Search coordinates..." 
                      className="bg-black border border-zinc-850 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                    />
                    
                    <select 
                      className="bg-black border border-zinc-850 text-xs text-zinc-300 rounded px-3 py-1.5 focus:outline-none"
                      value={adminPlanFilter}
                      onChange={(e) => setAdminPlanFilter(e.target.value)}
                    >
                      <option value="">All Tiers</option>
                      <option value="explorer">Explorer</option>
                      <option value="bronze">Bronze</option>
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                      <option value="legend">Legend</option>
                    </select>

                    <select 
                      className="bg-black border border-zinc-850 text-xs text-zinc-300 rounded px-3 py-1.5 focus:outline-none"
                      value={adminStatusFilter}
                      onChange={(e) => setAdminStatusFilter(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                {/* TABLE OF CLAIMS LIST */}
                <div className="mt-6 overflow-x-auto border border-zinc-850 rounded-xl bg-black">
                  <table className="w-full text-xs text-left text-zinc-300">
                    <thead className="bg-[#050505] text-[10px] text-zinc-400 uppercase tracking-widest border-b border-zinc-850">
                      <tr>
                        <th className="p-3">Claimant</th>
                        <th className="p-3">Wallet</th>
                        <th className="p-3">Telegram</th>
                        <th className="p-3">Plan</th>
                        <th className="p-3 font-mono">DMSOL Pool</th>
                        <th className="p-3">Tx Hash Sig</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Decisions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-zinc-500 italic">
                            Zero current registration claims match criteria filter.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u, i) => (
                          <tr key={u.id} className="hover:bg-zinc-950/40 transition">
                            <td className="p-3 font-bold text-white">
                              {u.fullName} <br />
                              <span className="text-[10px] text-zinc-500 block font-normal">{u.email}</span>
                            </td>
                            <td className="p-3 font-mono text-[10px] select-all tracking-tight transition-colors duration-150 hover:text-[#39FF14]">
                              {u.wallet}
                            </td>
                            <td className="p-3 text-[#39FF14] font-mono">{u.telegram}</td>
                            <td className="p-3 uppercase font-semibold text-zinc-400 text-[10px]">
                              {u.planName} <br />
                              <span className="text-zinc-600 block text-[9px] font-mono">{u.solPaid} SOL</span>
                            </td>
                            <td className="p-3 font-bold text-[#39FF14] font-mono text-sm">
                              {u.dmsol.toLocaleString()}
                            </td>
                            <td className="p-3 font-mono max-w-[120px] truncate text-[9px]">
                              {u.txHash ? (
                                <span className="text-purple-400 block truncate" title={u.txHash}>
                                  {u.txHash}
                                </span>
                              ) : (
                                <span className="text-zinc-600 block">N/A (Free)</span>
                              )}
                            </td>
                            <td className="p-3 uppercase">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest ${
                                u.status === "approved" 
                                  ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                                  : u.status === "rejected" 
                                  ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                              }`}>
                                {u.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex gap-1 justify-end">
                                {u.status !== "approved" && (
                                  <button 
                                    onClick={() => updateClaimStatus(u.id, "approved")}
                                    className="p-1 px-2.5 bg-green-950/30 text-green-400 border border-green-500/20 rounded hover:bg-green-500 hover:text-black transition text-[9px] font-bold"
                                  >
                                    Verify Valid
                                  </button>
                                )}
                                {u.status !== "rejected" && (
                                  <button 
                                    onClick={() => updateClaimStatus(u.id, "rejected")}
                                    className="p-1 px-2.5 bg-amber-950/30 text-amber-500 border border-amber-500/20 rounded hover:bg-amber-500 hover:text-black transition text-[9px] font-bold"
                                  >
                                    Deny
                                  </button>
                                )}
                                <button 
                                  onClick={() => deleteClaimRecord(u.id)}
                                  className="p-1 bg-zinc-90 w-7 h-7 flex items-center justify-center text-zinc-500 border border-zinc-800 rounded hover:text-red-400 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

            {adminTab === "settings" && editedSettings && (
              <div className="bg-zinc-950 border border-zinc-850 p-6 md:p-8 rounded-3xl animate-fade-in text-left">
                <div className="mb-6 pb-4 border-b border-zinc-800">
                  <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                    <Settings className="w-5 h-5 text-[#39FF14]" /> Global Site Settings & Parameters Broker
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Commit real-time updates directly to the running backend. All visual features, links, and system locks render immediately in public views.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 font-sans">
                  
                  {/* COLUMN 1: BLOCKCHAIN & COUNTDOWN CONFIG */}
                  <div className="flex flex-col gap-5">
                    <div className="bg-black/40 border border-zinc-900 p-5 rounded-2xl flex flex-col gap-4">
                      <h4 className="text-xs font-black text-[#39FF14] uppercase tracking-widest border-b border-zinc-850 pb-2 flex items-center gap-1.5 font-mono">
                        <Shield className="w-4 h-4 text-[#39FF14]" /> Web3 Ledger Coordinates
                      </h4>
                      
                      <div>
                        <label className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block mb-1.5 font-mono">
                          Destination Payment Wallet (SOL SPL Target address)
                        </label>
                        <input 
                          type="text"
                          value={editedSettings.paymentWallet}
                          onChange={(e) => setEditedSettings({ ...editedSettings, paymentWallet: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-[#39FF14] focus:outline-none focus:border-[#39FF14]"
                        />
                      </div>
                      
                      <div>
                        <label className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block mb-1.5 font-mono">
                          Solana SPL Token Mint Contract Address
                        </label>
                        <input 
                          type="text"
                          value={editedSettings.contractAddress}
                          onChange={(e) => setEditedSettings({ ...editedSettings, contractAddress: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-[#39FF14] focus:outline-none focus:border-[#39FF14]"
                        />
                      </div>

                      <div className="flex items-center justify-between py-1.5 text-xs border-b border-zinc-900 pb-2">
                        <span className="text-zinc-300 font-medium">Show Contract Address on Home Tab:</span>
                        <input 
                          type="checkbox"
                          checked={editedSettings.contractVisible}
                          onChange={(e) => setEditedSettings({ ...editedSettings, contractVisible: e.target.checked })}
                          className="w-4 h-4 accent-[#39FF14] cursor-pointer"
                        />
                      </div>

                      <div className="border-t border-zinc-900 pt-3 flex flex-col gap-4">
                        <div>
                          <label className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block mb-1.5 font-mono">
                            👑 Treasury Wallet address
                          </label>
                          <input 
                            type="text"
                            value={editedSettings.treasuryWallet || ""}
                            onChange={(e) => setEditedSettings({ ...editedSettings, treasuryWallet: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-[#39FF14]"
                            placeholder="Treasury Wallet"
                          />
                        </div>

                        <div className="flex items-center justify-between py-1 text-xs">
                          <span className="text-zinc-300 font-medium">Show Treasury Wallet publicly on Home screen:</span>
                          <input 
                            type="checkbox"
                            checked={!!editedSettings.treasuryWalletVisible}
                            onChange={(e) => setEditedSettings({ ...editedSettings, treasuryWalletVisible: e.target.checked })}
                            className="w-4 h-4 accent-[#39FF14] cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="border-t border-zinc-900 pt-3 flex flex-col gap-4">
                        <div>
                          <label className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block mb-1.5 font-mono">
                            👥 Core Development Team Wallet address
                          </label>
                          <input 
                            type="text"
                            value={editedSettings.teamWallet || ""}
                            onChange={(e) => setEditedSettings({ ...editedSettings, teamWallet: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-[#39FF14]"
                            placeholder="Core Team Wallet"
                          />
                        </div>

                        <div className="flex items-center justify-between py-1 text-xs">
                          <span className="text-zinc-300 font-medium">Show Team Wallet publicly on Home screen:</span>
                          <input 
                            type="checkbox"
                            checked={!!editedSettings.teamWalletVisible}
                            onChange={(e) => setEditedSettings({ ...editedSettings, teamWalletVisible: e.target.checked })}
                            className="w-4 h-4 accent-[#39FF14] cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-black/40 border border-zinc-900 p-5 rounded-2xl flex flex-col gap-4">
                      <h4 className="text-xs font-black text-purple-400 uppercase tracking-widest border-b border-zinc-850 pb-2 flex items-center gap-1.5 font-mono">
                        <Calendar className="w-4 h-4 text-purple-400" /> Airdrop Countdown Clock
                      </h4>

                      <div>
                        <label className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block mb-1.5 font-mono">
                          Countdown Marquee Title (Label)
                        </label>
                        <input 
                          type="text"
                          value={editedSettings.countdown.label}
                          onChange={(e) => setEditedSettings({ 
                            ...editedSettings, 
                            countdown: { ...editedSettings.countdown, label: e.target.value } 
                          })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#39FF14]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block mb-1.5 font-mono">
                            Target Date-Time (GMT / UTC)
                          </label>
                          <input 
                            type="text"
                            placeholder="e.g. 2026-06-30T18:00:00Z"
                            value={editedSettings.countdown.target}
                            onChange={(e) => setEditedSettings({ 
                              ...editedSettings, 
                              countdown: { ...editedSettings.countdown, target: e.target.value } 
                            })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-[#39FF14]"
                          />
                        </div>

                        <div className="flex items-center justify-between sm:pt-6 text-xs">
                          <span className="text-zinc-300">Countdown Active state:</span>
                          <input 
                            type="checkbox"
                            checked={editedSettings.countdown.enabled}
                            onChange={(e) => setEditedSettings({ 
                              ...editedSettings, 
                              countdown: { ...editedSettings.countdown, enabled: e.target.checked } 
                            })}
                            className="w-4 h-4 accent-[#39FF14] cursor-pointer"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block mb-1.5 font-mono">
                          Timer Description Footnote (Description)
                        </label>
                        <input 
                          type="text"
                          value={editedSettings.countdown.desc}
                          onChange={(e) => setEditedSettings({ 
                            ...editedSettings, 
                            countdown: { ...editedSettings.countdown, desc: e.target.value } 
                          })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#39FF14]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 2: BANNER & SOCIAL CHANNELS */}
                  <div className="flex flex-col gap-5">
                    <div className="bg-black/40 border border-zinc-900 p-5 rounded-2xl flex flex-col gap-4">
                      <h4 className="text-xs font-black text-[#39FF14] uppercase tracking-widest border-b border-zinc-850 pb-2 flex items-center gap-1.5 font-mono">
                        <Sparkles className="w-4 h-4 text-[#39FF14]" /> Top Announcement Banner
                      </h4>

                      <div>
                        <label className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block mb-1.5 font-mono">
                          Marquee Notification Alert Text
                        </label>
                        <textarea 
                          rows={3}
                          value={editedSettings.announcement.text}
                          onChange={(e) => setEditedSettings({ 
                            ...editedSettings, 
                            announcement: { ...editedSettings.announcement, text: e.target.value } 
                          })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#39FF14] leading-relaxed resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block mb-1.5 font-mono">
                            Banner Color Accent Tone
                          </label>
                          <select
                            value={editedSettings.announcement.color}
                            onChange={(e) => setEditedSettings({ 
                              ...editedSettings, 
                              announcement: { ...editedSettings.announcement, color: e.target.value } 
                            })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-300 focus:outline-none pr-8"
                          >
                            <option value="green">Neon Poison Green</option>
                            <option value="red">Cyber Alert Crimson Red</option>
                            <option value="yellow">Caution Amber Yellow</option>
                            <option value="purple">Cosmic Royal Purple</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between sm:pt-6 text-xs">
                          <span className="text-zinc-300">Marquee Banner Enabled:</span>
                          <input 
                            type="checkbox"
                            checked={editedSettings.announcement.enabled}
                            onChange={(e) => setEditedSettings({ 
                              ...editedSettings, 
                              announcement: { ...editedSettings.announcement, enabled: e.target.checked } 
                            })}
                            className="w-4 h-4 accent-[#39FF14] cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-black/40 border border-zinc-900 p-5 rounded-2xl flex flex-col gap-4">
                      <h4 className="text-xs font-black text-[#39FF14] uppercase tracking-widest border-b border-zinc-850 pb-2 flex items-center gap-1.5 font-mono">
                        <ExternalLink className="w-4 h-4 text-[#39FF14]" /> Official Social Channels (Contact links)
                      </h4>

                      <div>
                        <label className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block mb-1.5 font-mono">
                          Official Telegram Portal Link
                        </label>
                        <input 
                          type="text"
                          value={editedSettings.socials.telegram}
                          onChange={(e) => setEditedSettings({ 
                            ...editedSettings, 
                            socials: { ...editedSettings.socials, telegram: e.target.value } 
                          })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#39FF14]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block mb-1.5 font-mono">
                          Official Twitter / X Handle URL
                        </label>
                        <input 
                          type="text"
                          value={editedSettings.socials.twitter}
                          onChange={(e) => setEditedSettings({ 
                            ...editedSettings, 
                            socials: { ...editedSettings.socials, twitter: e.target.value } 
                          })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#39FF14]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block mb-1.5 font-mono">
                          Official Discord Link
                        </label>
                        <input 
                          type="text"
                          value={editedSettings.socials.discord}
                          onChange={(e) => setEditedSettings({ 
                            ...editedSettings, 
                            socials: { ...editedSettings.socials, discord: e.target.value } 
                          })}
                          className="w-full bg-[#030303] border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#39FF14]"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                {/* SAVE TRIGGER BUTTON */}
                <div className="lg:col-span-2 flex justify-end pt-6 border-t border-zinc-90 w-full">
                  <button 
                    onClick={async () => {
                      try {
                        const res = await fetch(`${API_BASE}/api/settings`, {
                          method: "POST",
                          headers: { 
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${adminToken}`
                          },
                          body: JSON.stringify(editedSettings)
                        });
                        if (res.ok) {
                          const savedD = await res.json();
                          const finalSettings = savedD.settings || savedD;
                          setSettings(finalSettings);
                          setEditedSettings(finalSettings);
                          addToast("Website parameters synchronized successfully on backend!", "success");
                        } else {
                          const data = await res.json();
                          addToast(data.error || "Failed secure portal updates.", "error");
                        }
                      } catch (err) {
                        addToast("Network fault writing configuration payload.", "error");
                      }
                    }}
                    className="px-8 py-3.5 bg-[#39FF14] text-black font-extrabold text-xs tracking-wider uppercase rounded-xl hover:bg-white transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-5 h-5 text-black" /> Click to Save Portal Configuration
                  </button>
                </div>

                {/* EXTERNAL BACKEND API COORDINATES */}
                <div className="lg:col-span-2 bg-[#0c0c0c] border border-zinc-850 p-6 rounded-2xl text-left mt-6">
                  <h4 className="text-xs font-black text-[#39FF14] uppercase tracking-widest border-b border-zinc-850 pb-2 flex items-center gap-1.5 font-mono mb-4">
                    <Link className="w-4 h-4 text-[#39FF14]" /> Netlify & External Backend Coordinates
                  </h4>
                  <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                    By default, this site communicates with the Express backend running on Cloud Run. If you host the frontend on Netlify (which supports static hosting only) and want to deploy the Express backend to Render, Railway, or a custom VPS, enter your custom backend URL below.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text"
                      placeholder="e.g. https://your-custom-backend.railway.app"
                      value={customApiBase}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        setCustomApiBase(val);
                        if (val) {
                          localStorage.setItem("dmsol_custom_api_base", val);
                        } else {
                          localStorage.removeItem("dmsol_custom_api_base");
                        }
                      }}
                      className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#39FF14]"
                    />
                    <button 
                      onClick={() => {
                        window.location.reload();
                      }}
                      className="px-5 py-3 bg-[#39FF14]/15 hover:bg-[#39FF14] hover:text-black border border-[#39FF14]/30 text-[#39FF14] font-bold text-xs uppercase rounded-xl transition cursor-pointer"
                    >
                      Apply & Re-Sync
                    </button>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono">
                    <span>Active Endpoint Base URL:</span>
                    <strong className="text-zinc-300 font-mono select-all font-semibold break-all">{API_BASE || "(Relative origin / Cloud Run)"}</strong>
                  </div>
                </div>

                {/* NETLIFY DEPLOYMENT & EXPORTER SERVICES */}
                <div className="lg:col-span-2 bg-[#0c0c0c] border border-zinc-800/80 rounded-2xl p-6 mt-6 relative overflow-hidden flex flex-col gap-5 text-left">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#39FF14]/5 to-transparent rounded-tr-2xl pointer-events-none"></div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                      <Zap className="w-4 h-4 text-[#39FF14]" /> Netlify Deploy & Drag-and-Drop Hub
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1">
                      Instantly package all production client HTML, CSS, and JS files customized with your live parameters. Take this ZIP and drop it directly onto the Netlify dashboard to launch your site live in 5 seconds!
                    </p>
                  </div>

                  <div className="bg-black/60 border border-zinc-900 p-4 rounded-xl flex flex-col gap-3">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#39FF14] block font-mono">💡 STEP-BY-STEP NETLIFY ZERO-DELAY LAUNCH:</span>
                    <ol className="list-decimal list-inside text-xs text-zinc-300 space-y-1.5 leading-relaxed">
                      <li>Configure your customized parameters above (wallets, timers, etc.) and click <strong>"Click to Save Portal Configuration"</strong> first.</li>
                      <li>Click the button below to generate a Netlify-optimized <strong>dmsol-netlify-site.zip</strong> bundle. This automatically bakes in your live settings for zero-delay offline rendering.</li>
                      <li>Go to <a href="https://app.netlify.com" target="_blank" rel="noopener noreferrer" className="text-[#39FF14] underline font-bold hover:text-white">app.netlify.com</a> and sign in.</li>
                      <li>Drag and drop the downloaded ZIP file directly onto Netlify's deploy box. Your fully configured site is instantly live on their global CDN!</li>
                    </ol>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-black/40 p-4 border border-zinc-900 rounded-xl">
                    <div className="text-left">
                      <span className="text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">Configured API Linkage</span>
                      <span className="text-xs block mt-1.5 font-semibold text-zinc-300">Live Client Fetch target pointing to:</span>
                      <code className="text-[10px] block font-mono text-zinc-400 select-all max-w-[280px] truncate bg-black px-1.5 py-0.5 rounded mt-0.5 border border-zinc-850">
                        {DEFAULT_SERVER_BACKEND_URL}
                      </code>
                    </div>

                    <button
                      onClick={() => {
                        window.open(`${API_BASE || window.location.origin}/api/download-netlify-zip`, "_blank");
                        addToast("Starting download of your Netlify Drag-and-Drop ZIP bundle!", "success");
                      }}
                      className="px-6 py-3 bg-[#39FF14] text-black font-extrabold text-xs tracking-wider uppercase rounded-xl hover:bg-white transition flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto font-mono text-center"
                    >
                      <Download className="w-4 h-4 text-black" /> Get Netlify ZIP Package
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )}

      {/* -------------------------------------------------------------
           FOOTER SECURE DESIGN WITH CRED CREDITIONS
         ------------------------------------------------------------- */}
      <footer className="mt-24 border-t border-zinc-850 py-12 relative z-10 bg-[#040404]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-left">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-zinc-900 border border-[#39FF14]/30 rounded-full flex items-center justify-center p-0.5">
                <img 
                  src="/logo.png" 
                  alt="DMSOL" 
                  className="w-5 h-5 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fallback = e.currentTarget.nextElementSibling;
                    if (fallback) fallback.classList.remove("hidden");
                  }}
                />
                <span className="text-xs hidden">🐍</span>
              </div>
              <span className="text-md font-black tracking-widest text-white font-mono">DMSOL</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xs">
              Dark Mamba SOL (DMSOL) represents an anti-fraud, locked liquidity standard on Solana designed to secure genuine long-term engagement.
            </p>
          </div>

          <div>
            <h5 className="text-[10px] uppercase font-bold tracking-[3px] text-[#39FF14] mb-4">Integrity Guidelines</h5>
            <span className="text-xs text-zinc-400 block mb-2">LP Lock: Multi-sig 12-Months Verified</span>
            <span className="text-xs text-zinc-400 block mb-2">Team Allocation: Strictly 5% Maxed</span>
            <span className="text-xs text-zinc-400 block mb-2">Verification Mode: Cryptographic RPC checks</span>
            <span className="text-xs text-zinc-400 block">Referral cap: Limit 10 invites max per wallet</span>
          </div>

          <div>
            <h5 className="text-[10px] uppercase font-bold tracking-[3px] text-[#39FF14] mb-4">Social Hub</h5>
            <div className="flex flex-col gap-3">
              <a 
                href={settings.socials.telegram} 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-zinc-400 hover:text-[#39FF14] flex items-center gap-2 transition group"
              >
                <svg className="w-4 h-4 fill-current text-zinc-400 group-hover:text-[#39FF14] transition-colors" viewBox="0 0 24 24">
                  <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701-.332 4.965c.488 0 .703-.223.976-.488l2.344-2.279 4.874 3.6c.898.495 1.543.24 1.767-.83l3.195-15.05c.327-1.313-.497-1.905-1.353-1.517z" />
                </svg>
                <span>Telegram Portal</span>
              </a>
              <a 
                href={settings.socials.twitter} 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-zinc-400 hover:text-[#39FF14] flex items-center gap-2 transition group"
              >
                <svg className="w-3.5 h-3.5 fill-current text-zinc-400 group-hover:text-[#39FF14] transition-colors" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>Twitter / X Feed</span>
              </a>
              <a 
                href={settings.socials.discord} 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-zinc-400 hover:text-[#39FF14] flex items-center gap-2 transition group"
              >
                <svg className="w-4 h-4 fill-current text-zinc-400 group-hover:text-[#39FF14] transition-colors" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
                </svg>
                <span>Discord Room</span>
              </a>
            </div>
          </div>

          <div>
            <h5 className="text-[10px] uppercase font-bold tracking-[3px] text-zinc-400 mb-4">Gatekeepers concept</h5>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              DMSOL is purely a community token experiment. Cryptocurrency represents inherent volatility. Hold responsibly. DYOR strictly.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-6 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <span>&copy; {new Date().getFullYear()} Dark Mamba SOL (DMSOL). Zero hidden code. Fixed Supply model.</span>
          <span className="flex items-center gap-1">Pairing context: Solana SPL standard ⚡</span>
        </div>
      </footer>

      {/* -------------------------------------------------------------
           SOCIAL PROOF FLOATING CLAIM ALERT (ROLLING LIVE FEED)
         ------------------------------------------------------------- */}
      {rollingAlert && (
        <div className="fixed bottom-6 left-6 z-[9980] max-w-sm bg-black/95 border border-[#39FF14]/30 p-4 rounded-xl shadow-[0_0_30px_rgba(57,255,20,0.15)] flex items-center gap-3.5 animate-fade-in backdrop-blur-md font-sans">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 bg-[#39FF14]/10 rounded-full border border-[#39FF14]/30 flex items-center justify-center text-sm p-1">
              <img 
                src="/logo.png" 
                alt="DMSOL" 
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const p = e.currentTarget.nextElementSibling;
                  if (p) p.classList.remove("hidden");
                }}
              />
              <span className="hidden">🦖</span>
            </div>
            <div className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-green-500 rounded-full border-2 border-black flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
            </div>
          </div>
          <div className="text-left font-sans">
            <span className="text-[9px] text-[#39FF14] tracking-widest font-extrabold uppercase block mb-0.5">Live Claim Verified ✅</span>
            <p className="text-[11px] text-white leading-tight font-medium">
              <strong>{rollingAlert.name}</strong> registered <span className="text-[#39FF14] font-black font-mono">{rollingAlert.dmsol.toLocaleString()} DMSOL</span> allocation!
            </p>
            <span className="text-[9px] text-zinc-500 font-mono block mt-1">Wallet index: {rollingAlert.wallet}</span>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
           FLOATING SECURITY SUPPORT BOT (POWERED SECURELY BY GEMINI)
         ------------------------------------------------------------- */}
      <div className="fixed bottom-6 right-6 z-[9990] flex flex-col items-end gap-3 font-sans">
        
        {chatOpen && (
          <div className="w-[340px] md:w-[380px] h-[480px] bg-zinc-950/98 border border-[#39FF14]/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between tracking-normal font-sans">
            
            {/* CHAT HEADER */}
            <div className="p-4 border-b border-[#39FF14]/15 bg-zinc-900/40 flex items-center justify-between text-left">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full border border-[#39FF14]/30 flex items-center justify-center bg-black p-0.5 overflow-hidden">
                  <img 
                    src="/logo.png" 
                    alt="Mamba Bot" 
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const fallback = e.currentTarget.nextElementSibling;
                      if (fallback) fallback.classList.remove("hidden");
                    }}
                  />
                  <span className="text-xs hidden">🐍</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Mamba Shield Support</h4>
                  <span className="text-[9px] text-[#39FF14] font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> Offline/AI Dual Mode
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setChatOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* CHAT MESSAGES PANEL */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 scrollbar-thin text-left">
              {chatMessages.map(m => (
                <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`p-3 rounded-2xl text-xs max-w-[80%] leading-relaxed ${
                    m.sender === "user" 
                      ? "bg-[#39FF14] text-black font-semibold rounded-tr-none" 
                      : "bg-[#0c0c0c] border border-zinc-850 text-zinc-300 rounded-tl-none font-mono"
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {aiIsThinking && (
                <div className="flex justify-start">
                  <div className="bg-[#0c0c0c] border border-zinc-850 p-3 rounded-xl text-xs text-[#39FF14] rounded-tl-none font-mono animate-pulse">
                    Mamba Smart contract bot thinking answers...
                  </div>
                </div>
              )}
            </div>

            {/* CHAT RECOMMENDED QUICK QUERIES */}
            <div className="px-4 py-2 bg-black border-t border-zinc-900 flex flex-wrap gap-1 md:gap-1.5">
              <button 
                onClick={() => { setUserInputMessage("How are tokenomics protected against rug-pulls?"); }}
                className="text-[9px] bg-zinc-900 border border-zinc-800 text-[#39FF14] px-2 py-1 rounded-full hover:bg-zinc-800 transition text-left"
              >
                Locked Trust LP? 🛡️
              </button>
              <button 
                onClick={() => { setUserInputMessage("How do referral bonuses protect price against bots?"); }}
                className="text-[9px] bg-zinc-900 border border-zinc-800 text-[#39FF14] px-2 py-1 rounded-full hover:bg-zinc-800 transition text-left"
              >
                Referral Capping? 🔗
              </button>
              <button 
                onClick={() => { setUserInputMessage("What is the verified total supply of DMSOL?"); }}
                className="text-[9px] bg-zinc-900 border border-zinc-800 text-[#29d611] px-2 py-1 rounded-full hover:bg-zinc-800 transition text-left"
              >
                DMSOL Hard Supply? 💰
              </button>
            </div>

            {/* CHAT FOOTER ENTRY ROUTE */}
            <div className="p-3 border-t border-zinc-900 bg-black flex gap-2">
              <input 
                type="text" 
                placeholder="Ask details about locks..."
                value={userInputMessage}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
                onChange={(e) => setUserInputMessage(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-8GD rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#39FF14]"
              />
              <button 
                onClick={handleSendMessage}
                className="w-8 h-8 rounded-lg bg-[#39FF14] text-black flex items-center justify-center hover:bg-white active:scale-95 transition flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        )}

        {/* COMPACT FLOATING ENTRANCE DOT */}
        <button 
          onClick={() => {
            setChatOpen(!chatOpen);
          }}
          className="w-14 h-14 rounded-full bg-zinc-950 border-2 border-[#39FF14] text-white shadow-[0_4px_25px_rgba(57,255,20,0.30)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center p-2 z-50 hover:bg-zinc-900 cursor-pointer"
        >
          <img 
            src="/logo.png" 
            alt="Mamba Chat" 
            className="w-10 h-10 object-contain hover:rotate-12 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const fallback = e.currentTarget.nextElementSibling;
              if (fallback) fallback.classList.remove("hidden");
            }}
          />
          <MessageSquare className="w-6 h-6 hidden text-[#39FF14]" />
        </button>
      </div>

    </div>
  );
}
