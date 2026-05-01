import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Landmark } from "lucide-react";
import client from "../lib/sanityClient";
import { PortableText } from "@portabletext/react";

export default function TipDetail() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        client
            .fetch(`*[_type == "post" && slug.current == $slug][0] {
                title,
                publishedAt,
                "category": categories[0]->title,
                body
            }`, { slug })
            .then((data) => {
                setPost(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [slug]);

    if (loading) return (
        <div className="flex justify-center items-center min-h-screen">
            <p className="text-slate-400">Loading...</p>
        </div>
    );

    if (!post) return (
        <div className="flex justify-center items-center min-h-screen">
            <p className="text-slate-400">Post not found.</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                        <Landmark className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-slate-900 text-lg">SAYE DIGIBOOK</span>
                </div>
                <button
                    onClick={() => navigate("/")}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition"
                >
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>
            </header>

            <div className="max-w-2xl mx-auto px-6 py-12">
                {post.category && (
                    <span className="text-xs font-medium text-white bg-slate-800 px-3 py-1 rounded-full">
                        {post.category}
                    </span>
                )}
                <h1 className="mt-4 text-3xl font-bold text-slate-900 leading-tight">
                    {post.title}
                </h1>
                <p className="mt-2 text-xs text-slate-400">
                    {new Date(post.publishedAt).toLocaleDateString("en-NG", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    })}
                </p>
                <div className="mt-8 prose prose-slate max-w-none text-slate-700 leading-relaxed">
                    <PortableText value={post.body} />
                </div>
            </div>
        </div>
    );
}