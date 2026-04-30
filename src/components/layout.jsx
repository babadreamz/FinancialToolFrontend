export default function Layout({ children }) {
    return (
        <div className="min-h-screen flex flex-col">
            <main className="flex-1">
                {children}
            </main>
            <footer className="w-full text-center py-3 text-xs text-slate-400 bg-slate-50 border-t border-slate-200">
                <div>© SAVE AS YOU EARN SAYE LTD</div>
                <div>Impact Labs Creation | 08178362475</div>
            </footer>
        </div>
    );
}