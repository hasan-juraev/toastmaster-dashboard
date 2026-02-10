import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../app/AuthProvider";

export default function Dashboard() {
  const { user } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-500 text-sm">
            Logged in as: <span className="font-medium">{user?.email}</span>
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/members"
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <h2 className="text-xl font-semibold text-gray-900">Members</h2>
          <p className="mt-2 text-gray-600">Manage club members</p>
        </Link>

        <Link
          to="/meetings"
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <h2 className="text-xl font-semibold text-gray-900">Meetings</h2>
          <p className="mt-2 text-gray-600">Manage club meetings</p>
        </Link>

        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 opacity-50">
          <h2 className="text-xl font-semibold text-gray-900">Reports</h2>
          <p className="mt-2 text-gray-600">Coming soon</p>
        </div>
      </div>
    </div>
  );
}
