// schemas/post.ts
export default {
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    {
      name: 'approved',
      title: 'Reviewed / Edited',
      type: 'boolean',
      description: 'Whether a human has reviewed this article. Auto-published articles start as false ("Not Edited" in the admin Content Library) until reviewed.',
      initialValue: true,
    },
    {
      name: 'finalized',
      title: 'Published (Archived)',
      type: 'boolean',
      description: 'Marks a fully-reviewed article as done/archived — moves it out of the day-to-day Edited/Not-Edited working tabs in the admin Content Library into the separate Published tab. Does NOT affect public visibility (that is controlled by "approved" only).',
      initialValue: false,
    },
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'CRITICAL: Must match WordPress export slugs to preserve SEO and prevent 404s',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: { type: 'author' },
    },
    {
      name: 'mainImage',
      title: 'Main image',
      type: 'image',
      options: {
        hotspot: true,
      },
    },
    {
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [{ type: 'reference', to: { type: 'category' } }],
    },
    {
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
    },
    {
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 4,
    },
    {
      name: 'body',
      title: 'Body',
      type: 'blockContent',
    },
  ],
  preview: {
    select: {
      title: 'title',
      author: 'author.name',
      media: 'mainImage',
    },
    prepare(selection: any) {
      const { author } = selection;
      return Object.assign({}, selection, {
        subtitle: author && `by ${author}`,
      });
    },
  },
};
