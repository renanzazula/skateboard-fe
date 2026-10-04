import type { components } from '@/core/api/generated/schema';

type LicensesResponse = components['schemas']['LicensesResponse'];

export type LicensesStatus = components['schemas']['LicensesStatus'];

export type Licenses = Omit<LicensesResponse, 'status'> & {
  status: LicensesStatus;
};

/** Normalizes a raw LicensesResponse into Licenses. */
export function toLicenses(data: LicensesResponse): Licenses {
  return {
    ...data,
    title: data.title ?? '',
    body: data.body ?? '',
    status: data.status ?? 'draft',
  };
}
