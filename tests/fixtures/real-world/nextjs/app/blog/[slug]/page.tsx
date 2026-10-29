export async function generateMetadata({ params }: { params: { slug: string } }) {
  return {
    title: "Blog Post: " + params.slug,
    description: "Detailed enterprise analysis for " + params.slug
  };
}
export default function BlogPost({ params }: { params: { slug: string } }) {
  return (
    <article>
      <h1>Analysis: {params.slug}</h1>
    </article>
  );
}