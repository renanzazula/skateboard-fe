import type { components } from '@/core/api/generated/schema';

type TermsResponse = components['schemas']['TermsResponse'];

export type TermsStatus = components['schemas']['TermsStatus'];

export type Terms = Omit<TermsResponse, 'status'> & {
  status: TermsStatus;
};

/** Normalizes a raw TermsResponse into Terms. */
export function toTerms(data: TermsResponse): Terms {
  return {
    ...data,
    title: data.title ?? '',
    body: data.body ?? '',
    status: data.status ?? 'draft',
  };
}
