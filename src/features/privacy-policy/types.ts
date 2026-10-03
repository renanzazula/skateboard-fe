import type { components } from '@/core/api/generated/schema';

type PrivacyPolicyResponse = components['schemas']['PrivacyPolicyResponse'];

export type PrivacyPolicyStatus = components['schemas']['PrivacyPolicyStatus'];

export type PrivacyPolicy = Omit<PrivacyPolicyResponse, 'status'> & {
  status: PrivacyPolicyStatus;
};

/** Normalizes a raw PrivacyPolicyResponse into PrivacyPolicy. */
export function toPrivacyPolicy(data: PrivacyPolicyResponse): PrivacyPolicy {
  return {
    ...data,
    title: data.title ?? '',
    body: data.body ?? '',
    status: data.status ?? 'draft',
  };
}
