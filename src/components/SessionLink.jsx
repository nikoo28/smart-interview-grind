// Shown at the bottom of both sidebars so it stays visible while the schedule scrolls
export default function SessionLink() {
    return (
        <a
            href="https://topmate.io/nikoo28/1398815"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-700/50 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors group"
        >
            <span className="text-lg">📞</span>
            <span className="flex-1">Schedule a 1:1 session with me</span>
            <span className="text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-transform">→</span>
        </a>
    );
}
