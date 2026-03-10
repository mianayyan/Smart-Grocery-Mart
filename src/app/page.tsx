import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center text-white">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-4xl font-bold mb-2">Smart Grocery Mart</h1>
        <p className="text-blue-200 mb-8">Complete grocery store management system</p>
        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full bg-white text-blue-700 font-semibold py-3 px-6 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="block w-full bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-400 transition-colors border border-blue-400"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
