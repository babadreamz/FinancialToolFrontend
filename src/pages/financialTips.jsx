import { useEffect, useState } from "react";
import client from "../lib/sanityClient";

export default function FinancialTips() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        client
            .fetch(`*[_type == "post"] | order(publishedAt desc) {
                _id,
                title,
                slug,
                publishedAt,
                "category": categories[0]->title,
                body
            }`)
            .then((data) => {
                setPosts(data);
                setLoading(false);
            });
    }, []);

    if (loading) return (
        <div className="flex justify-center items-center min-h-screen">
            <p className="text-slate-500">Loading tips...</p>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="mb-10 text-center">
                <h1 className="text-3xl font-bold text-slate-900">Financial Tips</h1>
                <p className="mt-2 text-slate-500">Savings advice, loan guidance and financial education</p>
            </div>

            <div className="grid gap-6">
                {posts.map((post) => (
                    <div key={post._id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                        {post.category && (
                            <span className="text-xs font-medium text-white bg-slate-800 px-3 py-1 rounded-full">
                                {post.category}
                            </span>
                        )}
                        <h2 className="mt-3 text-xl font-semibold text-slate-900">{post.title}</h2>
                        <p className="mt-2 text-xs text-slate-400">
                            {new Date(post.publishedAt).toLocaleDateString("en-NG", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}