import { useEffect, useState } from "react";
import { Landmark, ArrowRight, BookOpen } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import client from "../lib/sanityClient";

export default function LandingPage() {
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        client
            .fetch(`*[_type == "post"] | order(publishedAt desc)[0...3] {
                _id,
                title,
                slug,
                publishedAt,
                "category": categories[0]->title
            }`)
            .then((data) => {
                setPosts(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-slate-50">

            {/* HERO / NAVBAR */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                        <Landmark className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-slate-900 text-lg">SAYE DIGIBOOK</span>
                </div>
                <button
                    onClick={() => navigate("/login")}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition"
                >
                    Login <ArrowRight className="h-4 w-4" />
                </button>
            </header>

            {/* HERO SECTION */}
            <section className="text-center px-6 py-20">
                <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
                    Save Smarter. <span className="text-slate-500">Grow Faster.</span>
                </h1>
                <p className="mt-4 text-slate-500 max-w-md mx-auto text-sm">
                    SAYE helps individuals and cooperatives manage savings, loans, and investments — all in one place.
                </p>
                <button
                    onClick={() => navigate("/login")}
                    className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-medium text-white hover:bg-slate-800 transition"
                >
                    Get Started <ArrowRight className="h-4 w-4" />
                </button>
            </section>

            {/* FINANCIAL TIPS SECTION */}
            <section className="max-w-4xl mx-auto px-6 pb-20">
                <div className="flex items-center gap-2 mb-8">
                    <BookOpen className="h-5 w-5 text-slate-700" />
                    <h2 className="text-2xl font-bold text-slate-900">Financial Tips</h2>
                </div>

                {loading ? (
                    <p className="text-slate-400 text-sm">Loading tips...</p>
                ) : posts.length === 0 ? (
                    <p className="text-slate-400 text-sm">No tips yet. Check back soon.</p>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {posts.map((post) => (
                            <Link
                                key={post._id}
                                to={`/tips/${post.slug.current}`}
                                className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition"
                            >
                                {post.category && (
                                    <span className="text-xs font-medium text-white bg-slate-800 px-3 py-1 rounded-full">
                                        {post.category}
                                    </span>
                                )}
                                <h3 className="mt-3 text-base font-semibold text-slate-900 leading-snug">
                                    {post.title}
                                </h3>
                                <p className="mt-2 text-xs text-slate-400">
                                    {new Date(post.publishedAt).toLocaleDateString("en-NG", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </p>
                                <div className="mt-4 flex items-center gap-1 text-xs text-slate-500 font-medium">
                                    Read more <ArrowRight className="h-3 w-3" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}