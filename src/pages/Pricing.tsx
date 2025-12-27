import { useState } from 'react';
import { Check, Shield, Zap, Globe, Lock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useLicense } from '../contexts/LicenseContext';
// import { PaymentService } from '../services/payment';
// import { Input } from '../components/ui/Input';
import { useGeoLocation } from '../utils/geo';
import { USDTPaymentModal } from '../components/USDTPaymentModal';

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  recommended: boolean;
  isEnterprise?: boolean;
  originalPrice?: string;
}

const plans: Plan[] = [
  {
    id: 'price_weekly_trial',
    name: '24-Hour Pass',
    price: '$2.99',
    period: 'one-time',
    description: 'Instant 24-hour access. Device-bound, no login required.',
    features: [
      'Full Pro Features',
      'Instant Access (No Login)',
      'Device Bound (24h Only)',
      '⚠️ Risk: Lost if cache cleared',
      '⚠️ Non-Transferable'
    ],
    recommended: false,
  },
  {
    id: 'price_monthly_standard',
    name: 'Monthly',
    price: '$9.99',
    period: 'per month',
    description: 'Flexible access for regular users.',
    features: [
      'Full Pro Features',
      'Cancel Anytime',
      'Priority Support'
    ],
    recommended: false,
  },
  {
    id: 'price_quarterly',
    name: 'Quarterly',
    price: '$24.99',
    period: 'per quarter',
    description: 'Save ~15% vs Monthly.',
    features: [
      'Full Pro Features',
      'Priority Support',
      'Quarterly Billing'
    ],
    recommended: false,
  },
  {
    id: 'price_semiannual',
    name: 'Semi-Annual',
    price: '$45.99',
    period: 'per 6 months',
    description: 'Save ~23% vs Monthly.',
    features: [
      'Full Pro Features',
      'Priority Support',
      'Semi-Annual Billing'
    ],
    recommended: true,
  },
  {
    id: 'price_yearly_pro',
    name: 'Yearly',
    price: '$79.99',
    period: 'per year',
    description: 'Best value! Save ~33% vs Monthly.',
    features: [
      'Full Pro Features',
      'Priority Support',
      'Yearly Billing'
    ],
    recommended: false,
  },
  {
    id: 'price_enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: 'contact us',
    description: 'For large teams and organizations.',
    features: [
      'Custom License Terms',
      'Dedicated Support',
      'SLA Available'
    ],
    recommended: false,
    isEnterprise: true,
  },
];

export const Pricing = () => {
  const { isPro } = useLicense();
  const { isChina } = useGeoLocation();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  /*
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    setError('');

    if (!selectedPlan) return;

    try {
      const session = await PaymentService.createCheckoutSession(selectedPlan, email);
      if (session && session.url) {
        window.location.href = session.url;
      } else {
        setError('Failed to initialize payment. Please try again later.');
      }
    } catch (e) {
      setError('Network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  */
  
  const handleCardClick = (plan: Plan) => {
      if (plan.isEnterprise) {
          window.location.href = "mailto:contact@cryptokey.im?subject=Enterprise%20Inquiry";
          return;
      }
      setSelectedPlan(plan.id);
  };

  const getSelectedPlanDetails = () => {
    return plans.find(p => p.id === selectedPlan) || { id: 'unknown', name: 'Unknown Plan', price: '0' };
  };

  return (
    <div className="space-y-12 py-8 relative">
      {/* Payment Modal */}
      {selectedPlan && (
        <USDTPaymentModal 
          plan={getSelectedPlanDetails()} 
          onClose={() => setSelectedPlan(null)} 
        />
      )}

      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
          Simple, Transparent <span className="text-primary">Pricing</span>
        </h1>
        <p className="text-slate-400 text-lg">
          Choose the plan that fits your security needs. All plans unlock the full power of CryptoKey.im's military-grade encryption and steganography tools.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="relative">
        {isChina && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-8 text-center rounded-lg border border-slate-700">
            <div className="max-w-md space-y-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Lock className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">仅限硬件授权</h2>
              <p className="text-lg text-slate-400 leading-relaxed">
                请购买我们的硬件产品 CryptoKey 来使用，<br/>在线使用方式静等通知...
              </p>
              <div className="pt-4">
                <Button className="w-full" onClick={() => window.location.href = 'mailto:sales@cryptokey.im'}>
                  联系销售购买硬件
                </Button>
              </div>
            </div>
          </div>
        )}
        
        <div className={`grid md:grid-cols-3 gap-8 max-w-5xl mx-auto px-4 ${isChina ? 'filter blur-sm opacity-50 pointer-events-none select-none' : ''}`}>
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative flex flex-col p-6 md:p-8 ${plan.recommended ? 'border-primary/50 shadow-primary/10 shadow-2xl bg-surface/80' : 'bg-surface/40'}`}
            >
            {plan.recommended && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-slate-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Best Value
              </div>
            )}
            
            <div className="mb-6 space-y-2">
              <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{plan.price}</span>
                <span className="text-sm text-slate-400">{plan.period}</span>
              </div>
              {plan.originalPrice && (
                <p className="text-sm text-slate-500 line-through">was {plan.originalPrice}</p>
              )}
              <p className="text-sm text-slate-400 pt-2">{plan.description}</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-slate-300">
                  <Check size={16} className="text-primary shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button 
              variant={plan.recommended ? 'primary' : 'outline'}
              className="w-full"
              onClick={() => handleCardClick(plan)}
            >
              {plan.isEnterprise ? 'Contact Sales' : (isPro ? 'Extend License' : 'Subscribe Now')}
            </Button>
          </Card>
        ))}
      </div>
    </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto pt-12 border-t border-slate-800/50">
        <div className="space-y-3 p-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Zap size={20} />
          </div>
          <h4 className="font-bold text-white">Instant Access</h4>
          <p className="text-sm text-slate-400">
            Get your license key and TOTP setup immediately after payment. No waiting.
          </p>
        </div>
        <div className="space-y-3 p-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Globe size={20} />
          </div>
          <h4 className="font-bold text-white">Global Payments</h4>
          <p className="text-sm text-slate-400">
            {!isChina ? (
              "We support global USDT payments via BSC, TRX, and ETH networks."
            ) : (
              "Stay tuned for updates."
            )}
          </p>
        </div>
        <div className="space-y-3 p-4">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
            <Lock size={20} />
          </div>
          <h4 className="font-bold text-white">Secure & Private</h4>
          <p className="text-sm text-slate-400">
            No personal data retention. Your security is our top priority.
          </p>
        </div>
        <div className="space-y-3 p-4">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
            <Shield size={20} />
          </div>
          <h4 className="font-bold text-white">Refund Policy</h4>
          <p className="text-sm text-slate-400">
            Strict No-Refund Policy. All sales are final once the license key is issued.
          </p>
        </div>
      </div>
      
      {/* Disclaimer */}
       <div className="max-w-4xl mx-auto text-center p-6 rounded-xl bg-slate-900/30 border border-slate-800">
          <p className="text-sm text-slate-500">
            CryptoKey.im is a security tool provider. We do not provide financial advice, cryptocurrency trading, or custody services. 
            Prices are in USD. VAT may apply depending on your location.
          </p>
       </div>
    </div>
  );
};
