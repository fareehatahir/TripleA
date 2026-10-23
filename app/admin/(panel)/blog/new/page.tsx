import { PostForm } from "../post-form";

export const metadata = { title: "New post" };

export default function NewPost() {
  return <PostForm id={null} initial={{ title: "", slug: "", excerpt: "", content: "", coverUrl: "", tags: [], status: "DRAFT", publishedAt: "", seoTitle: "", seoDescription: "" }} />;
}
