export interface PricingPlan {
  id: string;
  name: string;
  price: string;
}

export interface PaymentSession {
  sessionId: string;
  url: string;
}

const getWorkerUrl = () => {
  return window.location.hostname === 'localhost' 
    ? 'http://127.0.0.1:8787' 
    : 'https://cryptokey-auth.c-2049.workers.dev';
};

export const PaymentService = {
  async createCheckoutSession(planId: string, email: string): Promise<PaymentSession | null> {
    console.log(`[PaymentService] Creating checkout session for plan: ${planId}, email: ${email}`);
    
    try {
      const response = await fetch(`${getWorkerUrl()}/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          priceId: planId
        })
      });

      if (!response.ok) {
        console.error('Payment session creation failed:', await response.text());
        return null;
      }

      const data = await response.json();
      return data as PaymentSession;
    } catch (error) {
      console.error('Payment service error:', error);
      return null;
    }
  },

  async verifySession(sessionId: string): Promise<boolean> {
    console.log(`[PaymentService] Verifying session: ${sessionId}`);
    // This might be needed if we want to verify payment status on return
    // But usually Stripe handles this via webhook -> KV
    // Frontend just checks if KV has the license
    return true;
  }
};
