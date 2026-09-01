import type { components } from '@/core/api/generated/schema';
import type { ContentBlock } from '@/shared/types/content-blocks';

// The BFF types AboutPageResponse.blocks as an opaque object array (see
// api/bff-openapi.yaml); shared/types/content-blocks.ts's ContentBlock is the
// concrete shape it holds. Everything else comes straight from the generated
// schema.
type AboutPageResponse = components['schemas']['AboutPageResponse'];

export type AboutPageStatus = components['schemas']['AboutPageStatus'];

export type AboutPage = Omit<AboutPageResponse, 'blocks' | 'status'> & {
  status: AboutPageStatus;
  blocks: ContentBlock[];
};

export type { ContentBlock };

/** Normalizes a raw AboutPageResponse — `blocks` may be absent — into AboutPage. */
export function toAboutPage(data: AboutPageResponse): AboutPage {
  return {
    ...data,
    title: data.title ?? '',
    status: data.status ?? 'draft',
    blocks: (data.blocks ?? []) as unknown as ContentBlock[],
  };
}
