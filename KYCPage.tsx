import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import FileUpload from '@/components/ui/FileUpload';
import toast from 'react-hot-toast';

export default function KYCPage() {
  const { user, updateKycStatus, submitKycDocuments, kycDocuments, setCurrentPage } = useStore();
  const [loading, setLoading] = useState(false);
  const [idCard, setIdCard] = useState<string | null>(kycDocuments[user?.id || '']?.idCard || null);
  const [selfie, setSelfie] = useState<string | null>(kycDocuments[user?.id || '']?.selfie || null);

  const handleSubmit = async () => {
    if (!user) return;
    
    if (!idCard) {
      toast.error('Please upload your ID document');
      return;
    }
    if (!selfie) {
      toast.error('Please upload a selfie');
      return;
    }
    
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    
    submitKycDocuments(user.id, {
      idCard,
      selfie,
      submittedAt: new Date().toISOString(),
    });
    
    updateKycStatus(user.id, 'pending');
    setLoading(false);
    toast.success('KYC documents submitted for review');
  };

  const steps = [
    { title: 'Upload ID', desc: 'National ID or Passport', icon: '🪪', done: !!idCard || user?.kycStatus !== 'none' },
    { title: 'Upload Selfie', desc: 'Clear face photo', icon: '🤳', done: !!selfie || user?.kycStatus !== 'none' },
    { title: 'Under Review', desc: 'Admin verification', icon: '🔍', done: user?.kycStatus === 'approved' },
    { title: 'Verified', desc: 'Full access granted', icon: '✅', done: user?.kycStatus === 'approved' },
  ];

  const existingDocs = kycDocuments[user?.id || ''];

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setCurrentPage('profile')} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-sm">←</button>
        <h2 className="text-lg font-bold font-display">✅ KYC Verification</h2>
      </div>

      {/* Status */}
      <GlassCard glow animate={false} className="text-center">
        <p className="text-sm text-white/40">Current Status</p>
        <div className="mt-2">
          <StatusBadge status={user?.kycStatus || 'none'} className="text-base px-4 py-2" />
        </div>
        {user?.kycStatus === 'approved' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3"
          >
            <p className="text-green-400 text-sm">✅ Your account is fully verified!</p>
            <p className="text-white/30 text-xs mt-1">Enjoy unlimited transactions</p>
          </motion.div>
        )}
        {user?.kycStatus === 'pending' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3"
          >
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-yellow-400 text-sm">Documents under review...</p>
            </div>
            <p className="text-white/30 text-xs mt-1">Usually takes 24-48 hours</p>
          </motion.div>
        )}
        {user?.kycStatus === 'rejected' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3"
          >
            <p className="text-red-400 text-sm">❌ Verification failed</p>
            <p className="text-white/30 text-xs mt-1">Please resubmit with clear documents</p>
          </motion.div>
        )}
      </GlassCard>

      {/* Progress Steps */}
      <div className="space-y-2">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <GlassCard animate={false} className={`flex items-center gap-3 py-3 ${step.done ? 'border-green-500/20' : ''}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${step.done ? 'bg-green-500/10' : 'bg-white/[0.03]'}`}>
                {step.done ? '✅' : step.icon}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${step.done ? 'text-green-400' : ''}`}>{step.title}</p>
                <p className="text-[10px] text-white/30">{step.desc}</p>
              </div>
              <span className={`text-sm ${step.done ? 'text-green-400' : 'text-white/20'}`}>
                {step.done ? '✓' : '○'}
              </span>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Upload Section - Show if not approved */}
      {(user?.kycStatus === 'none' || user?.kycStatus === 'rejected') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <h3 className="text-sm font-semibold text-white/50">Upload Documents</h3>

          <FileUpload
            label="Upload National ID / Passport"
            icon="🪪"
            description="JPG, PNG • Max 5MB • Both sides visible"
            value={idCard}
            onFileSelect={(_, preview) => setIdCard(preview)}
          />

          <FileUpload
            label="Upload Selfie Photo"
            icon="🤳"
            description="Clear face photo holding your ID"
            value={selfie}
            onFileSelect={(_, preview) => setSelfie(preview)}
          />

          <div className="p-3 rounded-2xl bg-blue-500/[0.05] border border-blue-500/10">
            <h4 className="text-sm font-semibold text-blue-400 mb-2">📋 Requirements</h4>
            <ul className="space-y-1 text-xs text-white/50">
              <li>• Document must be valid and not expired</li>
              <li>• All text must be clearly readable</li>
              <li>• Selfie must show your face clearly with ID visible</li>
              <li>• No filters or heavy editing</li>
            </ul>
          </div>

          <Button 
            fullWidth 
            size="lg" 
            onClick={handleSubmit} 
            loading={loading}
            disabled={!idCard || !selfie}
          >
            Submit for Verification
          </Button>
        </motion.div>
      )}

      {/* Show submitted documents if pending */}
      {user?.kycStatus === 'pending' && existingDocs && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <h3 className="text-sm font-semibold text-white/50">Submitted Documents</h3>
          
          {existingDocs.idCard && (
            <div className="relative rounded-2xl overflow-hidden border border-yellow-500/20">
              <img src={existingDocs.idCard} alt="ID Card" className="w-full h-32 object-cover opacity-50" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="text-yellow-400 text-sm font-medium">🔍 Under Review</span>
              </div>
            </div>
          )}
          
          {existingDocs.selfie && (
            <div className="relative rounded-2xl overflow-hidden border border-yellow-500/20">
              <img src={existingDocs.selfie} alt="Selfie" className="w-full h-32 object-cover opacity-50" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="text-yellow-400 text-sm font-medium">🔍 Under Review</span>
              </div>
            </div>
          )}
          
          <p className="text-center text-white/30 text-xs">
            Submitted on {existingDocs.submittedAt ? new Date(existingDocs.submittedAt).toLocaleDateString() : 'N/A'}
          </p>
        </motion.div>
      )}
    </div>
  );
}
