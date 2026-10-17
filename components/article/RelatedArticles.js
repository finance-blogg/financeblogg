import ArticleCard from "./ArticleCard";

export default function RelatedArticles({ articles }) {
  if (!articles || articles.length === 0) return null;
  return (
    <section aria-labelledby="related-heading" className="mt-16 border-t border-navy-100 pt-10">
      <h2 id="related-heading" className="font-serif text-2xl font-semibold text-navy-950">
        Related articles
      </h2>
      <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <ArticleCard key={a.slug} article={a} />
        ))}
      </div>
    </section>
  );
}
