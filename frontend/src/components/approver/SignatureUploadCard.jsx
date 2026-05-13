import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, PenLine, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import useAuthStore from '../../store/authStore';

const MAX_SIGNATURE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_SIGNATURE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export default function SignatureUploadCard({ className = '' }) {
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const fileInputRef = useRef(null);
  const [signature, setSignature] = useState({ has_signature: false, signature_url: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSignature = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/permits/approvals/signature/');
      setSignature(data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load signature.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSignature();
  }, []);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ACCEPTED_SIGNATURE_TYPES.includes(file.type)) {
      toast.error('Upload a PNG, JPG, or WEBP signature image.');
      return;
    }

    if (file.size > MAX_SIGNATURE_SIZE) {
      toast.error('Signature image must be 2 MB or smaller.');
      return;
    }

    const formData = new FormData();
    formData.append('signature_image', file);

    setSaving(true);
    try {
      const { data } = await client.post('/permits/approvals/signature/', formData);
      setSignature(data);
      await refreshProfile();
      toast.success('Signature uploaded.');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload signature.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Remove your saved signature image?')) return;

    setSaving(true);
    try {
      const { data } = await client.delete('/permits/approvals/signature/');
      setSignature(data);
      await refreshProfile();
      toast.success('Signature removed.');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to remove signature.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-vms-50 text-vms-700">
            <PenLine size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Approver Signature</h2>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  signature.has_signature
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {signature.has_signature ? 'Ready' : 'Required'}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Required before approving permits.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50 sm:w-44">
            {loading ? (
              <span className="text-xs font-semibold text-slate-400">Loading...</span>
            ) : signature.signature_url ? (
              <img
                src={signature.signature_url}
                alt="Signature preview"
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <ImageIcon size={26} className="text-slate-300" />
            )}
          </div>

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || saving}
              className="btn-primary btn-sm"
            >
              <Upload size={14} />
              {signature.has_signature ? 'Replace' : 'Upload'}
            </button>
            {signature.has_signature && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={loading || saving}
                className="btn-secondary btn-sm"
                title="Remove signature"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
