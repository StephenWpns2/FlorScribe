import api from './api';

export interface SubscriptionPlan {
  id: number;
  planType: 'LITE' | 'PRO' | 'ENTERPRISE';
  name: string;
  price: number;
  audioHoursLimit: number | null;
  notesLimit: number | null;
  features: {
    multiUser?: boolean;
    ehrIntegration?: boolean;
    [key: string]: any;
  } | null;
}

export interface UserSubscription {
  id: number;
  userId: number;
  planId: number;
  plan: SubscriptionPlan;
  status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'TRIALING';
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export interface UsageData {
  subscription: UserSubscription | null;
  usage: {
    id: number;
    userId: number;
    periodStart: string;
    periodEnd: string;
    audioHoursUsed: number;
    notesCreated: number;
  } | null;
  audioHoursUsed: number;
  audioHoursLimit: number | null;
  notesCreated: number;
  notesLimit: number | null;
}

const subscriptionsService = {
  async getPlans(): Promise<SubscriptionPlan[]> {
    const response = await api.get('/api/subscriptions/plans');
    return response.data;
  },

  async getCurrentSubscription(): Promise<UserSubscription | null> {
    try {
      const response = await api.get('/api/subscriptions/current');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async getUsage(): Promise<UsageData> {
    const response = await api.get('/api/subscriptions/usage');
    return response.data;
  },

  async createCheckoutSession(planType: 'LITE' | 'PRO' | 'ENTERPRISE'): Promise<{ sessionId: string; url: string }> {
    const response = await api.post('/api/subscriptions/create-checkout', { planType });
    return response.data;
  },

  async cancelSubscription(): Promise<void> {
    await api.post('/api/subscriptions/cancel');
  },
};

export default subscriptionsService;

