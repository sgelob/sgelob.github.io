import { parseDump, type Row } from './mysqldump';

export type WpPost = {
  ID: number;
  post_name: string;
  post_title: string;
  post_content: string;
  post_excerpt: string;
  post_type: string;
  post_status: string;
  post_date: string;
  post_parent: number;
  guid: string;
  post_mime_type: string;
  menu_order: number;
};

export type WpTerm = {
  term_id: number;
  name: string;
  slug: string;
  taxonomy: string;
  description: string;
  count: number;
};

export type Attachment = { path: string; width: number | null; height: number | null; mime: string };

const TABLES = ['yo_posts', 'yo_postmeta', 'yo_terms', 'yo_term_taxonomy', 'yo_term_relationships', 'yo_options'];
const UPLOADS_SEGMENT = '/wp-content/uploads/';
const DIMENSIONS_RE = /s:5:"width";i:(\d+);s:6:"height";i:(\d+)/;
const ATTACHMENT_METADATA_KEY = '_wp_attachment_metadata';

/** Dumps may quote integers or leave text columns as numbers; normalise to the declared type. */
const str = (v: Row[string] | undefined): string => (v === null || v === undefined ? '' : String(v));
const num = (v: Row[string] | undefined): number => Number(v);

function toPost(r: Row): WpPost {
  return {
    ID: num(r.ID),
    post_name: str(r.post_name),
    post_title: str(r.post_title),
    post_content: str(r.post_content),
    post_excerpt: str(r.post_excerpt),
    post_type: str(r.post_type),
    post_status: str(r.post_status),
    post_date: str(r.post_date),
    post_parent: num(r.post_parent),
    guid: str(r.guid),
    post_mime_type: str(r.post_mime_type),
    menu_order: num(r.menu_order),
  };
}

/** Read-only, indexed view over the WordPress tables of a mysqldump. */
export class WpDb {
  private constructor(
    private readonly allPosts: WpPost[],
    private readonly postsById: Map<number, WpPost>,
    private readonly metaByKey: Map<string, Map<number, string>>,
    private readonly termsByPost: Map<number, WpTerm[]>,
    private readonly termsByTaxonomy: Map<string, WpTerm[]>,
    private readonly options: Map<string, string>,
  ) {}

  static async fromDump(path: string): Promise<WpDb> {
    const t = await parseDump(path, TABLES);
    const rows = (name: string): Row[] => t.get(name) ?? [];

    const allPosts = rows('yo_posts').map(toPost);
    const postsById = new Map(allPosts.map((p) => [p.ID, p]));

    // WordPress returns the first row when a key repeats, so keep the first one.
    const metaByKey = new Map<string, Map<number, string>>();
    for (const r of rows('yo_postmeta')) {
      if (r.meta_value === null || r.meta_value === undefined) continue;
      const key = str(r.meta_key);
      let byPost = metaByKey.get(key);
      if (!byPost) metaByKey.set(key, (byPost = new Map()));
      const postId = num(r.post_id);
      if (!byPost.has(postId)) byPost.set(postId, str(r.meta_value));
    }

    const termById = new Map(rows('yo_terms').map((r) => [num(r.term_id), r]));
    const taxonomyRows = rows('yo_term_taxonomy')
      .map((r) => ({ id: num(r.term_taxonomy_id), r }))
      .sort((a, b) => a.id - b.id);
    const termByTaxonomyId = new Map<number, WpTerm>();
    const termsByTaxonomy = new Map<string, WpTerm[]>();
    for (const { id, r } of taxonomyRows) {
      const base = termById.get(num(r.term_id));
      if (!base) continue;
      const term: WpTerm = {
        term_id: num(r.term_id),
        name: str(base.name),
        slug: str(base.slug),
        taxonomy: str(r.taxonomy),
        description: str(r.description),
        count: num(r.count),
      };
      termByTaxonomyId.set(id, term);
      let list = termsByTaxonomy.get(term.taxonomy);
      if (!list) termsByTaxonomy.set(term.taxonomy, (list = []));
      list.push(term);
    }
    for (const list of termsByTaxonomy.values()) list.sort((a, b) => a.name.localeCompare(b.name));

    const termsByPost = new Map<number, WpTerm[]>();
    const relationships = rows('yo_term_relationships')
      .map((r) => ({ object: num(r.object_id), taxonomyId: num(r.term_taxonomy_id) }))
      .sort((a, b) => a.taxonomyId - b.taxonomyId);
    for (const { object, taxonomyId } of relationships) {
      const term = termByTaxonomyId.get(taxonomyId);
      if (!term) continue;
      let list = termsByPost.get(object);
      if (!list) termsByPost.set(object, (list = []));
      list.push(term);
    }

    const options = new Map<string, string>();
    for (const r of rows('yo_options')) options.set(str(r.option_name), str(r.option_value));

    return new WpDb(allPosts, postsById, metaByKey, termsByPost, termsByTaxonomy, options);
  }

  /** Posts of a type, newest first. Omitting `status` matches every status. */
  posts(filter: { type: string; status?: string | string[] }): WpPost[] {
    const statuses = filter.status === undefined ? null : new Set([filter.status].flat());
    return this.allPosts
      .filter((p) => p.post_type === filter.type && (!statuses || statuses.has(p.post_status)))
      .sort((a, b) => (a.post_date < b.post_date ? 1 : a.post_date > b.post_date ? -1 : b.ID - a.ID));
  }

  post(id: number): WpPost | undefined {
    return this.postsById.get(id);
  }

  meta(postId: number, key: string): string | undefined {
    return this.metaByKey.get(key)?.get(postId);
  }

  metaAll(key: string): Map<number, string> {
    return new Map(this.metaByKey.get(key));
  }

  /** Terms attached to a post, in term_taxonomy_id order. */
  terms(postId: number, taxonomy: string): WpTerm[] {
    return (this.termsByPost.get(postId) ?? []).filter((t) => t.taxonomy === taxonomy);
  }

  /** Every term of a taxonomy, sorted by name. */
  allTerms(taxonomy: string): WpTerm[] {
    return [...(this.termsByTaxonomy.get(taxonomy) ?? [])];
  }

  option(name: string): string | undefined {
    return this.options.get(name);
  }

  /** Attachments keyed by upload path relative to wp-content/uploads/ (taken from the guid). */
  attachments(): Map<string, Attachment> {
    const out = new Map<string, Attachment>();
    for (const p of this.allPosts) {
      if (p.post_type !== 'attachment') continue;
      const at = p.guid.indexOf(UPLOADS_SEGMENT);
      if (at < 0) continue;
      const path = p.guid.slice(at + UPLOADS_SEGMENT.length);
      const dims = DIMENSIONS_RE.exec(this.meta(p.ID, ATTACHMENT_METADATA_KEY) ?? '');
      out.set(path, {
        path,
        width: dims ? Number(dims[1]) : null,
        height: dims ? Number(dims[2]) : null,
        mime: p.post_mime_type,
      });
    }
    return out;
  }
}
