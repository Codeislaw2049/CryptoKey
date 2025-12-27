import { ShieldAlert } from 'lucide-react';
import { useGeoLocation } from '../utils/geo';

export const Terms = () => {
  const { isChina } = useGeoLocation();

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-12">
      <div className="space-y-4">
        <h1 className="text-4xl font-black text-white">Terms of Service</h1>
        <p className="text-slate-400">Last Updated: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="prose prose-invert prose-slate max-w-none space-y-8">
        
        {/* Important Disclaimer - Required by User */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 md:p-8">
          <h3 className="text-xl font-bold text-primary flex items-center gap-2 mb-4">
            <ShieldAlert size={24} />
            Service Disclaimer
          </h3>
          <p className="text-base md:text-lg text-slate-200 font-medium leading-relaxed">
            We provide a crypto key security management tool (cryptokey.im) that offers offline mnemonic backup, 
            TOTP dynamic authorization, and secure key derivation services. 
            {!isChina && " We do NOT involve cryptocurrency trading, custody, or financial services — only security tools for user-owned keys."}
            {isChina && " We focus on hardware security solutions for your digital assets."}
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">1. Acceptance of Terms</h2>
          <p className="text-slate-400">
            By accessing and using CryptoKey.im ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">2. Nature of Service</h2>
          <p className="text-slate-400">
            CryptoKey.im is a client-side encryption and steganography tool. All encryption operations are performed locally in your browser using WebAssembly.
            We do not have access to your private keys, mnemonics, or passwords. You are solely responsible for safeguarding your data.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">3. User Responsibilities</h2>
          <ul className="list-disc pl-6 space-y-2 text-slate-400">
            <li>You agree not to use the Service for any illegal activities.</li>
            <li>You acknowledge that if you lose your credentials or master password, we cannot recover your data.</li>
            <li>You are responsible for maintaining the confidentiality of your account and license keys.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">4. Intellectual Property</h2>
          <p className="text-slate-400">
            The Service contains proprietary algorithms and code. The "Community Edition" is provided for audit purposes under the CC-BY-NC-ND 4.0 license.
            Commercial use of the core encryption modules requires a valid Pro license.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">5. Limitation of Liability</h2>
          <p className="text-slate-400">
            To the fullest extent permitted by law, CryptoKey.im shall not be liable for any indirect, incidental, special, consequential, or punitive damages,
            including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the Service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">6. Refund Policy & Fees</h2>
          <p className="text-slate-400">
            <strong>Strict No-Refund Policy:</strong> All sales are final. Once payment is confirmed and the license key is issued, no refunds will be provided under any circumstances.
          </p>
          {!isChina && (
            <p className="text-slate-400 mt-2">
              <strong>Transaction Fees:</strong> Users are solely responsible for all transaction fees (including but not limited to Gas fees, network fees, and exchange withdrawal fees). 
              Please ensure you transfer the exact required amount plus any necessary fees. Under-payment will result in license activation failure.
            </p>
          )}
        </section>
      </div>
    </div>
  );
};
